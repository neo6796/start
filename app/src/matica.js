/* Matica predáka — jadro appky.

   Tri stavy, nie dva (koncept 4.6):
     nerozhodnuté  prázdna bunka — nikto nekonal, treba sa spýtať
     bez obeda     krížik — rozhodnutie, takže sa medzi chýbajúcich nepočíta
     jedlo         označenie podľa toho, ako ho značí jedáleň

   Kto má pridelené dve jedálne, má ponuky pod sebou — jeden riadok na jedáleň.
   Krížik je vždy jeden a má vlastný riadok: „nechcem obed" je rozhodnutie
   o dni, nie o dodávateľovi (preview, obrazovka Predák).

   Bunky sú obyčajné prepínače (radio). Klávesnica aj odoslanie formulára tak
   fungujú bez jediného riadku JavaScriptu; skript len pridáva zrušenie voľby
   opätovným kliknutím. */

import { stranka, esc, meno, mnoho } from "./html.js";
import { bazen, jeden, vsetky, zapis } from "./db.js";
import { DNI, DNI_SKRATKA, dnes, pondelok, dniTyzdna, denMesiac, tyzdenPopis, oznacenie } from "./datum.js";

const BEZ_OBEDA = -1;

/* Krátky zoznam zámerne — nie je to modul na evidenciu dochádzky (koncept 1.4). */
export const DOVODY = [
  ["dovolenka", "dovolenka", "D"],
  ["pn", "PN", "P"],
  ["skolenie", "školenie alebo služobná cesta", "Š"],
  ["ine", "iné", "I"]
];
const dovodPopis = d => (DOVODY.find(x => x[0] === d) ?? [, d, "?"])[1];
const dovodZnak = d => (DOVODY.find(x => x[0] === d) ?? [, d, "?"])[2];

/* ---------- načítanie ---------- */

async function jedalne() {
  return vsetky("SELECT * FROM poskytovatel WHERE aktivny ORDER BY nazov");
}

/* Ľudia, za ktorých niekto objednáva, aj s prideleniami a s tým, čo už majú. */
async function tymZaTyzden(podmienka, hodnoty, po) {
  const dni = dniTyzdna(po);
  const ludia = await vsetky(`
    SELECT o.id, o.priezvisko, o.meno, o.kod_dochadzka, o.poskytovatel_id,
           t.nazov AS tim, t.id AS tim_id
      FROM osoba o
      LEFT JOIN tim t ON t.id = o.tim_id
     WHERE o.aktivny AND ${podmienka}
     ORDER BY t.nazov NULLS LAST, o.priezvisko, o.meno`, hodnoty);

  if (!ludia.length) return { ludia: [], objednavky: new Map(), pridelenia: new Map() };

  const idcka = ludia.map(o => o.id);

  const objednavky = new Map();
  for (const r of await vsetky(
    `SELECT osoba_id, datum::text AS datum, jedlo, poskytovatel_id, zadane_ako
       FROM objednavka WHERE osoba_id = ANY($1) AND datum = ANY($2::date[])`, [idcka, dni]))
    objednavky.set(`${r.osoba_id}|${r.datum}`, r);

  const pridelenia = new Map();
  for (const r of await vsetky(
    `SELECT oj.osoba_id, oj.poskytovatel_id
       FROM osoba_jedalen oj JOIN poskytovatel p ON p.id = oj.poskytovatel_id
      WHERE oj.osoba_id = ANY($1) AND p.aktivny
      ORDER BY p.nazov`, [idcka])) {
    if (!pridelenia.has(r.osoba_id)) pridelenia.set(r.osoba_id, []);
    pridelenia.get(r.osoba_id).push(r.poskytovatel_id);
  }

  /* Neprítomnosť sa v matici len ukazuje pri dni — nič neprepisuje.
     Deň sa dá kedykoľvek prebiť, je to predvolená hodnota, nie zámok. */
  const nepritomnosti = new Map();
  for (const r of await vsetky(
    `SELECT osoba_id, od::text AS od, do_::text AS do_, dovod
       FROM nepritomnost WHERE osoba_id = ANY($1) AND od <= $3 AND do_ >= $2`,
    [idcka, dni[0], dni[4]])) {
    if (!nepritomnosti.has(r.osoba_id)) nepritomnosti.set(r.osoba_id, []);
    nepritomnosti.get(r.osoba_id).push(r);
  }

  return { ludia, objednavky, pridelenia, nepritomnosti };
}

function precPreč(nepritomnosti, osobaId, datum) {
  return (nepritomnosti?.get(osobaId) ?? []).find(n => n.od <= datum && n.do_ >= datum) ?? null;
}

/* ---------- vykreslenie ---------- */

function bunka(o, datum, zaznam, moje, vsetkyJedalne, prec) {
  const hodnota = zaznam?.jedlo;
  const nerozhodnute = hodnota === null || hodnota === undefined;
  const menoPola = `b-${o.id}-${datum}`;
  const viac = moje.length > 1;

  const krizik = `<label class="opt-b none">
    <input type="radio" name="${menoPola}" value="x"${hodnota === BEZ_OBEDA ? " checked" : ""}>
    <span aria-hidden="true">×</span><span class="len-pre-citacku">nechce obed</span></label>`;

  let h = `<div class="opts" role="group" aria-label="${esc(o.priezvisko)} ${esc(o.meno)}">`;
  moje.forEach((jid, i) => {
    const j = vsetkyJedalne.find(x => x.id === jid);
    if (!j) return;
    h += `<span class="opt-row">`;
    for (let n = 0; n < j.pocet_jedal; n++) {
      const zvolene = !nerozhodnute && hodnota === n &&
                      (zaznam.poskytovatel_id === jid || moje.length === 1);
      const znak = oznacenie(j.znacenie, n);
      h += `<label class="opt-b">
        <input type="radio" name="${menoPola}" value="${jid}:${n}"${zvolene ? " checked" : ""}>
        <span aria-hidden="true">${esc(znak)}</span>
        <span class="len-pre-citacku">${esc(j.nazov)}, jedlo ${esc(znak)}</span></label>`;
    }
    if (!viac && i === moje.length - 1) h += krizik;
    h += `</span>`;
  });
  if (viac) h += `<span class="opt-row">${krizik}</span>`;
  h += `</div>`;
  if (prec) h += `<span class="precmark" title="${esc(dovodPopis(prec.dovod))}"
    >${esc(dovodZnak(prec.dovod))}</span>`;
  return h;
}

function tabulka(ludia, objednavky, pridelenia, po, vsetkyJedalne, nepritomnosti) {
  const dni = dniTyzdna(po);
  return `
<div class="scroll-x"><table class="matrix">
  <thead><tr>
    <th>Stravník</th>
    ${dni.map((d, i) => `<th><span class="dn">${DNI[i]}</span>
      <span class="dnum">${denMesiac(d)}</span></th>`).join("")}
    <th class="cnt">Bez voľby</th>
  </tr></thead>
  <tbody>
    ${ludia.map(o => {
      const moje = pridelenia.get(o.id) ?? (o.poskytovatel_id ? [o.poskytovatel_id] : []);
      const chyba = dni.filter(d => {
        const z = objednavky.get(`${o.id}|${d}`);
        return z?.jedlo === null || z?.jedlo === undefined;
      }).length;
      /* Bez jedálne sa nedá objednať nič. Povedať to raz na riadku je
         zrozumiteľnejšie než päťkrát v prázdnych bunkách. */
      if (!moje.length) return `<tr class="is-off">
        <th><span class="nm">${esc(o.priezvisko)} ${esc(o.meno)}</span>
          <span class="pn">${esc(o.kod_dochadzka ?? "—")}</span></th>
        <td colspan="6" class="bez-jedalne">Nemá pridelenú jedáleň, takže sa preň nedá objednať.
          Prideľuje sa v <a href="/osoba?id=${o.id}">jeho údajoch</a>.</td>
      </tr>`;

      return `<tr>
        <th><span class="nm">${esc(o.priezvisko)} ${esc(o.meno)}</span>
          <span class="pn">${esc(o.kod_dochadzka ?? "—")}</span></th>
        ${dni.map(d => {
          const z = objednavky.get(`${o.id}|${d}`);
          const prazdna = z?.jedlo === null || z?.jedlo === undefined;
          const prec = precPreč(nepritomnosti, o.id, d);
          return `<td${prazdna ? ' class="gap"' : ""}>${bunka(o, d, z, moje, vsetkyJedalne, prec)}</td>`;
        }).join("")}
        <td class="cnt${chyba ? " gap" : ""}">${chyba || "—"}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table></div>
<p class="swipe-hint">Tabuľka sa posúva vbok</p>`;
}

const LEGENDA = `
<div class="legend">
  <span><span class="opt-b vzor" aria-hidden="true">B</span> zvolené jedlo</span>
  <span><span class="opt-b none vzor" aria-hidden="true">×</span> nechce obed — je to rozhodnutie, upomienka nechodí</span>
  <span><i class="sw empty"></i> bez voľby — nikto nekonal</span>
</div>`;

/* ---------- obrazovka predáka ---------- */

export async function tim(k) {
  const po = pondelok(k.url.searchParams.get("tyzden") || dnes());
  const jedla = await jedalne();

  /* Správca vidí všetko, predák svoj tím. Predák je pri tíme, nie pri osobe. */
  const { ludia, objednavky, pridelenia, nepritomnosti } = k.osoba.je_admin && !k.osoba.je_predak
    ? await tymZaTyzden("true", [], po)
    : await tymZaTyzden("o.tim_id IN (SELECT id FROM tim WHERE predak_id = $1)", [k.osoba.id], po);

  const zamok = await jeden("SELECT * FROM tyzden_stav WHERE pondelok = $1", [po]);
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");

  const bezVolby = ludia.reduce((s, o) => s + dniTyzdna(po).filter(d => {
    const z = objednavky.get(`${o.id}|${d}`);
    return z?.jedlo === null || z?.jedlo === undefined;
  }).length, 0);

  const odkaz = (t, popis) =>
    `<a class="btn" href="/tim?tyzden=${t}">${esc(popis)}</a>`;

  k.html(k.odp, 200, stranka({
    titulok: "Môj tím", osoba: k.osoba, cesta: "/tim", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Môj tím</h2>
    <span class="who">${esc(meno(k.osoba))}</span>
  </div>

  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  <div class="deadline">
    <span class="lbl">Týždeň</span>
    <span class="val">${tyzdenPopis(po)}</span>
    <span class="sep">·</span>
    <span class="lbl">Bez voľby</span>
    <span class="val">${bezVolby}</span>
    <span style="margin-left:auto" class="btn-row">
      ${odkaz(posunTyzden(po, -7), "← predchádzajúci")}
      ${odkaz(pondelok(dnes()), "tento týždeň")}
      ${odkaz(posunTyzden(po, 7), "nasledujúci →")}
    </span>
  </div>

  ${zamok?.uzavrety ? `<div class="warnbox">Týždeň je uzavretý. Zmeny už rieši admin.</div>` : ""}

  ${ludia.length === 0
    ? `<div class="card"><p style="margin:0">Nemáš nikoho v tíme.</p>
        <p class="hint" style="margin:10px 0 0">Tím sa prideľuje predákovi
          v <a href="/ciselniky">Číselníkoch</a> a ľudia sa doň zaraďujú
          v <a href="/ludia">Ľuďoch</a>.</p></div>`
    : `<form method="post" action="/tim" class="card">
        <input type="hidden" name="znamka" value="${esc(k.csrf)}">
        <input type="hidden" name="tyzden" value="${po}">
        <div class="card-head">
          <h3>${esc(ludia[0].tim ?? "Bez tímu")}</h3>
          <span class="pill neutral">${mnoho(ludia.length, ["človek", "ľudia", "ľudí"])}</span>
        </div>
        ${tabulka(ludia, objednavky, pridelenia, po, jedla, nepritomnosti)}
        ${LEGENDA}
        <div class="btn-row" style="margin-top:16px">
          <button class="btn primary" type="submit"${zamok?.uzavrety ? " disabled" : ""}>Uložiť</button>
        </div>
        <p class="hint" style="margin-top:12px">Opätovné kliknutie na zvolenú možnosť ju zruší
          a bunka sa vráti na nerozhodnuté.</p>
      </form>

      <div class="card">
        <details${k.url.searchParams.get("prec") ? " open" : ""}>
          <summary class="btn">Hromadné odhlásenie (dovolenka, PN, služobka)</summary>
          <form method="post" action="/tim/nepritomnost" style="margin-top:16px">
            <input type="hidden" name="znamka" value="${esc(k.csrf)}">
            <input type="hidden" name="tyzden" value="${po}">
            <div class="hromadne">
              <div class="field"><label for="n-kto">Koho</label>
                <select id="n-kto" name="kto" required>
                  <option value="">—</option>
                  <option value="vsetci">celý tím (${ludia.length})</option>
                  ${ludia.map(o => `<option value="${o.id}">${esc(o.priezvisko)} ${esc(o.meno)}</option>`).join("")}
                </select></div>
              <div class="field"><label for="n-od">Od</label>
                <input type="date" id="n-od" name="od" value="${po}" required></div>
              <div class="field"><label for="n-do">Do</label>
                <input type="date" id="n-do" name="do" value="${dniTyzdna(po)[4]}" required></div>
              <div class="field"><label for="n-dovod">Dôvod</label>
                <select id="n-dovod" name="dovod" required>
                  ${DOVODY.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("")}
                </select></div>
            </div>
            <button class="btn primary" type="submit"${zamok?.uzavrety ? " disabled" : ""}>Označiť „bez obeda"</button>
            <div class="note">
              Nastaví vybrané dni na <strong>bez obeda</strong>, nie na prázdne. Keby ostali prázdne,
              appka by človeka celý týždeň naháňala upomienkami, hoci je na dovolenke.
              Zapíše sa aj dôvod — pri uzávierke sa tak neprítomnosť neohlási ako nález.
              Ktorýkoľvek deň sa dá potom prebiť v tabuľke: je to predvolená hodnota, nie zámok.
            </div>
          </form>
        </details>
      </div>`}
</section>

<script>
/* Jediné, čo prepínače samy nevedia: zrušiť voľbu. Bez skriptu sa dá voľba
   zmeniť, len nie vrátiť na „nerozhodnuté" — ostatné funguje aj bez neho. */
document.querySelectorAll("table.matrix input[type=radio]").forEach(p => {
  p.addEventListener("click", e => {
    if (p.dataset.bolo === "1") { p.checked = false; p.dataset.bolo = ""; e.preventDefault?.(); }
  });
  p.addEventListener("change", () => {
    for (const iny of document.getElementsByName(p.name)) iny.dataset.bolo = "";
    p.dataset.bolo = "1";
  });
  if (p.checked) p.dataset.bolo = "1";
});
</script>`
  }));
}

function posunTyzden(po, dni) {
  const d = new Date(po + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
}

/* ---------- uloženie ---------- */

/* Čo sa uloží: cena sa na objednávku odfotí (koncept 6.1), aby neskoršia zmena
   cenníka minulosť neprepísala. Rozdelenie na príspevok, fond a podiel
   stravníka sa dopočíta až pri uzávierke — z odfotenej ceny, takže je rovnako
   stabilné, a nie je ho treba prepočítavať pri každom kliknutí. */
export async function uloz(k) {
  const po = pondelok(k.data.tyzden || dnes());
  const dni = dniTyzdna(po);

  const zamok = await jeden("SELECT * FROM tyzden_stav WHERE pondelok = $1", [po]);
  if (zamok?.uzavrety)
    return k.inam(k.odp, `/tim?tyzden=${po}&chyba=` +
      encodeURIComponent("Týždeň je uzavretý, nič sa neuložilo."));

  const jeAdmin = k.osoba.je_admin;
  const { ludia, objednavky, pridelenia } = jeAdmin && !k.osoba.je_predak
    ? await tymZaTyzden("true", [], po)
    : await tymZaTyzden("o.tim_id IN (SELECT id FROM tim WHERE predak_id = $1)", [k.osoba.id], po);

  const jedla = await jedalne();
  const akoZadane = jeAdmin && !k.osoba.je_predak ? "admin" : "predak";

  let zmien = 0, odmietnutych = 0;
  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    for (const o of ludia) {
      const moje = pridelenia.get(o.id) ?? (o.poskytovatel_id ? [o.poskytovatel_id] : []);
      for (const d of dni) {
        const surove = k.data[`b-${o.id}-${d}`] ?? "";
        const stare = objednavky.get(`${o.id}|${d}`);
        const staraHodnota = stare?.jedlo ?? null;

        let jedlo = null, jedalenId = null;
        if (surove === "x") jedlo = BEZ_OBEDA;
        else if (surove) {
          const [jid, n] = surove.split(":").map(Number);
          /* Nikto si nesmie objednať z jedálne, ktorú nemá pridelenú — inak by
             stačilo zmeniť hodnotu vo formulári a obísť tým pridelenie. */
          const j = jedla.find(x => x.id === jid);
          if (!j || !moje.includes(jid) || !(n >= 0 && n < j.pocet_jedal)) { odmietnutych++; continue; }
          jedlo = n; jedalenId = jid;
        }

        if (jedlo === staraHodnota &&
            (jedlo === null || jedlo === BEZ_OBEDA || stare?.poskytovatel_id === jedalenId)) continue;

        if (jedlo === null) {
          await klient.query("DELETE FROM objednavka WHERE osoba_id = $1 AND datum = $2", [o.id, d]);
          zmien++;
          continue;
        }

        const j = jedalenId ? jedla.find(x => x.id === jedalenId) : null;
        const bezDph = j ? Number(j.cena_s_dph) / (1 + Number(j.sadzba_dph) / 100) : null;

        await klient.query(`
          INSERT INTO objednavka (osoba_id, datum, jedlo, poskytovatel_id, zadal_id, zadane_ako,
                                  cena_bez_dph, sadzba_dph, zmenene)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
          ON CONFLICT (osoba_id, datum) DO UPDATE SET
            jedlo = EXCLUDED.jedlo, poskytovatel_id = EXCLUDED.poskytovatel_id,
            zadal_id = EXCLUDED.zadal_id, zadane_ako = EXCLUDED.zadane_ako,
            cena_bez_dph = EXCLUDED.cena_bez_dph, sadzba_dph = EXCLUDED.sadzba_dph,
            zmenene = now()`,
          [o.id, d, jedlo, jedalenId, k.osoba.id, akoZadane,
           bezDph === null ? null : bezDph.toFixed(4), j ? j.sadzba_dph : null]);
        zmien++;
      }
    }
    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    return k.inam(k.odp, `/tim?tyzden=${po}&chyba=` +
      encodeURIComponent("Neuložilo sa nič: " + e.message));
  }
  klient.release();

  await zapis(k.osoba.id, "matica.ulozene", { tyzden: po, zmien, odmietnutych });

  const sprava = zmien
    ? `Uložené — ${mnoho(zmien, ["zmena", "zmeny", "zmien"])}.`
    : "Nič sa nezmenilo.";
  k.inam(k.odp, `/tim?tyzden=${po}&sprava=` + encodeURIComponent(sprava) +
    (odmietnutych ? "&chyba=" + encodeURIComponent(
      `${mnoho(odmietnutych, ["voľba sa neuložila", "voľby sa neuložili", "volieb sa neuložilo"])} — ` +
      "jedáleň nie je danému stravníkovi pridelená.") : ""));
}

/* ---------- hromadné odhlásenie ---------- */

/* Zapíše sa záznam o neprítomnosti a dni v rozsahu sa nastavia na „bez obeda".
   Sobota a nedeľa sa preskočia — objednávka mimo pracovného dňa neexistuje
   a databáza ju aj tak odmietne. */
export async function nepritomnost(k) {
  const po = pondelok(k.data.tyzden || dnes());
  const spat = t => k.inam(k.odp, `/tim?tyzden=${po}&prec=1&chyba=` + encodeURIComponent(t));

  const od = (k.data.od ?? "").trim(), doDna = (k.data.do ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(od) || !/^\d{4}-\d{2}-\d{2}$/.test(doDna))
    return spat("Dátumy nie sú vyplnené.");
  if (doDna < od) return spat("Koniec je skôr než začiatok.");
  if (!DOVODY.some(d => d[0] === k.data.dovod)) return spat("Chýba dôvod.");

  const { ludia } = k.osoba.je_admin && !k.osoba.je_predak
    ? await tymZaTyzden("true", [], po)
    : await tymZaTyzden("o.tim_id IN (SELECT id FROM tim WHERE predak_id = $1)", [k.osoba.id], po);

  const koho = k.data.kto === "vsetci"
    ? ludia
    : ludia.filter(o => o.id === Number(k.data.kto));
  if (!koho.length) return spat("Nevybrali ste nikoho zo svojho tímu.");

  /* Pracovné dni v rozsahu. Rozsah je zámerne bez obmedzenia na jeden týždeň —
     dovolenka býva dvojtýždňová a rozdeľovať ju na dva zápisy nemá zmysel. */
  const dni = [];
  for (let d = od; d <= doDna; d = posunDen(d, 1)) {
    const den = new Date(d + "T12:00:00Z").getUTCDay();
    if (den >= 1 && den <= 5) dni.push(d);
  }
  if (!dni.length) return spat("V zadanom rozsahu nie je ani jeden pracovný deň.");
  if (dni.length > 200) return spat("Rozsah je pridlhý — zadajte kratší.");

  /* Uzavreté týždne sa nechajú tak. Nie je dôvod celú akciu zrušiť, len sa
     povie, koľko dní neprešlo. */
  const uzavrete = new Set((await vsetky(
    "SELECT pondelok::text AS pondelok FROM tyzden_stav WHERE uzavrety")).map(r => r.pondelok));
  const volne = dni.filter(d => !uzavrete.has(pondelok(d)));
  const zamknutych = dni.length - volne.length;
  if (!volne.length) return spat("Všetky dni v rozsahu patria do uzavretých týždňov.");

  let zmien = 0;
  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    for (const o of koho) {
      await klient.query(
        "INSERT INTO nepritomnost (osoba_id, od, do_, dovod, zadal_id) VALUES ($1,$2,$3,$4,$5)",
        [o.id, od, doDna, k.data.dovod, k.osoba.id]);
      for (const d of volne) {
        const v = await klient.query(`
          INSERT INTO objednavka (osoba_id, datum, jedlo, zadal_id, zadane_ako, zmenene)
          VALUES ($1,$2,$3,$4,$5, now())
          ON CONFLICT (osoba_id, datum) DO UPDATE SET
            jedlo = EXCLUDED.jedlo, poskytovatel_id = NULL,
            cena_bez_dph = NULL, sadzba_dph = NULL,
            zadal_id = EXCLUDED.zadal_id, zadane_ako = EXCLUDED.zadane_ako, zmenene = now()
          WHERE objednavka.jedlo IS DISTINCT FROM $3`,
          [o.id, d, BEZ_OBEDA, k.osoba.id, "predak"]);
        zmien += v.rowCount;
      }
    }
    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    return spat("Neuložilo sa nič: " + e.message);
  }
  klient.release();

  await zapis(k.osoba.id, "nepritomnost.zapisana",
              { koho: koho.map(o => o.id), od, do: doDna, dovod: k.data.dovod, zmien });

  k.inam(k.odp, `/tim?tyzden=${po}&sprava=` + encodeURIComponent(
    `Odhlásené: ${mnoho(koho.length, ["človek", "ľudia", "ľudí"])}, ` +
    `${mnoho(volne.length, ["pracovný deň", "pracovné dni", "pracovných dní"])}` +
    (zamknutych ? `. ${mnoho(zamknutych, ["deň", "dni", "dní"])} v uzavretých týždňoch sa nedotklo` : "") + "."));
}

function posunDen(iso, kolko) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + kolko);
  return d.toISOString().slice(0, 10);
}

/* ---------- vlastný týždeň stravníka ---------- */

export async function moje(k) {
  const po = pondelok(k.url.searchParams.get("tyzden") || dnes());
  const jedla = await jedalne();
  const { ludia, objednavky, pridelenia, nepritomnosti } = await tymZaTyzden("o.id = $1", [k.osoba.id], po);
  const zamok = await jeden("SELECT * FROM tyzden_stav WHERE pondelok = $1", [po]);

  k.html(k.odp, 200, stranka({
    titulok: "Môj týždeň", osoba: k.osoba, cesta: "/moje", verzia: k.verzia,
    obsah: `
<section class="wrap">
  <div class="screen-head">
    <h2>Môj týždeň</h2>
    <span class="who">${esc(meno(k.osoba))}</span>
  </div>
  <div class="deadline">
    <span class="lbl">Týždeň</span>
    <span class="val">${tyzdenPopis(po)}</span>
    <span style="margin-left:auto" class="btn-row">
      <a class="btn" href="/moje?tyzden=${posunTyzden(po, -7)}">←</a>
      <a class="btn" href="/moje?tyzden=${pondelok(dnes())}">tento týždeň</a>
      <a class="btn" href="/moje?tyzden=${posunTyzden(po, 7)}">→</a>
    </span>
  </div>
  ${zamok?.uzavrety ? `<div class="warnbox">Týždeň je uzavretý — zmenu už vie spraviť len predák alebo admin.</div>` : ""}
  <div class="card">
    ${ludia.length ? tabulka(ludia, objednavky, pridelenia, po, jedla, nepritomnosti) : "<p>Nenašiel som ťa v zozname.</p>"}
    ${LEGENDA}
    <p class="hint" style="margin-top:12px">Zatiaľ len na pozeranie — vlastné objednávanie
      pribudne hneď po tom, ako sa matica overí v pilote. Zmenu ti dovtedy spraví predák.</p>
  </div>
</section>`
  }));
}
