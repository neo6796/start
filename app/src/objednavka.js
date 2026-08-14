/* Objednávka pre jedáleň — počty, znenie správy a odoslanie.

   Toto je prvá vec, ktorá z appky ide von k cudziemu človeku. Preto tu platia
   tri pravidlá prísnejšie než inde:

   1. ODOSIELA SA TO, ČO JE VIDNO. Znenie správy sa poskladá raz a to isté sa
      uloží aj vypíše na obrazovku. Keby sa text skladal zvlášť pri odoslaní
      a zvlášť pri zobrazení, jedného dňa by kuchyňa dostala niečo iné, než
      by sme ukazovali sebe — a nikto by o tom nevedel.

   2. NEÚSPECH SA ZAPISUJE ROVNAKO AKO ÚSPECH. Riadok v `odoslanie` vznikne
      vždy; keď sa nepodarilo odoslať, je v ňom dôvod. Ticho po neúspechu je
      to najhoršie, čo môže byť: uzávierka by vyzerala hotová a v kuchyni by
      o objednávke nevedeli.

   3. PRI ZLYHANÍ PRIHLÁSENIA SA NEOPAKUJE. To je pravidlo z posta.js a platí
      aj tu: druhý pokus so zlým heslom nič nezachráni a IP servera zablokuje.

   Potvrdenie prijatia je zámerne oddelené od odoslania (koncept 7.2.1).
   „Server dodávateľa správu prijal" a „kuchár ju videl" sú dve rôzne veci
   a zliať ich do jedného „doručené" by bolo klamlivé. */

import { jeden, vsetky, bazen, zapis } from "./db.js";
import { DNI, dnes, dniTyzdna, denMesiac, tyzdenPopis, oznacenie, dlhy } from "./datum.js";
import { holaStranka, esc, mnoho } from "./html.js";
import { menuTyzdna } from "./menu.js";
import { posli, postaJeNastavena } from "./posta.js";
import { zosit } from "./zosit.js";
import { randomBytes } from "node:crypto";

const ADRESA = process.env.ADRESA ?? "https://obedy.ahafarma.sk";
const ODBERATEL = "Poľnohospodárske družstvo vo Vrábľoch";
/* Kópia adminovi, aby o objednávke vedel aj človek, nielen databáza
   (koncept 7.2.1). Keď je to tá istá adresa ako do jedálne — počas ladenia
   chodí objednávka správcovi — kópia sa neposiela, bola by to tá istá správa
   dvakrát. */
const KOPIA = (process.env.KOPIA ?? "").trim();

/* ---------- počty ---------- */

/* Čo sa za týždeň naobjednávalo, po jedálňach. Vracia aj to, čo do
   objednávky nejde, ale bez čoho sa nedá rozhodnúť, či ju poslať:
   ľudí, ktorí sa ešte nevyjadrili. */
export async function poctyZaTyzden(po) {
  const dni = dniTyzdna(po);
  const jedalne = await vsetky("SELECT * FROM poskytovatel WHERE aktivny ORDER BY nazov");

  /* Spätný zápis sa do počtov nerátа (koncept 4.5a). Ten obed sa už uvaril
     a zjedol; keby sa sem pripočítal, uzávierka by ohlásila rozdiel oproti
     odoslanej objednávke a pýtala by si opravu — teda by jedálni poslala
     objednávku na deň, ktorý dávno bol. Do mzdového podkladu ide, do
     objednávky nie; koľko ich je, sa vypíše zvlášť. */
  const riadky = await vsetky(`
    SELECT poskytovatel_id, datum::text AS datum, jedlo, count(*)::int AS kolko
      FROM objednavka
     WHERE datum BETWEEN $1 AND $2 AND jedlo >= 0 AND NOT spatny_zapis
     GROUP BY 1, 2, 3`, [dni[0], dni[4]]);

  const spatne = await vsetky(`
    SELECT poskytovatel_id, count(*)::int AS kolko
      FROM objednavka
     WHERE datum BETWEEN $1 AND $2 AND jedlo >= 0 AND spatny_zapis
     GROUP BY 1`, [dni[0], dni[4]]);

  /* Nerozhodnutí: kto má jedáleň pridelenú, je v ten deň v práci a nemá ani
     objednané, ani odhlásené. Práve o nich sa pri uzávierke rozhoduje —
     komu sa neobjedná, ten v ten deň obed nedostane. */
  const nerozhodnuti = await vsetky(`
    SELECT j.poskytovatel_id, o.id, o.priezvisko, o.meno, t.nazov AS tim,
           count(*)::int AS dni
      FROM osoba o
      JOIN (SELECT osoba_id, poskytovatel_id FROM osoba_jedalen
            UNION
            SELECT id, poskytovatel_id FROM osoba WHERE poskytovatel_id IS NOT NULL) j
        ON j.osoba_id = o.id
      LEFT JOIN tim t ON t.id = o.tim_id
      CROSS JOIN generate_series($1::date, $2::date, '1 day') AS d(datum)
      LEFT JOIN objednavka ob ON ob.osoba_id = o.id AND ob.datum = d.datum
      LEFT JOIN nepritomnost n ON n.osoba_id = o.id AND d.datum BETWEEN n.od AND n.do_
     WHERE o.aktivny AND ob.id IS NULL AND n.id IS NULL
     GROUP BY 1, 2, 3, 4, 5
     ORDER BY o.priezvisko, o.meno`, [dni[0], dni[4]]);

  const von = [];
  for (const j of jedalne) {
    const menu = await menuTyzdna(j.id, po);
    const moje = riadky.filter(r => r.poskytovatel_id === j.id);
    const jedla = [];
    for (let poradie = 0; poradie < j.pocet_jedal; poradie++) {
      const poDnoch = dni.map(d =>
        moje.find(r => r.datum === d && r.jedlo === poradie)?.kolko ?? 0);
      if (!poDnoch.some(x => x)) continue;          // jedlo, ktoré si nikto nedal
      jedla.push({ poradie, znak: oznacenie(j.znacenie, poradie),
                   poDnoch, spolu: poDnoch.reduce((a, b) => a + b, 0) });
    }
    von.push({
      jedalen: j, dni,
      nazov: (den, poradie) => menu?.nazov(den, poradie) ?? null,
      jedla,
      poDnoch: dni.map((_, i) => jedla.reduce((a, x) => a + x.poDnoch[i], 0)),
      spolu: jedla.reduce((a, x) => a + x.spolu, 0),
      spatne: spatne.find(s => s.poskytovatel_id === j.id)?.kolko ?? 0,
      nerozhodnuti: nerozhodnuti.filter(n => n.poskytovatel_id === j.id)
    });
  }
  return von;
}

/* ---------- znenie správy ---------- */

/* Kuchyňa číta objednávku na telefóne. Preto sú počty v tele správy ako
   čistý text a nie iba v prílohe (koncept 7.2) — otvárať prílohu je
   prekážka práve tam, kde na tom najviac záleží. */
export function textObjednavky(p, odkaz, oprava = null) {
  const r = [];
  r.push(`${oprava ? "OPRAVA objednávky" : "Objednávka"} obedov na týždeň ${tyzdenPopis(p.dni[0])}`);
  r.push("");
  /* Meno jedálne patrí hore. Kuchyňa si tým overí, že správa je naozaj pre
     ňu, a správca — ktorému chodia objednávky pre obe jedálne do tej istej
     schránky — inak nemá ako rozoznať, ktorá je ktorá. */
  r.push(`Jedáleň:    ${p.jedalen.nazov}`);
  r.push(`Odberateľ:  ${ODBERATEL}`);
  r.push("");

  /* Oprava musí najprv povedať, čo sa mení. Poslať druhýkrát celý zoznam bez
     slova o rozdiele znamená, že kuchyňa dostane dve podobné správy a musí ich
     porovnávať sama — a pri tom sa robia chyby, ktoré stoja obed. */
  if (oprava) {
    r.push(`Toto nahrádza objednávku poslanú ${oprava.kedy}.`);
    r.push("");
    if (oprava.zmeny.length) {
      r.push("Čo sa mení:");
      for (const z of oprava.zmeny) r.push("  " + z);
    } else {
      r.push("Počty sa oproti nej nezmenili.");
    }
    r.push("");
    r.push("Platí celý zoznam nižšie, nie len zmeny.");
    r.push("");
  }

  /* V OPRAVE sa dni, ktoré už prebehli, nevypisujú. V oprave poslanej vo
     štvrtok je „Pondelok — bez objednávky" iba šum: uvariť sa to už nedá
     a kuchár musí preskakovať štyri riadky, kým nájde ten, ktorého sa to týka.
     V prvej objednávke ostávajú všetky dni — tá je dokladom na celý týždeň
     a zamlčať v nej pondelok by znamenalo, že sa oň kuchyňa nedozvie vôbec. */
  const dnesJe = oprava ? dnes() : "0000-00-00";
  const zostava = p.dni.filter(d => d >= dnesJe);
  const vynechane = p.dni.length - zostava.length;

  if (!zostava.length) {
    r.push("Všetky dni tohto týždňa už prebehli.");
    r.push("");
  }
  if (vynechane && zostava.length) {
    r.push(`Dni, ktoré už prebehli (${p.dni.slice(0, vynechane).map((_, i) => DNI[i]).join(", ")}),` +
           " tu nie sú — tie sa už nemenia.");
    r.push("");
  }

  for (const [i, d] of p.dni.entries()) {
    if (d < dnesJe) continue;
    const vDen = p.jedla.filter(j => j.poDnoch[i] > 0);
    if (!vDen.length) { r.push(`${DNI[i]} ${denMesiac(d)} — bez objednávky`, ""); continue; }
    r.push(`${DNI[i]} ${denMesiac(d)}`);
    for (const j of vDen) {
      const nazov = p.nazov(i, j.poradie);
      r.push(`  ${j.znak}  ${String(j.poDnoch[i]).padStart(3)} ks` + (nazov ? `   ${nazov}` : ""));
    }
    r.push(`  ${" ".repeat(p.jedla[0].znak.length)}  ${String(p.poDnoch[i]).padStart(3)} ks   spolu`);
    r.push("");
  }

  const spoluZostatok = p.dni.reduce((a, d, i) => a + (d >= dnesJe ? p.poDnoch[i] : 0), 0);
  r.push(vynechane
    ? `Spolu za zostávajúce dni: ${mnoho(spoluZostatok, ["obed", "obedy", "obedov"])}.`
    : `Spolu za týždeň: ${mnoho(p.spolu, ["obed", "obedy", "obedov"])}.`);
  r.push("");
  if (odkaz) {
    r.push("Prosíme o potvrdenie prijatia — otvorte odkaz a stlačte tlačidlo:");
    r.push(odkaz);
    r.push("");
  }
  r.push("Odosiela Obedár, objednávkový systém PD Vráble.");
  r.push("Na túto správu sa dá odpovedať — odpoveď príde správcovi.");
  return r.join("\n");
}

function prilohaZosit(p) {
  const hlavicka = ["Jedlo", ...p.dni.map((d, i) => `${DNI[i]} ${denMesiac(d)}`), "Spolu"];
  const riadky = [hlavicka];
  for (const j of p.jedla) {
    /* Názov jedla je každý deň iný, do jedného riadka sa nezmestí — v zošite
       je preto označenie a názvy sú v tele správy pri jednotlivých dňoch. */
    riadky.push([j.znak, ...j.poDnoch, j.spolu]);
  }
  riadky.push(["Spolu", ...p.poDnoch, p.spolu]);
  return riadky;
}

/* ---------- odoslanie ---------- */

const casOdoslania = h => new Date(h).toLocaleString("sk-SK",
  { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

/* Čo sa zmenilo oproti minule. Porovnávajú sa uložené počty, nie dnešné
   údaje — presne tie čísla, ktoré kuchyňa naozaj dostala. */
function zmeny(stare, nove, dni) {
  const von = [];
  const znaky = [...new Set([...Object.keys(stare ?? {}), ...Object.keys(nove)])].sort();
  for (const [i, d] of dni.entries()) {
    for (const znak of znaky) {
      const a = (stare?.[znak] ?? [])[i] ?? 0;
      const b = (nove[znak] ?? [])[i] ?? 0;
      if (a === b) continue;
      const rozdiel = b - a;
      von.push(`${DNI[i]} ${denMesiac(d)}   ${znak}   ` +
               `${rozdiel > 0 ? "+" : "−"}${Math.abs(rozdiel)} ks   (${a} → ${b})`);
    }
  }
  return von;
}

/* Jedna jedáleň. Riadok v `odoslanie` vznikne aj keď sa odoslať nepodarí. */
async function posliJednej(p, po, ktoId) {
  const komu = (p.jedalen.email ?? "").trim();
  const kopia = KOPIA && KOPIA !== komu ? KOPIA : null;
  const token = randomBytes(24).toString("base64url");
  const odkaz = `${ADRESA}/potvrdenie?t=${token}`;
  const poctov = Object.fromEntries(p.jedla.map(j => [j.znak, j.poDnoch]));

  /* Druhé odoslanie na ten istý týždeň nie je nová objednávka, ale oprava.
     Bez toho by kuchyňa dostala dve podobné správy a nevedela, ktorá platí. */
  const predtym = await jeden(`
    SELECT poctov, odoslane FROM odoslanie
     WHERE poskytovatel_id = $1 AND datum = $2 AND druh = 'objednavka' AND stav = 'ok'
     ORDER BY id DESC LIMIT 1`, [p.jedalen.id, po]);
  const oprava = predtym
    ? { kedy: casOdoslania(predtym.odoslane), zmeny: zmeny(predtym.poctov, poctov, p.dni) }
    : null;

  const predmet = `${oprava ? "OPRAVA objednávky" : "Objednávka"} obedov ` +
                  `${tyzdenPopis(po)} — PD Vráble pre ${p.jedalen.nazov}`;
  const telo = textObjednavky(p, odkaz, oprava);

  const zapisSa = async (stav, chyba) => jeden(`
    INSERT INTO odoslanie (poskytovatel_id, datum, druh, poctov, porcii,
                           odoslane, stav, chyba, token, komu, kopia, predmet, telo, zadal_id)
    VALUES ($1,$2,'objednavka',$3,$4, now(), $5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [p.jedalen.id, po, JSON.stringify(poctov), p.spolu, stav, chyba ?? null,
     token, komu || null, kopia, predmet, telo, ktoId]);

  const neslo = async dovod => {
    await zapisSa("zlyhalo", dovod);
    return { ok: false, jedalen: p.jedalen.nazov, chyba: dovod };
  };
  if (!komu) return neslo("jedáleň nemá e-mailovú adresu");
  if (!postaJeNastavena()) return neslo("odosielanie pošty nie je nastavené");

  try {
    await posli({
      komu, kopia, predmet, text: telo,
      prilohy: [{
        nazov: `objednavka-${po}.xlsx`,
        typ: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        data: zosit(`Objednávka ${po}`, prilohaZosit(p))
      }]
    });
    await zapisSa("ok", null);
    return { ok: true, jedalen: p.jedalen.nazov, komu, porcii: p.spolu };
  } catch (e) {
    /* Pri zlom prihlásení sa ďalšie jedálne ani neskúšajú — to rieši volajúci
       podľa tohto príznaku. */
    await zapisSa("zlyhalo", e.message);
    return { ok: false, jedalen: p.jedalen.nazov, chyba: e.message, prihlasenie: e.prihlasenie === true };
  }
}

/* Čo sa v matici zmenilo odvtedy, čo objednávka odišla.

   Je to rozdiel medzi uloženými počtami posledného odoslania a tým, čo je
   v matici teraz. Žiadny príznak sa nikde nedrží, takže sa nemá čo rozísť
   so skutočnosťou: keď sa zmena vráti späť, rozdiel zmizne sám. */
export async function cakaNaOpravu(poskytovatelia, po) {
  const von = new Map();
  for (const p of poskytovatelia) {
    const predtym = await jeden(`
      SELECT poctov, odoslane FROM odoslanie
       WHERE poskytovatel_id = $1 AND datum = $2 AND druh = 'objednavka' AND stav = 'ok'
       ORDER BY id DESC LIMIT 1`, [p.jedalen.id, po]);
    if (!predtym) continue;
    const teraz = Object.fromEntries(p.jedla.map(j => [j.znak, j.poDnoch]));
    const z = zmeny(predtym.poctov, teraz, p.dni);
    if (z.length) von.set(p.jedalen.id, { zmeny: z, kedy: casOdoslania(predtym.odoslane) });
  }
  return von;
}

/* Pošle objednávky za celý týždeň, alebo opravu jednej jedálni. Jedálne bez
   objednaných porcií sa preskočia — prázdna objednávka kuchyňu len mätie. */
export async function posliObjednavky(po, ktoId, ibaJedalen = null) {
  const vysledky = [];
  for (const p of await poctyZaTyzden(po)) {
    if (ibaJedalen && p.jedalen.id !== ibaJedalen) continue;
    if (!p.spolu) continue;
    const v = await posliJednej(p, po, ktoId);
    vysledky.push(v);
    if (v.prihlasenie) {
      vysledky.push({ ok: false, jedalen: "— ostatné jedálne —",
                      chyba: "neskúšalo sa, aby sa server nezablokoval" });
      break;
    }
  }
  return vysledky;
}

/* Čo sa za týždeň odoslalo — pre obrazovku uzávierky. */
export async function odoslania(po) {
  return vsetky(`
    SELECT o.*, p.nazov AS jedalen, os.priezvisko, os.meno,
           EXISTS (SELECT 1 FROM odoslanie n
                    WHERE n.poskytovatel_id = o.poskytovatel_id AND n.datum = o.datum
                      AND n.druh = o.druh AND n.stav = 'ok' AND n.id > o.id) AS nahradene
      FROM odoslanie o
      JOIN poskytovatel p ON p.id = o.poskytovatel_id
      LEFT JOIN osoba os ON os.id = o.zadal_id
     WHERE o.datum = $1 AND o.druh = 'objednavka'
     ORDER BY o.id DESC`, [po]);
}

/* ---------- potvrdenie prijatia ---------- */

/* Odkaz z e-mailu. Otvorí stránku s počtami a s tlačidlom — potvrdenie
   zapíše až stlačenie tlačidla, nie otvorenie odkazu. Odkazy v správach
   totiž samy navštevujú bezpečnostné skenery a potvrdil by nám objednávku
   robot skôr, než by ju kuchár uvidel (koncept 7.2.1). */
export async function potvrdenieZobraz(k) {
  const t = k.url.searchParams.get("t") ?? "";
  const o = await jeden(`
    SELECT o.*, o.datum::text AS datum, p.nazov AS jedalen,
           EXISTS (SELECT 1 FROM odoslanie n
                    WHERE n.poskytovatel_id = o.poskytovatel_id AND n.datum = o.datum
                      AND n.druh = o.druh AND n.stav = 'ok' AND n.id > o.id) AS nahradene
      FROM odoslanie o
      JOIN poskytovatel p ON p.id = o.poskytovatel_id
     WHERE o.token = $1`, [t]);
  return zobrazPotvrdenie(k, o, t, null);
}

export async function potvrdenieUloz(k) {
  const t = k.data.t ?? "";
  const o = await jeden(`
    SELECT o.*, o.datum::text AS datum, p.nazov AS jedalen,
           EXISTS (SELECT 1 FROM odoslanie n
                    WHERE n.poskytovatel_id = o.poskytovatel_id AND n.datum = o.datum
                      AND n.druh = o.druh AND n.stav = 'ok' AND n.id > o.id) AS nahradene
      FROM odoslanie o
      JOIN poskytovatel p ON p.id = o.poskytovatel_id
     WHERE o.token = $1`, [t]);
  /* Potvrdenie platí pre konkrétne čísla, nie pre e-mail (koncept 7.2.1).
     Keď medzitým odišla oprava, tieto čísla už neplatia a potvrdiť sa nedajú
     — inak by sa dodávateľ mohol brániť tým, že potvrdil niečo iné. */
  if (o && !o.potvrdene && !o.nahradene) {
    await bazen.query("UPDATE odoslanie SET potvrdene = now() WHERE id = $1", [o.id]);
    await zapis(null, "objednavka.potvrdena", { jedalen: o.jedalen, tyzden: o.datum });
    o.potvrdene = new Date();
    return zobrazPotvrdenie(k, o, t, "dakujeme");
  }
  return zobrazPotvrdenie(k, o, t, null);
}

function zobrazPotvrdenie(k, o, t, stav) {
  if (!o)
    return k.html(k.odp, 404, holaStranka({ titulok: "Neplatný odkaz", verzia: k.verzia, obsah: `
      <section class="prihlas"><div class="card">
        <h2>Odkaz už neplatí</h2>
        <p>Tento odkaz na potvrdenie sa nedá použiť. Mohol byť z inej objednávky
        alebo bol medzitým nahradený novšou. Ozvite sa prosím správcovi.</p>
      </div></section>` }));

  const uz = o.potvrdene
    ? `<div class="okbox">Objednávka je potvrdená${stav === "dakujeme" ? " — ďakujeme" : ""}.</div>`
    : "";
  const nahradene = o.nahradene
    ? `<div class="warnbox"><strong>Tieto počty už neplatia.</strong> Poslali sme vám novšiu
       objednávku na ten istý týždeň — potvrďte prosím tú. Ak vám neprišla, ozvite sa nám.</div>`
    : "";

  k.html(k.odp, 200, holaStranka({ titulok: "Potvrdenie objednávky", verzia: k.verzia, obsah: `
<section class="prihlas" style="max-width:720px">
  <div class="card">
    <h2>Potvrdenie objednávky</h2>
    <p class="hint" style="margin-top:0">${esc(o.jedalen)} · týždeň od ${esc(dlhy(o.datum))}</p>
    ${nahradene}
    ${uz}
    <pre class="znenie">${esc(o.telo ?? "")}</pre>
    ${o.potvrdene || o.nahradene ? "" : `
      <form method="post" action="/potvrdenie">
        <input type="hidden" name="t" value="${esc(t)}">
        ${/* Kuchár nie je prihlásený a známku nepotrebuje — tajomstvom je token
              v odkaze. Lenže ten istý odkaz otvára aj správca vo vlastnom
              prehliadači, kde prihlásený je, a smerovač vtedy známku vyžaduje.
              Bez nej sa potvrdenie odmietlo hláškou o formulári. */
          k.csrf ? `<input type="hidden" name="znamka" value="${esc(k.csrf)}">` : ""}
        <p>Sedia počty vyššie? Potvrďte prosím, že objednávku máte.</p>
        <button class="btn primary" type="submit">Potvrdzujem prijatie objednávky</button>
      </form>`}
  </div>
</section>` }));
}
