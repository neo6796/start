/* Nastavenia rozúčtovania — percentá, DPH a zákonný strop (koncept 6.1, 6.2).

   Všetko tu má **platnosť od dátumu**, nie jednu hodnotu. Dôvod je ten istý,
   pre ktorý sa cena odfotí na objednávku: keď ministerstvo v septembri zmení
   stravné, august sa tým nesmie prepočítať. Podklad, ktorý už odišiel na
   mzdy, musí ostať taký, aký odišiel.

   Preto sa nič neprepisuje — pridáva sa nová sada s dátumom, odkedy platí,
   a staré riadky ostávajú. Uzávierka si vždy vypýta hodnoty ku dňu obeda.

   Zadáva sa **stravné, nie strop**. Je to o krok navyše, ale správny: 8,30 €
   je číslo, ktoré ministerstvo vyhlási a účtovníčka podá; 4,57 € by musel
   niekto vypočítať a pri každej zmene prepočítať znova. Appka odvodený strop
   ukáže hneď vedľa, aby sa dal skontrolovať. */

import { stranka, esc } from "./html.js";
import { bazen, jeden, vsetky, zapis } from "./db.js";
import { dnes, dlhy } from "./datum.js";
import { PREDVOLENE, nastavenieSedi, zEur, eur, naCenty } from "./peniaze.js";

/* Kľúč, popis, tvar. Poradie je poradím na obrazovke. */
const POLIA = [
  ["zamestnavatel_pct", "Príspevok zamestnávateľa", "pct",
   "Zákonné minimum je 55 % z ceny bez DPH."],
  ["stravnik_od_pct", "Podiel stravníka — spodná hranica", "pct",
   "V štandardnom modeli je to celý jeho podiel."],
  ["stravnik_do_pct", "Podiel stravníka — horná hranica", "pct",
   "Platí len v ekonomickom modeli: nad ňu jeho podiel nevystúpi."],
  ["dph_stravnik_pct", "DPH k podielu stravníka", "pct",
   "Sociálny fond sa počíta bez DPH; DPH sa pripočítava len k podielu stravníka."],
  ["stravne_5_12", "Stravné pri pracovnej ceste 5–12 h", "eur",
   "Vyhlasuje ministerstvo. Zákonný strop príspevku je 55 % z neho — appka ho dopočíta."],
  ["strop_zapnuty", "Uplatňovať zákonný strop", "ano",
   "Keď zasiahne, appka to napíše. Tichý strop je najhorší možný."]
];

const jePct = k => POLIA.find(p => p[0] === k)?.[2] === "pct";

/* ---------- čítanie ---------- */

/* Hodnoty platné ku dňu. Berie sa posledná sada, ktorá začala platiť najneskôr
   v ten deň — takže obed z augusta počíta podľa augustových pravidiel aj
   vtedy, keď sa uzávierka robí v septembri. */
export async function platneKu(datum) {
  const r = await vsetky(`
    SELECT DISTINCT ON (kluc) kluc, hodnota
      FROM nastavenie WHERE plati_od <= $1
     ORDER BY kluc, plati_od DESC`, [datum]);

  const von = { ...PREDVOLENE };
  for (const { kluc, hodnota } of r) {
    if (!(kluc in von)) continue;
    von[kluc] = typeof PREDVOLENE[kluc] === "boolean" ? hodnota === "1" : Number(hodnota);
  }
  return von;
}

/* Celá história, po dátumoch — kvôli tomu sa to takto vedie. */
async function historia() {
  const r = await vsetky("SELECT kluc, plati_od::text AS od, hodnota FROM nastavenie ORDER BY plati_od DESC, kluc");
  const podlaDna = new Map();
  for (const x of r) {
    if (!podlaDna.has(x.od)) podlaDna.set(x.od, {});
    podlaDna.get(x.od)[x.kluc] = x.hodnota;
  }
  return [...podlaDna.entries()];
}

/* Odvodený strop — ukazuje sa vedľa stravného, aby sa dal skontrolovať. */
const stropZo = n => naCenty(Math.round(zEur(n.stravne_5_12) * n.zamestnavatel_pct / 100));

/* ---------- obrazovka ---------- */

export async function zobraz(k) {
  const dnesJe = dnes();
  const teraz = await platneKu(dnesJe);
  const minule = await historia();
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");

  const hodnota = (kluc, n) => {
    const v = n[kluc];
    if (typeof PREDVOLENE[kluc] === "boolean") return v ? "áno" : "nie";
    if (jePct(kluc)) return `${v} %`;
    return eur(naCenty(zEur(v)));
  };

  const pole = ([kluc, popis, tvar, hint]) => {
    const v = teraz[kluc];
    const vstup = tvar === "ano"
      ? `<label class="check"><input type="checkbox" id="p-${kluc}" name="${kluc}" value="1"${v ? " checked" : ""}>
           <span>uplatňovať</span></label>`
      : `<input type="number" id="p-${kluc}" name="${kluc}" required
           step="${tvar === "eur" ? "0.01" : "0.1"}" min="0"
           ${tvar === "pct" ? 'max="100"' : ""} value="${esc(String(v))}">`;
    return `<div class="field">
      <label for="p-${kluc}">${esc(popis)}</label>
      ${vstup}
      <p class="hint">${esc(hint)}</p>
    </div>`;
  };

  k.html(k.odp, 200, stranka({
    titulok: "Rozúčtovanie", osoba: k.osoba, cesta: "/nastavenia", verzia: k.verzia,
    obsah: `
<section class="wrap">
  <div class="screen-head">
    <h2>Rozúčtovanie</h2>
    <span class="who">platné dnes</span>
  </div>
  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  <div class="card">
    <div class="card-head"><h3>Čo platí teraz</h3></div>
    <div class="scroll-x"><table class="data">
      <tbody>
        ${POLIA.map(([kluc, popis]) => `<tr>
          <td>${esc(popis)}</td>
          <td class="num"><strong>${esc(hodnota(kluc, teraz))}</strong></td>
        </tr>`).join("")}
        <tr class="sucet">
          <td>Zákonný strop príspevku <span class="hint">— dopočítaný</span></td>
          <td class="num"><strong>${teraz.strop_zapnuty ? eur(stropZo(teraz)) : "neuplatňuje sa"}</strong></td>
        </tr>
      </tbody>
    </table></div>
    <p class="hint" style="margin:12px 0 0">Strop zasiahne až vtedy, keď cena obeda
      bez DPH prekročí celé stravné — percento je na oboch stranách rovnaké, takže sa
      vykráti. Pri dnešných cenách (najdrahšia jedáleň 7,20 € s DPH) nezasiahne.</p>
  </div>

  <form method="post" action="/nastavenia" class="card">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <div class="card-head"><h3>Nová sada</h3>
      <span class="hint">stará sa neprepíše</span></div>

    <div class="warnbox">Hodnoty sa nemenia, pridávajú sa nové s dátumom, odkedy platia.
      Mesiace spočítané podľa starých pravidiel sa tým nehýbu — a to je celý zmysel:
      podklad, ktorý už odišiel na mzdy, musí ostať taký, aký odišiel.</div>

    <div class="field" style="max-width:260px">
      <label for="p-od">Platí od</label>
      <input type="date" id="p-od" name="plati_od" required value="${esc(dnesJe)}">
      <p class="hint">Obvykle prvý deň mesiaca.</p>
    </div>

    <div class="hromadne">${POLIA.map(pole).join("")}</div>

    <div class="btn-row"><button class="btn primary" type="submit">Uložiť novú sadu</button></div>
  </form>

  ${minule.length ? `<div class="card">
    <div class="card-head"><h3>História</h3>
      <span class="hint">podľa čoho sa počítali minulé mesiace</span></div>
    <div class="scroll-x"><table class="data">
      <thead><tr><th>Platí od</th>
        ${POLIA.map(([, popis]) => `<th class="num">${esc(popis)}</th>`).join("")}</tr></thead>
      <tbody>${minule.map(([od, sada]) => `<tr>
        <td>${esc(dlhy(od))}</td>
        ${POLIA.map(([kluc]) => `<td class="num">${sada[kluc] === undefined
          ? '<span class="hint">—</span>'
          : esc(hodnota(kluc, { [kluc]: typeof PREDVOLENE[kluc] === "boolean"
              ? sada[kluc] === "1" : Number(sada[kluc]) }))}</td>`).join("")}
      </tr>`).join("")}</tbody>
    </table></div>
  </div>` : ""}
</section>`
  }));
}

/* ---------- uloženie ---------- */

export async function uloz(k) {
  const spat = (kluc, text) => k.inam(k.odp, `/nastavenia?${kluc}=` + encodeURIComponent(text));
  const od = (k.data.plati_od ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(od)) return spat("chyba", "Dátum treba vyplniť.");

  const nova = {};
  for (const [kluc, popis, tvar] of POLIA) {
    if (tvar === "ano") { nova[kluc] = k.data[kluc] === "1"; continue; }
    const v = Number(String(k.data[kluc] ?? "").replace(",", "."));
    if (!Number.isFinite(v) || v < 0) return spat("chyba", `„${popis}" nie je číslo.`);
    if (tvar === "pct" && v > 100) return spat("chyba", `„${popis}" nemôže byť viac než 100 %.`);
    nova[kluc] = v;
  }

  /* Ochrana musí zabrať tu, pri ukladaní — nie až pri uzávierke, keď sa
     mesiac nedá spočítať a nikto nevie prečo. */
  const zle = nastavenieSedi(nova);
  if (zle) return spat("chyba", zle);

  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    for (const [kluc] of POLIA)
      await klient.query(`
        INSERT INTO nastavenie (kluc, plati_od, hodnota) VALUES ($1,$2,$3)
        ON CONFLICT (kluc, plati_od) DO UPDATE SET hodnota = EXCLUDED.hodnota`,
        [kluc, od, typeof nova[kluc] === "boolean" ? (nova[kluc] ? "1" : "0") : String(nova[kluc])]);
    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    return spat("chyba", "Neuložilo sa nič: " + e.message);
  }
  klient.release();

  await zapis(k.osoba.id, "nastavenie.rozuctovanie", { plati_od: od, ...nova });
  return spat("sprava", `Uložené — platí od ${dlhy(od)}. ` +
    (nova.strop_zapnuty ? `Zákonný strop vychádza na ${eur(stropZo(nova))}.` : "Strop sa neuplatňuje."));
}
