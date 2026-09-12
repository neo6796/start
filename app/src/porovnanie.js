/* Porovnanie s papierom.

   Prvý mesiac ide appka paralelne s papierom, takže otázka nie je „koľko to
   stojí", ale „sedia počty". Táto obrazovka na to odpovedá jedným pohľadom:
   vedľa seba počet z hárku a počet z appky, a rozdiel medzi nimi.

   Prečo sa papier vkladá a neimportuje zo súboru: hárok má mená bez osobných
   čísel, dva z nich sú neúplné („Murár", „Valko"), a párovať sa musí ručne aj
   tak. Vkladanie to zvláda a nepotrebuje čítačku XLSX, ktorú by sme písali
   kvôli jednému mesiacu. Je to ten istý spôsob, akým sa vkladá menu.

   Papier vie povedať len **počty za mesiac** — nie dni a nie jedlá. To stačí
   na otázku, či sa appka trafila. Na spätný zápis to nestačí a je to tak
   správne: vymyslené dni by v denníku vyzerali ako skutočné. */

import { stranka, esc, mnoho } from "./html.js";
import { vsetky } from "./db.js";
import { dnes, mesiacPopis, prvyVMesiaci, posunMesiac } from "./datum.js";

/* ---------- čítanie papiera ---------- */

/* Bez diakritiky, bez veľkých písmen, bez zdvojených medzier — hárok píše
   mená inak než menoslov a na tomto by sa párovanie zbytočne lámalo. */
const kluc = s => String(s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

/* Riadok hárku: meno, stredisko, týždne, spolu. Z Excelu sa kopíruje
   tabulátormi, takže prvé pole je meno a posledné číslo je súčet. */
export function zPapiera(text) {
  const von = [];
  for (const surovy of String(text ?? "").split(/\r?\n/)) {
    const r = surovy.trim();
    if (!r) continue;
    /* Hlavičky a súčtový riadok — nie sú to ľudia. Kontroluje sa celý riadok,
       nie až odvodené meno: nadpis „OBEDY za 08 /2026" má v sebe číslo, takže
       by inak prešiel ako človek s ôsmimi obedmi. */
    if (/obedy za|týž\.|spolu/i.test(r)) continue;

    const cisla = [...r.matchAll(/(?:^|[\s;])(\d+)(?=$|[\s;])/g)].map(m => Number(m[1]));
    if (!cisla.length) continue;
    const pocet = cisla[cisla.length - 1];

    const polia = r.split(/\t|;/).map(x => x.trim()).filter(Boolean);
    let meno = polia.length > 1
      ? polia[0]
      : r.replace(/[\s;]*\d+\s*$/, "").trim();
    /* „SPOLU: 91" prejde ako meno, keby bol riadok bez tabulátorov. */
    if (!meno || !/\p{L}{2}/u.test(meno) || /^spolu/i.test(meno)) continue;
    von.push({ meno, pocet });
  }
  return von;
}

/* ---------- párovanie ---------- */

/* Hárok pozná mená, appka osobné čísla. Skúša sa „priezvisko meno" aj
   opačne; keď je na papieri len priezvisko — a v tomto hárku sú také dve —
   berie sa, len ak je v menoslove jediné. Jednoznačné priradenie radšej než
   tiché uhádnutie. */
function sparuj(papier, ludia) {
  const podlaCeleho = new Map();
  const podlaPriezviska = new Map();
  for (const o of ludia) {
    podlaCeleho.set(kluc(`${o.priezvisko} ${o.meno}`), o);
    podlaCeleho.set(kluc(`${o.meno} ${o.priezvisko}`), o);
    const p = kluc(o.priezvisko);
    if (!podlaPriezviska.has(p)) podlaPriezviska.set(p, []);
    podlaPriezviska.get(p).push(o);
  }

  return papier.map(r => {
    const k = kluc(r.meno);
    const cely = podlaCeleho.get(k);
    if (cely) return { ...r, osoba: cely, ako: "meno" };
    const podľaP = podlaPriezviska.get(k) ?? [];
    if (podľaP.length === 1) return { ...r, osoba: podľaP[0], ako: "priezvisko" };
    if (podľaP.length > 1) return { ...r, osoba: null, ako: "viacero" };
    return { ...r, osoba: null, ako: "nenašlo" };
  });
}

/* ---------- obrazovka ---------- */

export async function zobraz(k) {
  /* Tá istá obrazovka chodí GETom (prázdna) aj POSTom (s vloženým hárkom),
     tak sa výber mesiaca a jedálne hľadá v oboch. */
  const daj = n => k.data?.[n] ?? k.url.searchParams.get(n);
  const prvy = prvyVMesiaci(daj("mesiac") || dnes());
  const jedalenId = Number(daj("jedalen")) || null;
  const vlozeny = k.data?.papier ?? "";

  const jedalne = await vsetky("SELECT id, nazov FROM poskytovatel ORDER BY nazov");
  const ludia = await vsetky("SELECT id, priezvisko, meno, kod_dochadzka FROM osoba");

  /* Počty z appky za mesiac, po osobách — voliteľne len z jednej jedálne,
     lebo hárok chodí od každej zvlášť. */
  const vApp = new Map();
  for (const r of await vsetky(`
    SELECT osoba_id, count(*)::int AS n FROM objednavka
     WHERE datum >= $1 AND datum < $2 AND jedlo >= 0
       AND ($3::int IS NULL OR poskytovatel_id = $3)
     GROUP BY osoba_id`, [prvy, posunMesiac(prvy, 1), jedalenId]))
    vApp.set(r.osoba_id, r.n);

  const papier = zPapiera(vlozeny);
  const sparovane = sparuj(papier, ludia);
  const naPapieri = new Set(sparovane.filter(x => x.osoba).map(x => x.osoba.id));

  const sedia = [], rozdielne = [], nesparovane = [];
  for (const x of sparovane) {
    if (!x.osoba) { nesparovane.push(x); continue; }
    const v = vApp.get(x.osoba.id) ?? 0;
    (v === x.pocet ? sedia : rozdielne).push({ ...x, vApp: v });
  }
  /* Kto je v appke a na papieri nie je — to je tá druhá strana rozdielu
     a zabudnúť sa na ňu dá veľmi ľahko. */
  const lenVApp = [...vApp.entries()]
    .filter(([id, n]) => n > 0 && !naPapieri.has(id))
    .map(([id, n]) => ({ osoba: ludia.find(o => o.id === id), pocet: n }));

  const spoluPapier = papier.reduce((a, x) => a + x.pocet, 0);
  const spoluApp = [...vApp.values()].reduce((a, x) => a + x, 0);

  const mesiace = [];
  for (let i = 0; i <= 5; i++) mesiace.push(posunMesiac(prvyVMesiaci(dnes()), -i));
  if (!mesiace.includes(prvy)) mesiace.push(prvy);
  mesiace.sort().reverse();

  const riadok = x => `<tr>
    <td>${esc(x.meno ?? `${x.osoba.priezvisko} ${x.osoba.meno}`)}</td>
    <td class="num">${esc(x.osoba?.kod_dochadzka ?? "—")}</td>
    <td class="num">${x.pocet ?? "—"}</td>
    <td class="num">${x.vApp ?? 0}</td>
    <td class="num"><strong>${x.vApp === undefined ? "" :
      (x.vApp - x.pocet > 0 ? "+" : "") + (x.vApp - x.pocet)}</strong></td>
  </tr>`;

  const hlavicka = `<thead><tr><th>Meno na hárku</th><th>Osobné číslo</th>
    <th class="num">Papier</th><th class="num">Appka</th><th class="num">Rozdiel</th></tr></thead>`;

  k.html(k.odp, 200, stranka({
    titulok: "Porovnanie s papierom", osoba: k.osoba, cesta: "/mesiac",
    verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Porovnanie s papierom</h2>
    <span class="who">${esc(mesiacPopis(prvy))}</span>
  </div>

  <div class="note">Prvý mesiac ide appka popri papieri, takže otázka nie je,
    koľko to stojí, ale <strong>či sedia počty</strong>. Hárok vie povedať len
    počty za mesiac — nie dni a nie jedlá. Na túto otázku to stačí.</div>

  <form method="post" action="/porovnanie" class="card">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <div class="hromadne">
      <div class="field"><label for="f-mesiac">Mesiac</label>
        <select id="f-mesiac" name="mesiac">${mesiace.map(m =>
          `<option value="${m.slice(0, 7)}"${m === prvy ? " selected" : ""}>${esc(mesiacPopis(m))}</option>`
        ).join("")}</select></div>
      <div class="field"><label for="f-jedalen">Jedáleň</label>
        <select id="f-jedalen" name="jedalen"><option value="">všetky</option>
          ${jedalne.map(j => `<option value="${j.id}"${j.id === jedalenId ? " selected" : ""}>${esc(j.nazov)}</option>`).join("")}
        </select>
        <p class="hint">Hárok chodí od každej jedálne zvlášť.</p></div>
    </div>
    <div class="field">
      <label for="p-papier">Hárok</label>
      <textarea id="p-papier" name="papier" rows="12"
        placeholder="Označ v Exceli riadky s menami a počtami, skopíruj a vlož sem.&#10;Solárová Denisa&#9;PD&#9;4&#9;5&#9;5&#9;3&#9;0&#9;17">${esc(vlozeny)}</textarea>
      <p class="hint">Berie sa prvé pole ako meno a posledné číslo v riadku ako počet
        za mesiac. Hlavičky a súčtový riadok sa preskočia.</p>
    </div>
    <div class="btn-row"><button class="btn primary" type="submit">Porovnať</button></div>
  </form>

  ${!papier.length ? "" : `
  <div class="card">
    <div class="card-head"><h3>Výsledok</h3>
      <span class="hint">papier ${spoluPapier} · appka ${spoluApp} ·
        rozdiel ${spoluApp - spoluPapier > 0 ? "+" : ""}${spoluApp - spoluPapier}</span></div>

    ${spoluApp === spoluPapier && !rozdielne.length && !lenVApp.length && !nesparovane.length
      ? `<div class="okbox">Sedí to na kus. ${mnoho(papier.length, ["riadok", "riadky", "riadkov"])},
          ${mnoho(spoluPapier, ["obed", "obedy", "obedov"])}.</div>`
      : ""}

    ${rozdielne.length ? `
      <div class="warnbox"><strong>${mnoho(rozdielne.length, ["človek sa rozchádza",
        "ľudia sa rozchádzajú", "ľudí sa rozchádza"])}.</strong> Tu treba pozrieť,
        či chýba deň v matici, alebo je preklep na hárku.</div>
      <div class="scroll-x"><table class="data">${hlavicka}
        <tbody>${rozdielne.map(riadok).join("")}</tbody></table></div>` : ""}

    ${lenVApp.length ? `
      <div class="warnbox" style="margin-top:14px"><strong>V appke áno, na hárku nie.</strong>
        Druhá strana rozdielu — ľahko sa na ňu zabudne.</div>
      <div class="scroll-x"><table class="data">${hlavicka}
        <tbody>${lenVApp.map(x => `<tr>
          <td>${esc(x.osoba.priezvisko)} ${esc(x.osoba.meno)}</td>
          <td class="num">${esc(x.osoba.kod_dochadzka ?? "—")}</td>
          <td class="num gap">0</td><td class="num">${x.pocet}</td>
          <td class="num"><strong>+${x.pocet}</strong></td>
        </tr>`).join("")}</tbody></table></div>` : ""}

    ${nesparovane.length ? `
      <div class="warnbox" style="margin-top:14px"><strong>${mnoho(nesparovane.length,
        ["meno sa nespárovalo", "mená sa nespárovali", "mien sa nespárovalo"])}.</strong>
        Hárok pozná mená, appka osobné čísla — priezvisko bez mena sa priradí, len keď je
        v menoslove jediné. Doplň meno na hárku alebo človeka do menoslovu.</div>
      <ul class="zoznam-mien">${nesparovane.map(x => `<li>${esc(x.meno)}
        <span class="hint">· ${x.pocet}× · ${x.ako === "viacero"
          ? "také priezvisko majú viacerí" : "v menoslove nie je"}</span></li>`).join("")}</ul>` : ""}

    ${sedia.length ? `
      <details style="margin-top:16px">
        <summary class="btn">${mnoho(sedia.length, ["riadok sedí", "riadky sedia", "riadkov sedí"])}</summary>
        <div class="scroll-x" style="margin-top:12px"><table class="data">${hlavicka}
          <tbody>${sedia.map(riadok).join("")}</tbody></table></div>
      </details>` : ""}
  </div>`}
</section>`
  }));
}

/* Vkladanie chodí POSTom, ale obrazovka je tá istá — nič sa neukladá,
   je to výpočet na jedno pozretie. */
export const porovnaj = zobraz;
