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
import { DNI, dniTyzdna, denMesiac, tyzdenPopis, oznacenie, dlhy } from "./datum.js";
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

  const riadky = await vsetky(`
    SELECT poskytovatel_id, datum::text AS datum, jedlo, count(*)::int AS kolko
      FROM objednavka
     WHERE datum BETWEEN $1 AND $2 AND jedlo >= 0
     GROUP BY 1, 2, 3`, [dni[0], dni[4]]);

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
      nerozhodnuti: nerozhodnuti.filter(n => n.poskytovatel_id === j.id)
    });
  }
  return von;
}

/* ---------- znenie správy ---------- */

/* Kuchyňa číta objednávku na telefóne. Preto sú počty v tele správy ako
   čistý text a nie iba v prílohe (koncept 7.2) — otvárať prílohu je
   prekážka práve tam, kde na tom najviac záleží. */
export function textObjednavky(p, odkaz) {
  const r = [];
  r.push(`Objednávka obedov na týždeň ${tyzdenPopis(p.dni[0])}`);
  r.push(ODBERATEL);
  r.push("");

  for (const [i, d] of p.dni.entries()) {
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

  r.push(`Spolu za týždeň: ${mnoho(p.spolu, ["obed", "obedy", "obedov"])}.`);
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

/* Jedna jedáleň. Riadok v `odoslanie` vznikne aj keď sa odoslať nepodarí. */
async function posliJednej(p, po, ktoId) {
  const komu = (p.jedalen.email ?? "").trim();
  const kopia = KOPIA && KOPIA !== komu ? KOPIA : null;
  const token = randomBytes(24).toString("base64url");
  const odkaz = `${ADRESA}/potvrdenie?t=${token}`;
  const predmet = `Objednávka obedov ${tyzdenPopis(po)} — PD Vráble`;
  const telo = textObjednavky(p, odkaz);
  const poctov = Object.fromEntries(p.jedla.map(j => [j.znak, j.poDnoch]));

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

/* Pošle objednávky za celý týždeň. Jedálne bez objednaných porcií sa
   preskočia — prázdna objednávka kuchyňu len mätie. */
export async function posliObjednavky(po, ktoId) {
  const vysledky = [];
  for (const p of await poctyZaTyzden(po)) {
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
    SELECT o.*, p.nazov AS jedalen, os.priezvisko, os.meno
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
    SELECT o.*, o.datum::text AS datum, p.nazov AS jedalen FROM odoslanie o
      JOIN poskytovatel p ON p.id = o.poskytovatel_id
     WHERE o.token = $1`, [t]);
  return zobrazPotvrdenie(k, o, t, null);
}

export async function potvrdenieUloz(k) {
  const t = k.data.t ?? "";
  const o = await jeden(`
    SELECT o.*, o.datum::text AS datum, p.nazov AS jedalen FROM odoslanie o
      JOIN poskytovatel p ON p.id = o.poskytovatel_id
     WHERE o.token = $1`, [t]);
  if (o && !o.potvrdene) {
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

  k.html(k.odp, 200, holaStranka({ titulok: "Potvrdenie objednávky", verzia: k.verzia, obsah: `
<section class="prihlas" style="max-width:720px">
  <div class="card">
    <h2>Potvrdenie objednávky</h2>
    <p class="hint" style="margin-top:0">${esc(o.jedalen)} · týždeň od ${esc(dlhy(o.datum))}</p>
    ${uz}
    <pre class="znenie">${esc(o.telo ?? "")}</pre>
    ${o.potvrdene ? "" : `
      <form method="post" action="/potvrdenie">
        <input type="hidden" name="t" value="${esc(t)}">
        <p>Sedia počty vyššie? Potvrďte prosím, že objednávku máte.</p>
        <button class="btn primary" type="submit">Potvrdzujem prijatie objednávky</button>
      </form>`}
  </div>
</section>` }));
}
