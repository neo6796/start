/* Ľudia — zoznam, import menoslovu, zaradenie.

   Import nesie len identitu: osobné číslo, priezvisko, meno. Firma, vzťah,
   tím, prevádzka a jedáleň sa vyberajú tu z rozbaľovacích zoznamov
   (koncept 1.3b). Dôvod je praktický: v Exceli sa tie väzby píšu ako text,
   preklep založí druhú „firmu" a nikto si to nevšimne.

   Predák sa tu nenastavuje — patrí tímu (koncept 1.2). Stĺpec „Predák"
   v zozname je len na čítanie, ukazuje predáka toho tímu, v ktorom človek je. */

import { stranka, esc, meno, mnoho } from "./html.js";
import { bazen, dopyt, jeden, vsetky, zapis } from "./db.js";

/* ---------- zoznam ---------- */

const VZTAHY = [["", "—"], ["pp", "pracovný pomer"], ["zivnostnik", "živnostník"]];
const nazovVztahu = v => (VZTAHY.find(x => x[0] === (v ?? "")) ?? ["", "—"])[1];

async function ciselniky() {
  const [firmy, timy, prevadzky, jedalne] = await Promise.all([
    vsetky("SELECT id, nazov FROM firma WHERE aktivna ORDER BY nazov"),
    vsetky("SELECT id, nazov FROM tim WHERE aktivny ORDER BY nazov"),
    vsetky("SELECT id, nazov FROM prevadzka WHERE aktivna ORDER BY nazov"),
    vsetky("SELECT id, nazov FROM poskytovatel WHERE aktivny ORDER BY nazov")
  ]);
  return { firmy, timy, prevadzky, jedalne };
}

function vyber(nazov, zoznam, vybrane, prazdne = "—") {
  return `<select name="${nazov}" id="p-${nazov}">
    <option value="">${esc(prazdne)}</option>
    ${zoznam.map(z => `<option value="${z.id}"${Number(vybrane) === z.id ? " selected" : ""}>${esc(z.nazov)}</option>`).join("")}
  </select>`;
}

export async function zoznam(k) {
  const iba = k.url.searchParams.get("iba");           // bez-zaradenia | predaci | null
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");

  const podmienky = ["o.aktivny"];
  if (iba === "bez-zaradenia") podmienky.push("(o.firma_id IS NULL OR o.tim_id IS NULL)");
  if (iba === "predaci") podmienky.push("o.je_predak");

  const ludia = await vsetky(`
    SELECT o.*, f.nazov AS firma, t.nazov AS tim, p.nazov AS prevadzka, j.nazov AS jedalen,
           pr.priezvisko || ' ' || pr.meno AS predak
      FROM osoba o
      LEFT JOIN firma f        ON f.id  = o.firma_id
      LEFT JOIN tim   t        ON t.id  = o.tim_id
      LEFT JOIN prevadzka p    ON p.id  = o.prevadzka_id
      LEFT JOIN poskytovatel j ON j.id  = o.poskytovatel_id
      LEFT JOIN osoba pr       ON pr.id = t.predak_id
     WHERE ${podmienky.join(" AND ")}
     ORDER BY o.priezvisko, o.meno`);

  const s = await jeden(`
    SELECT count(*)::int AS spolu,
           count(*) FILTER (WHERE je_predak)::int AS predakov,
           count(*) FILTER (WHERE je_admin)::int AS spravcov,
           count(*) FILTER (WHERE firma_id IS NULL OR tim_id IS NULL)::int AS bez_zaradenia
      FROM osoba WHERE aktivny`);

  const c = await ciselniky();

  const odznaky = o => [
    o.je_admin ? '<span class="badge adm">správca</span>' : "",
    o.je_predak ? '<span class="badge lead">predák</span>' : "",
    o.vztah === "zivnostnik" ? '<span class="badge ziv">živnostník</span>' : ""
  ].join("");

  const filter = (kluc, popis) =>
    `<a class="btn"${iba === kluc ? ' aria-pressed="true"' : ""} href="/ludia${kluc ? `?iba=${kluc}` : ""}">${esc(popis)}</a>`;

  k.html(k.odp, 200, stranka({
    titulok: "Ľudia", osoba: k.osoba, cesta: "/ludia", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Ľudia</h2>
    <span class="who">${mnoho(s.spolu, ["aktívny", "aktívni", "aktívnych"])}
      · ${mnoho(s.predakov, ["predák", "predáci", "predákov"])}
      · ${mnoho(s.spravcov, ["správca", "správcovia", "správcov"])}</span>
  </div>

  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  ${s.bez_zaradenia > 0 && iba !== "bez-zaradenia"
    ? `<div class="warnbox">Bez zaradenia: ${mnoho(s.bez_zaradenia, ["človek", "ľudia", "ľudí"])}.
        Kým človek nemá firmu a tím, neobjaví sa v matici predáka.
        <a href="/ludia?iba=bez-zaradenia">Ukázať ich</a>.</div>` : ""}

  <form method="post" action="/ludia/hromadne" class="card">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <div class="card-head">
      <h3>Zoznam</h3>
      <span class="hint">${ludia.length}</span>
      <div class="btn-row" style="margin-left:auto">
        ${filter("", "Všetci")}${filter("bez-zaradenia", "Bez zaradenia")}${filter("predaci", "Predáci")}
      </div>
    </div>

    ${ludia.length === 0
      ? `<p class="hint" style="margin:0">Nikto nevyhovuje. Menoslov sa dá vložiť nižšie.</p>`
      : `<div class="scroll-x"><table class="data">
          <thead><tr>
            <th class="chk"><input type="checkbox" id="vsetci" aria-label="Označiť všetkých"></th>
            <th>Osobné číslo</th><th>Priezvisko a meno</th><th>Firma</th><th>Vzťah</th>
            <th>Tím</th><th>Predák</th><th>Prevádzka</th><th>Jedáleň</th><th></th>
          </tr></thead>
          <tbody>${ludia.map(o => `<tr${o.je_admin ? ' class="is-adm"' : o.je_predak ? ' class="is-lead"' : ""}>
            <td class="chk"><input type="checkbox" name="kto" value="${o.id}"
                 aria-label="${esc(o.priezvisko)} ${esc(o.meno)}"></td>
            <td class="num">${esc(o.kod_dochadzka ?? "—")}</td>
            <td><a href="/osoba?id=${o.id}">${esc(o.priezvisko)} ${esc(o.meno)}</a>${odznaky(o)}</td>
            <td${o.firma ? "" : ' class="gap"'}>${esc(o.firma ?? "chýba")}</td>
            <td>${esc(nazovVztahu(o.vztah))}</td>
            <td${o.tim ? "" : ' class="gap"'}>${esc(o.tim ?? "chýba")}</td>
            <td>${esc(o.predak ?? "—")}</td>
            <td>${esc(o.prevadzka ?? "—")}</td>
            <td>${esc(o.jedalen ?? "—")}</td>
            <td><a class="btn" href="/osoba?id=${o.id}">Upraviť</a></td>
          </tr>`).join("")}</tbody>
         </table></div>
         <p class="swipe-hint">Tabuľka sa posúva vbok</p>

         <div class="note">
           <strong>Hromadné priradenie označeným.</strong>
           Vyplňte len to, čo sa má nastaviť; prázdne polia sa nedotknú ničoho.
         </div>
         <div class="hromadne">
           <div class="field"><label for="p-firma_id">Firma</label>${vyber("firma_id", c.firmy, "", "nemeniť")}</div>
           <div class="field"><label for="p-tim_id">Tím</label>${vyber("tim_id", c.timy, "", "nemeniť")}</div>
           <div class="field"><label for="p-prevadzka_id">Prevádzka</label>${vyber("prevadzka_id", c.prevadzky, "", "nemeniť")}</div>
           <div class="field"><label for="p-poskytovatel_id">Jedáleň</label>${vyber("poskytovatel_id", c.jedalne, "", "nemeniť")}</div>
           <div class="field"><label for="p-vztah">Vzťah</label>
             <select name="vztah" id="p-vztah">
               <option value="">nemeniť</option>
               ${VZTAHY.filter(v => v[0]).map(v => `<option value="${v[0]}">${esc(v[1])}</option>`).join("")}
             </select></div>
         </div>
         <button class="btn primary" type="submit">Priradiť označeným</button>`}
  </form>

  <div class="card">
    <div class="card-head"><h3>Import menoslovu</h3></div>
    <form method="post" action="/ludia/import">
      <input type="hidden" name="znamka" value="${esc(k.csrf)}">
      <div class="field">
        <label for="p-riadky">Osobné číslo · priezvisko · meno — jeden človek na riadok</label>
        <textarea id="p-riadky" name="riadky" rows="8" spellcheck="false"
          placeholder="1042;Kováč;Jozef&#10;2117;Baláž;Peter"></textarea>
        <p class="hint">Oddeľovač je bodkočiarka, tabulátor alebo stredník z Excelu — appka si poradí
          s každým. Osobné číslo sa berie ako text, takže úvodné nuly ostanú.</p>
      </div>
      <button class="btn primary" type="submit">Načítať</button>
    </form>
    <div class="note">
      <strong>Import prepíše len to, čo sám priniesol.</strong>
      Meno zadané ručne v appke ostane, aj keby v súbore bolo iné — inak by oprava
      priezviska vydržala do najbližšieho importu a nikto by nevedel prečo.
      Väzby sa importom nemenia nikdy.
    </div>
  </div>
</section>

<script>
/* Jediný skript na tejto obrazovke: hlavička označí všetkých naraz. */
document.getElementById("vsetci")?.addEventListener("change", e => {
  for (const p of document.querySelectorAll('input[name="kto"]')) p.checked = e.target.checked;
});
</script>`
  }));
}

/* ---------- import ---------- */

/* Riadok môže prísť z Excelu, z textového súboru alebo z e-mailu.
   Oddeľovač preto neurčujeme, len ho nájdeme. */
export function rozober(riadok) {
  const t = riadok.trim();
  if (!t) return null;
  const casti = t.includes("\t") ? t.split("\t")
              : t.includes(";")  ? t.split(";")
              : t.includes(",")  ? t.split(",")
              : t.split(/\s{2,}|\s+/);
  const [kod, priezvisko, ...zvysok] = casti.map(c => c.trim());
  const meno = zvysok.join(" ").trim();
  if (!kod || !priezvisko || !meno) return { chyba: t };
  if (!/^[0-9A-Za-z._-]+$/.test(kod)) return { chyba: t };
  return { kod, priezvisko, meno };
}

export async function importuj(k) {
  const riadky = (k.data.riadky ?? "").split(/\r?\n/);
  const zle = [], pridani = [], zmeneni = [], nedotknuti = [], rovnaki = [];
  const videne = new Set();

  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    for (const r of riadky) {
      const v = rozober(r);
      if (!v) continue;
      if (v.chyba) { zle.push(v.chyba); continue; }
      videne.add(v.kod);

      const je = (await klient.query("SELECT * FROM osoba WHERE kod_dochadzka = $1", [v.kod])).rows[0];

      if (!je) {
        await klient.query(
          `INSERT INTO osoba (kod_dochadzka, priezvisko, meno, povod_mena, import_kedy)
           VALUES ($1,$2,$3,'import',now())`, [v.kod, v.priezvisko, v.meno]);
        pridani.push(`${v.priezvisko} ${v.meno}`);
        continue;
      }
      if (je.priezvisko === v.priezvisko && je.meno === v.meno) {
        await klient.query("UPDATE osoba SET import_kedy = now() WHERE id = $1", [je.id]);
        rovnaki.push(je.id);
        continue;
      }
      /* Pravidlo o pôvode: ručne opravené meno import neprepíše. */
      if (je.povod_mena === "rucne") {
        nedotknuti.push(`${v.kod}: v appke „${je.priezvisko} ${je.meno}", v súbore „${v.priezvisko} ${v.meno}"`);
        await klient.query("UPDATE osoba SET import_kedy = now() WHERE id = $1", [je.id]);
        continue;
      }
      await klient.query(
        `UPDATE osoba SET priezvisko = $2, meno = $3, import_kedy = now() WHERE id = $1`,
        [je.id, v.priezvisko, v.meno]);
      zmeneni.push(`${je.priezvisko} ${je.meno} → ${v.priezvisko} ${v.meno}`);
    }
    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    return k.inam(k.odp, "/ludia?chyba=" + encodeURIComponent("Import sa neuložil: " + e.message));
  }
  klient.release();

  /* Kto v appke je, ale v súbore nebol. Nič sa s ním nerobí — len sa to povie.
     Automatické zneaktívnenie by pri neúplnom súbore odstavilo pol firmy. */
  const chybajuci = videne.size
    ? await vsetky(`SELECT kod_dochadzka, priezvisko, meno FROM osoba
                     WHERE aktivny AND kod_dochadzka IS NOT NULL
                       AND NOT (kod_dochadzka = ANY($1)) ORDER BY priezvisko`, [[...videne]])
    : [];

  await zapis(k.osoba.id, "ludia.import", {
    pridanych: pridani.length, zmenenych: zmeneni.length,
    nedotknutych: nedotknuti.length, rovnakych: rovnaki.length, chybnych: zle.length
  });

  const casti = [];
  if (pridani.length) casti.push(`pribudlo ${pridani.length}`);
  if (zmeneni.length) casti.push(`opravených mien ${zmeneni.length}`);
  if (rovnaki.length) casti.push(`bez zmeny ${rovnaki.length}`);
  const sprava = casti.length ? `Import hotový: ${casti.join(", ")}.` : "Import nepriniesol nič nové.";

  const varovania = [];
  if (nedotknuti.length)
    varovania.push(`Ručne zadané mená sa neprepísali (${nedotknuti.length}): ${nedotknuti.join(" · ")}`);
  if (zle.length)
    varovania.push(`Nezrozumiteľné riadky (${zle.length}): ${zle.slice(0, 5).join(" · ")}${zle.length > 5 ? " …" : ""}`);
  if (chybajuci.length)
    varovania.push(`V súbore nebolo ${mnoho(chybajuci.length, ["aktívny človek", "aktívni ľudia", "aktívnych ľudí"])}: ` +
      chybajuci.slice(0, 10).map(c => `${c.priezvisko} ${c.meno}`).join(", ") +
      `${chybajuci.length > 10 ? " …" : ""}. Nikoho sme nezneaktívnili — to je na vás.`);

  k.inam(k.odp, "/ludia?sprava=" + encodeURIComponent(sprava) +
    (varovania.length ? "&chyba=" + encodeURIComponent(varovania.join("  |  ")) : ""));
}

/* ---------- hromadné priradenie ---------- */

/* Predák tu nie je zámerne — patrí tímu (koncept 1.2), nastavuje sa
   v číselníku tímov. Nastaviť ho človeku by znamenalo, že dvaja ľudia
   v tom istom tíme môžu mať dvoch rôznych. */
const VAZBY = {
  firma_id: ["firma", "Firma"], tim_id: ["tim", "Tím"],
  prevadzka_id: ["prevadzka", "Prevádzka"], poskytovatel_id: ["poskytovatel", "Jedáleň"]
};

/* Firma delí peniaze. Zmeniť ju uprostred mesiaca by prerozdelilo náklad,
   ktorý už vznikol — preto až od prvého (rozhodnutie z 1.3b). */
async function firmaSaSmieMenit(idcka) {
  const r = await jeden(
    `SELECT count(*)::int AS n FROM objednavka
      WHERE osoba_id = ANY($1) AND datum >= date_trunc('month', current_date)`, [idcka]);
  return r.n === 0;
}

export async function hromadne(k) {
  const kto = [].concat(k.data.kto ?? []).flatMap(v => String(v).split(","))
                .map(Number).filter(Number.isInteger);
  if (!kto.length) return k.inam(k.odp, "/ludia?chyba=" + encodeURIComponent("Nikto nebol označený."));

  const zmeny = [], hodnoty = [];
  for (const [pole] of Object.entries(VAZBY)) {
    const v = (k.data[pole] ?? "").trim();
    if (!v) continue;
    hodnoty.push(Number(v));
    zmeny.push(`${pole} = $${hodnoty.length}`);
  }
  const vztah = (k.data.vztah ?? "").trim();
  if (vztah) { hodnoty.push(vztah); zmeny.push(`vztah = $${hodnoty.length}`); }

  if (!zmeny.length)
    return k.inam(k.odp, "/ludia?chyba=" + encodeURIComponent("Nebolo čo nastaviť — všetky polia ostali na „nemeniť\"."));

  if (k.data.firma_id && !(await firmaSaSmieMenit(kto)))
    return k.inam(k.odp, "/ludia?chyba=" + encodeURIComponent(
      "Firmu nemeníme uprostred mesiaca — niekto z označených už má v tomto mesiaci objednávku. " +
      "Zmena firmy sa dá spraviť k prvému dňu mesiaca."));

  hodnoty.push(kto);
  const r = await dopyt(`UPDATE osoba SET ${zmeny.join(", ")} WHERE id = ANY($${hodnoty.length})`, hodnoty);
  await zapis(k.osoba.id, "ludia.hromadne", { kolko: r.rowCount, zmeny: zmeny.join(", ") });

  k.inam(k.odp, "/ludia?sprava=" + encodeURIComponent(
    `Nastavené ${mnoho(r.rowCount, ["človeku", "ľuďom", "ľuďom"])}.`));
}

/* ---------- jeden človek ---------- */

export async function detail(k) {
  const id = Number(k.url.searchParams.get("id"));
  const o = await jeden("SELECT * FROM osoba WHERE id = $1", [id]);
  if (!o) return k.inam(k.odp, "/ludia?chyba=" + encodeURIComponent("Taký človek tu nie je."));

  const c = await ciselniky();
  const chyba = k.url.searchParams.get("chyba");
  const sprava = k.url.searchParams.get("sprava");

  const prep = (kluc, popis, zapnute, vysvetlenie) => `
    <label class="check" style="margin-bottom:10px">
      <input type="checkbox" name="${kluc}" value="1"${zapnute ? " checked" : ""}>
      <span>${esc(popis)}${vysvetlenie ? ` <span class="hint">— ${esc(vysvetlenie)}</span>` : ""}</span>
    </label>`;

  k.html(k.odp, 200, stranka({
    titulok: `${o.priezvisko} ${o.meno}`, osoba: k.osoba, cesta: "/ludia", verzia: k.verzia,
    obsah: `
<section class="wrap">
  <div class="screen-head">
    <h2>${esc(o.priezvisko)} ${esc(o.meno)}</h2>
    <span class="who">osobné číslo ${esc(o.kod_dochadzka ?? "—")}</span>
  </div>
  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  <form method="post" action="/osoba">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <input type="hidden" name="id" value="${o.id}">

    <div class="card">
      <div class="card-head"><h3>Identita</h3></div>
      <div class="grid-2">
        <div>
          <div class="field"><label for="p-priezvisko">Priezvisko</label>
            <input type="text" id="p-priezvisko" name="priezvisko" value="${esc(o.priezvisko)}" required></div>
          <div class="field"><label for="p-meno">Meno</label>
            <input type="text" id="p-meno" name="meno" value="${esc(o.meno)}" required></div>
        </div>
        <div>
          <div class="field"><label for="p-kod_dochadzka">Osobné číslo</label>
            <input type="text" id="p-kod_dochadzka" name="kod_dochadzka" value="${esc(o.kod_dochadzka ?? "")}">
            <p class="hint">Podľa neho sa človek prihlasuje a podľa neho ho nájde import.</p></div>
          <div class="field"><label for="p-kod_mzdy">Mzdové číslo</label>
            <input type="text" id="p-kod_mzdy" name="kod_mzdy" value="${esc(o.kod_mzdy ?? "")}">
            <p class="hint">Ak sa líši od dochádzkového. Použije sa v mzdovom podklade.</p></div>
        </div>
      </div>
      <p class="hint" style="margin:0">Pôvod mena: <strong>${o.povod_mena === "import" ? "import" : "ručne"}</strong>.
        Po ručnej oprave ho import už neprepíše.</p>
    </div>

    <div class="card">
      <div class="card-head"><h3>Zaradenie</h3></div>
      <div class="grid-2">
        <div>
          <div class="field"><label for="p-firma_id">Firma</label>${vyber("firma_id", c.firmy, o.firma_id)}
            <p class="hint">Delí peniaze. Mení sa k prvému dňu mesiaca.</p></div>
          <div class="field"><label for="p-vztah">Vzťah</label>
            <select name="vztah" id="p-vztah">
              ${VZTAHY.map(v => `<option value="${v[0]}"${(o.vztah ?? "") === v[0] ? " selected" : ""}>${esc(v[1])}</option>`).join("")}
            </select></div>
          <div class="field"><label for="p-tim_id">Tím</label>${vyber("tim_id", c.timy, o.tim_id)}
            <p class="hint">Určuje, kto za neho objednáva. Predáka nesie tím —
              nastavuje sa v <a href="/ciselniky">Číselníkoch</a>.</p></div>
        </div>
        <div>
          <div class="field"><label for="p-prevadzka_id">Prevádzka</label>${vyber("prevadzka_id", c.prevadzky, o.prevadzka_id)}</div>
          <div class="field"><label for="p-poskytovatel_id">Jedáleň</label>${vyber("poskytovatel_id", c.jedalne, o.poskytovatel_id)}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Roly a príznaky</h3></div>
      ${prep("je_predak", "Predák", o.je_predak, "objednáva za svoj tím")}
      ${prep("je_admin", "Správca", o.je_admin, "číselníky, ľudia, uzávierka")}
      ${prep("platca_dph", "Platiteľ DPH", o.platca_dph, "týka sa len živnostníkov")}
      ${prep("aktivny", "Aktívny", o.aktivny, "neaktívny sa neobjaví nikde, ale história ostáva")}
    </div>

    <div class="btn-row">
      <button class="btn primary" type="submit">Uložiť</button>
      <a class="btn" href="/ludia">Späť na zoznam</a>
    </div>
  </form>
</section>`
  }));
}

export async function uloz(k) {
  const id = Number(k.data.id);
  const o = await jeden("SELECT * FROM osoba WHERE id = $1", [id]);
  if (!o) return k.inam(k.odp, "/ludia?chyba=" + encodeURIComponent("Taký človek tu nie je."));

  const naspat = t => k.inam(k.odp, `/osoba?id=${id}&chyba=` + encodeURIComponent(t));

  const priezvisko = (k.data.priezvisko ?? "").trim();
  const meno_ = (k.data.meno ?? "").trim();
  if (!priezvisko || !meno_) return naspat("Priezvisko aj meno treba vyplniť.");

  const novaFirma = k.data.firma_id ? Number(k.data.firma_id) : null;
  if (novaFirma !== o.firma_id && !(await firmaSaSmieMenit([id])))
    return naspat("Firmu nemeníme uprostred mesiaca — tento človek už má v tomto mesiaci objednávku. " +
                  "Zmena sa dá spraviť k prvému dňu mesiaca.");

  /* Ručná zmena mena zdvihne príznak pôvodu — od tejto chvíle ho import nechá tak. */
  const rucnaZmenaMena = priezvisko !== o.priezvisko || meno_ !== o.meno;
  const povod = rucnaZmenaMena ? "rucne" : o.povod_mena;

  const cislo = v => (k.data[v] ?? "").trim() ? Number(k.data[v]) : null;
  const zaskrtnute = v => k.data[v] === "1";

  try {
    await dopyt(`
      UPDATE osoba SET priezvisko=$2, meno=$3, kod_dochadzka=$4, kod_mzdy=$5,
             firma_id=$6, vztah=$7, tim_id=$8, prevadzka_id=$9,
             poskytovatel_id=$10, je_predak=$11, je_admin=$12, platca_dph=$13,
             aktivny=$14, povod_mena=$15
       WHERE id=$1`, [
      id, priezvisko, meno_,
      (k.data.kod_dochadzka ?? "").trim() || null,
      (k.data.kod_mzdy ?? "").trim() || null,
      novaFirma, (k.data.vztah ?? "").trim() || null, cislo("tim_id"),
      cislo("prevadzka_id"), cislo("poskytovatel_id"),
      zaskrtnute("je_predak"), zaskrtnute("je_admin"), zaskrtnute("platca_dph"),
      zaskrtnute("aktivny"), povod
    ]);
  } catch (e) {
    return naspat(e.code === "23505"
      ? `Osobné číslo ${k.data.kod_dochadzka} už má niekto iný.`
      : `Nepodarilo sa uložiť: ${e.message}`);
  }

  /* Kto si zoberie sám sebe správcu, vyrobí appku bez správcu. */
  if (o.je_admin && !zaskrtnute("je_admin")) {
    const zvysok = await jeden("SELECT count(*)::int AS n FROM osoba WHERE je_admin AND aktivny");
    if (zvysok.n === 0) {
      await dopyt("UPDATE osoba SET je_admin = true WHERE id = $1", [id]);
      return naspat("Správcu sme nechali — bol by to posledný a appka by ostala bez správy. " +
                    "Najprv určte iného, potom tomuto rolu odoberte.");
    }
  }

  await zapis(k.osoba.id, "osoba.upravena", { id, kto: `${priezvisko} ${meno_}` });
  k.inam(k.odp, `/osoba?id=${id}&sprava=` + encodeURIComponent("Uložené."));
}
