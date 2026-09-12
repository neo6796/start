/* Ľudia — zoznam, import menoslovu, zaradenie.

   Import nesie identitu (osobné číslo, priezvisko, meno) a k nej to, čoho je
   menoslov skutočným zdrojom: **druh pomeru** a — cez hlavičky skupín
   `# --- Firma, prevádzka ---` — **firmu a prevádzku**.

   Nebezpečenstvo pri väzbách v texte je známe: „Vráble · Vrable · závod
   Vráble" by z jedného preklepu spravili tri prevádzky a rozbité súčty by sa
   ukázali až o dva mesiace pri uzávierke. Rozhodnutie 37 ho rieši tak, že
   import **neznáme hodnoty odmieta a nezakladá** — len ich vypíše. Tím,
   predáka a jedáleň menoslov nenesie vôbec; tie sa vyberajú z rozbaľovacích
   zoznamov, predák navyše patrí tímu (koncept 1.2).

   A dopĺňa len prázdne (rozhodnutie 38): čo už v appke je, sa neprepíše, len
   sa vypíše ako rozdiel.

   Predák sa tu nenastavuje — patrí tímu (koncept 1.2). Stĺpec „Predák"
   v zozname je len na čítanie, ukazuje predáka toho tímu, v ktorom človek je. */

import { stranka, esc, meno, mnoho } from "./html.js";
import { bazen, dopyt, jeden, vsetky, zapis } from "./db.js";
import { hashHesla, nahodneHeslo, najmenejZnakov, zrusOstatne } from "./relacia.js";
import { prehlad as prehladTimov } from "./timy.js";

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

/* Hľadanie a filtre. Pri stovke ľudí a rokoch neaktívnych záznamov je zoznam
   bez nich nepoužiteľný — a hlavne: bez prepínača stavu sa neaktívny človek
   nedá ani nájsť, ani vrátiť späť. */
const STAVY = [["aktivni", "aktívni"], ["neaktivni", "neaktívni"], ["vsetci", "všetci"]];
const POHLADY = [["", "všetkých"], ["bez-zaradenia", "bez zaradenia"],
                 ["predaci", "predákov"], ["zivnostnici", "živnostníkov"]];
const STROP = 300;

export async function zoznam(k) {
  const q = k.url.searchParams;
  const hladane = (q.get("hladaj") ?? "").trim();
  const stav = STAVY.some(x => x[0] === q.get("stav")) ? q.get("stav") : "aktivni";
  const pohlad = POHLADY.some(x => x[0] === q.get("pohlad")) ? q.get("pohlad") : "";
  const timId = Number(q.get("tim")) || null;
  const firmaId = Number(q.get("firma")) || null;
  const sprava = q.get("sprava");
  const chyba = q.get("chyba");

  const podmienky = [], hodnoty = [];
  if (stav === "aktivni") podmienky.push("o.aktivny");
  if (stav === "neaktivni") podmienky.push("NOT o.aktivny");
  if (pohlad === "bez-zaradenia") podmienky.push("(o.firma_id IS NULL OR o.tim_id IS NULL)");
  if (pohlad === "predaci") podmienky.push("EXISTS (SELECT 1 FROM tim_predak tp WHERE tp.osoba_id = o.id)");
  if (pohlad === "zivnostnici") podmienky.push("o.vztah = 'zivnostnik'");
  if (timId) { hodnoty.push(timId); podmienky.push(`o.tim_id = $${hodnoty.length}`); }
  if (firmaId) { hodnoty.push(firmaId); podmienky.push(`o.firma_id = $${hodnoty.length}`); }
  if (hladane) {
    /* Hľadá sa v priezvisku, mene aj osobnom čísle naraz — človek si nepamätá,
       ktoré z toho práve píše. unaccent tu nie je, tak aspoň bez ohľadu na
       veľkosť písmen. */
    hodnoty.push(`%${hladane}%`);
    const i = hodnoty.length;
    podmienky.push(`(o.priezvisko ILIKE $${i} OR o.meno ILIKE $${i}
                     OR o.kod_dochadzka ILIKE $${i} OR o.kod_mzdy ILIKE $${i})`);
  }
  const kde = podmienky.length ? `WHERE ${podmienky.join(" AND ")}` : "";

  const ludia = await vsetky(`
    SELECT o.*, f.nazov AS firma, t.nazov AS tim, p.nazov AS prevadzka, j.nazov AS jedalen,
           pr.priezvisko || ' ' || pr.meno AS predak,
           EXISTS (SELECT 1 FROM tim_predak tp WHERE tp.osoba_id = o.id) AS je_predak
      FROM osoba o
      LEFT JOIN firma f        ON f.id = o.firma_id
      LEFT JOIN tim   t        ON t.id = o.tim_id
      LEFT JOIN LATERAL (SELECT priezvisko, meno FROM tim_predak tp
                          JOIN osoba x ON x.id = tp.osoba_id
                         WHERE tp.tim_id = t.id AND NOT tp.zastupca
                         ORDER BY x.priezvisko LIMIT 1) pr ON true
      LEFT JOIN prevadzka p    ON p.id = o.prevadzka_id
      LEFT JOIN poskytovatel j ON j.id = o.poskytovatel_id
      ${kde}
     /* Správcovia hore, za nimi predáci, potom ostatní. Kto appku spravuje
        a kto za koho objednáva, sú tí, ktorých v zozname človek hľadá; zvyšok
        listuje podľa abecedy. */
     ORDER BY o.je_admin DESC,
              EXISTS (SELECT 1 FROM tim_predak tp WHERE tp.osoba_id = o.id) DESC,
              o.priezvisko, o.meno
     LIMIT ${STROP + 1}`, hodnoty);
  const orezane = ludia.length > STROP;
  if (orezane) ludia.length = STROP;

  const s = await jeden(`
    SELECT count(*) FILTER (WHERE aktivny)::int AS aktivnych,
           count(*) FILTER (WHERE NOT aktivny)::int AS neaktivnych,
           count(*) FILTER (WHERE aktivny AND EXISTS
             (SELECT 1 FROM tim_predak tp WHERE tp.osoba_id = osoba.id))::int AS predakov,
           count(*) FILTER (WHERE aktivny AND (firma_id IS NULL OR tim_id IS NULL))::int AS bez_zaradenia
      FROM osoba`);

  const c = await ciselniky();
  const timyVsetky = await vsetky("SELECT id, nazov FROM tim ORDER BY nazov");

  const odznaky = o => [
    o.aktivny ? "" : '<span class="badge">neaktívny</span>',
    o.je_admin ? '<span class="badge adm">správca</span>' : "",
    o.je_predak ? '<span class="badge lead">predák</span>' : "",
    o.vztah === "zivnostnik" ? '<span class="badge ziv">živnostník</span>' : ""
  ].join("");

  const moznosti = (zoznam, vybrane, prazdne) =>
    `<option value="">${esc(prazdne)}</option>` +
    zoznam.map(z => `<option value="${z.id}"${Number(vybrane) === z.id ? " selected" : ""}>${esc(z.nazov)}</option>`).join("");

  /* Filtre sa nesú ďalej, aby sa po hromadnom priradení človek vrátil tam,
     kde bol, a nie na začiatok zoznamu. */
  const stavZoznamu = q.toString().replace(/&?(sprava|chyba)=[^&]*/g, "").replace(/^&/, "");

  k.html(k.odp, 200, stranka({
    titulok: "Ľudia", osoba: k.osoba, cesta: "/ludia", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Ľudia</h2>
    <span class="who">${mnoho(s.aktivnych, ["aktívny", "aktívni", "aktívnych"])}
      · ${mnoho(s.neaktivnych, ["neaktívny", "neaktívni", "neaktívnych"])}
      · ${mnoho(s.predakov, ["predák", "predáci", "predákov"])}</span>
  </div>

  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  ${await prehladTimov()}

  ${s.bez_zaradenia > 0 && pohlad !== "bez-zaradenia"
    ? `<div class="warnbox">Bez zaradenia: ${mnoho(s.bez_zaradenia, ["človek", "ľudia", "ľudí"])}.
        Kým človek nemá firmu a tím, neobjaví sa v matici predáka.
        <a href="/ludia?pohlad=bez-zaradenia">Ukázať ich</a>.</div>` : ""}

  <form method="get" action="/ludia" class="card filtre">
    <div class="hromadne">
      <div class="field"><label for="f-hladaj">Hľadať</label>
        <input type="search" id="f-hladaj" name="hladaj" value="${esc(hladane)}"
               placeholder="priezvisko, meno alebo číslo"></div>
      <div class="field"><label for="f-stav">Stav</label>
        <select id="f-stav" name="stav">${STAVY.map(([v, t]) =>
          `<option value="${v}"${stav === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
      <div class="field"><label for="f-pohlad">Iba</label>
        <select id="f-pohlad" name="pohlad">${POHLADY.map(([v, t]) =>
          `<option value="${v}"${pohlad === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>
      <div class="field"><label for="f-tim">Tím</label>
        <select id="f-tim" name="tim">${moznosti(timyVsetky, timId, "všetky")}</select></div>
      <div class="field"><label for="f-firma">Firma</label>
        <select id="f-firma" name="firma">${moznosti(c.firmy, firmaId, "všetky")}</select></div>
    </div>
    <div class="btn-row">
      <button class="btn primary" type="submit">Hľadať</button>
      <a class="btn" href="/ludia">Zrušiť filtre</a>
    </div>
  </form>

  <form method="post" action="/ludia/hromadne" class="card">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <input type="hidden" name="spat" value="${esc(stavZoznamu)}">
    <div class="card-head">
      <h3>Zoznam</h3>
      <span class="hint">${ludia.length}${orezane ? ` z viac než ${STROP}` : ""}</span>
    </div>

    ${orezane ? `<div class="warnbox">Ukazujem prvých ${STROP}. Zúžte hľadanie —
      hromadné priradenie sa týka len označených, takže o nič neprídete.</div>` : ""}

    ${ludia.length === 0
      ? `<p class="hint" style="margin:0">Nikto nevyhovuje${hladane ? ` hľadaniu „${esc(hladane)}"` : ""}.
          ${stav === "aktivni" ? "Skúste prepnúť <em>Stav</em> na neaktívnych alebo na všetkých." : ""}</p>`
      : `<div class="scroll-x"><table class="data">
          <thead><tr>
            <th class="chk"><input type="checkbox" id="vsetci" aria-label="Označiť všetkých"></th>
            <th>Osobné číslo</th><th>Priezvisko a meno</th><th>Firma</th><th>Vzťah</th>
            <th>Tím</th><th>Prevádzka</th><th>Jedáleň</th><th></th>
          </tr></thead>
          <tbody>${ludia.map(o => `<tr${!o.aktivny ? ' class="is-off"'
              : o.je_admin ? ' class="is-adm"' : o.je_predak ? ' class="is-lead"' : ""}>
            <td class="chk"><input type="checkbox" name="kto" value="${o.id}"
                 aria-label="${esc(o.priezvisko)} ${esc(o.meno)}"></td>
            <td class="num${o.kod_dochadzka ? "" : " gap"}">${
              esc(o.kod_dochadzka ?? "chýba")}</td>
            <td><a href="/osoba?id=${o.id}">${esc(o.priezvisko)} ${esc(o.meno)}</a>${odznaky(o)}</td>
            <td${o.firma ? "" : ' class="gap"'}>${esc(o.firma ?? "chýba")}</td>
            <td>${esc(nazovVztahu(o.vztah))}</td>
            <td${o.tim ? "" : ' class="gap"'}>${esc(o.tim ?? "chýba")}
              ${o.predak ? `<span class="podriadok">predák ${esc(o.predak)}</span>` : ""}</td>
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
           <div class="field"><label for="p-aktivny">Stav</label>
             <select name="aktivny" id="p-aktivny">
               <option value="">nemeniť</option>
               <option value="1">aktívny</option>
               <option value="0">neaktívny</option>
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
        <p class="hint">Oddeľovač je bodkočiarka, tabulátor alebo čiarka — appka si poradí
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

/* Druh pomeru sa v menoslove píše skratkou. Nie je to voľný text — buď je to
   živnostník, alebo pracovný pomer, a rozdiel je v tom, kade tečú peniaze
   (koncept 6.2a): živnostník nie je v mzdovom podklade ani ako riadok s nulou. */
const VZTAHY_SKRATKY = {
  "z": "zivnostnik", "ž": "zivnostnik", "ziv": "zivnostnik", "živ": "zivnostnik",
  "zivnostnik": "zivnostnik", "živnostník": "zivnostnik", "szco": "zivnostnik",
  "p": "pp", "tpp": "pp", "pp": "pp", "hpp": "pp",
  "pracovny pomer": "pp", "pracovný pomer": "pp"
};
const akoVztah = s => VZTAHY_SKRATKY[String(s ?? "").trim().toLowerCase()] ?? null;

/* Hlavička skupiny: `--- PD;office ---`, s mrežou na začiatku aj bez nej.
   Firma vľavo, prevádzka vpravo — tak to menoslov aj píše, a oddeľuje ich
   bodkočiarkou alebo čiarkou, podľa toho, kto ho písal.

   Pomlčky sú súčasťou vzoru zámerne: bez nich by sa za hlavičku vyhlásil
   každý riadok s bodkočiarkou, teda každý človek. */
export function rozoberHlavicku(riadok) {
  const m = /^#?\s*-{2,}\s*(.+?)\s*-{2,}\s*$/.exec(riadok.trim());
  if (!m) return null;
  const [firma, prevadzka] = m[1].split(/[;,]/).map(x => x.trim());
  if (!firma) return null;
  return { firma, prevadzka: prevadzka || null };
}

/* Riadok môže prísť z Excelu, z textového súboru alebo z e-mailu.
   Oddeľovač preto neurčujeme, len ho nájdeme. */
export function rozober(riadok) {
  const t = riadok.trim();
  if (!t) return null;
  /* Poznámka, nie človek. Menoslov skopírovaný z hárku má medzi ľuďmi
     nadpisy stredísk; bez tohto by ich import hlásil ako nezrozumiteľné
     riadky a skutočné chyby by sa v tom šume stratili. */
  if (t.startsWith("#")) return null;
  const casti = t.includes("\t") ? t.split("\t")
              : t.includes(";")  ? t.split(";")
              : t.includes(",")  ? t.split(",")
              : t.split(/\s{2,}|\s+/);
  let [kod, priezvisko, ...zvysok] = casti.map(c => c.trim());

  /* Za menom môže nasledovať druh pomeru a za ním prevádzka:
         1001;Solár;Erik;Z;office
     Staršie menoslovy písali pomer hneď za číslo a prevádzku nemali vôbec.
     Rozoznáva sa preto podľa obsahu, nie podľa poradia či počtu polí —
     prázdne číslo je tiež pole a počítať sa na to nedá.

     Kotvou je skratka pomeru: čo je pred ňou, je meno, čo za ňou, prevádzka.
     Bez tejto kotvy by sa „Z" aj „office" zlepili s krstným menom na
     „Erik Z office" a takto by sa to aj uložilo. Žiadne krstné meno sa so
     skratkou pomeru nezhoduje, takže sa nemá čo pomýliť. */
  let vztah = null, prevadzka = null;
  if (akoVztah(priezvisko) && zvysok.length >= 2) {
    vztah = akoVztah(priezvisko);
    priezvisko = zvysok.shift();
  } else {
    const i = zvysok.findIndex((x, n) => n > 0 && akoVztah(x));
    if (i > 0) {
      vztah = akoVztah(zvysok[i]);
      prevadzka = zvysok.slice(i + 1).join(" ").trim() || null;
      zvysok = zvysok.slice(0, i);
    }
  }

  const meno = zvysok.join(" ").trim();
  if (!priezvisko || !meno) return { chyba: t };

  /* Riadok bez osobného čísla — `;Murár;Martin`. Menoslov od dodávateľa ho
     nemá a človek sa aj tak musí dostať do appky; číslo sa doplní, keď bude.
     Prázdne pole musí byť napísané, nie vynechané: „Murár;Martin" by sa inak
     čítalo ako číslo „Murár" a nedalo by sa rozoznať od preklepu. */
  if (!kod) return { kod: null, priezvisko, meno, vztah, prevadzka };
  if (!/^[0-9A-Za-z._-]+$/.test(kod)) return { chyba: t };
  return { kod, priezvisko, meno, vztah, prevadzka };
}

export async function importuj(k) {
  const riadky = (k.data.riadky ?? "").split(/\r?\n/);
  const zle = [], pridani = [], zmeneni = [], nedotknuti = [], rovnaki = [];
  const videne = new Set();
  let bezCisla = 0;

  /* Väzby z menoslovu (rozhodnutie 37): import ich niesť smie, ale **neznáme
     hodnoty odmieta, nezakladá**. Keby zakladal, „Vráble · Vrable · závod
     Vráble" by z jedného preklepu spravili tri prevádzky a rozbité súčty by
     sa ukázali až o dva mesiace pri uzávierke.

     A dopĺňa len prázdne (rozhodnutie 38): čo už v appke je, sa neprepíše —
     len sa vypíše ako rozdiel. Appka zatiaľ nevie odlíšiť ručne zadanú väzbu
     od tej z minulého importu, tak sa drží tá opatrnejšia polovica pravidla. */
  /* Firma sa v hlavičke píše plným názvom alebo skratkou — skratka preto, že
     prežije premenovanie obchodného názvu. Vnútorné `id` sa nepoužíva zámerne:
     v dvoch inštanciách appky znamená tá istá dvojka inú firmu, takže by
     menoslov ticho zaradil ľudí inam. Neznámy názov zlyhá nahlas. */
  const firmy = new Map();
  for (const x of await vsetky("SELECT id, nazov, skratka FROM firma")) {
    firmy.set(x.nazov.toLowerCase().trim(), x);
    if (x.skratka) firmy.set(x.skratka.toLowerCase().trim(), x);
  }
  /* Aj prevádzka sa píše skratkou alebo celým názvom — z rovnakého dôvodu
     ako firma: skratka je krátka, stála a pri preklepe zlyhá nahlas. */
  const prevadzky = new Map();
  for (const x of await vsetky("SELECT id, nazov, skratka FROM prevadzka")) {
    prevadzky.set(x.nazov.toLowerCase().trim(), x);
    if (x.skratka) prevadzky.set(x.skratka.toLowerCase().trim(), x);
  }
  const neznameVazby = new Set(), doplnene = [], rozdielne = [];
  let skupina = { firma: null, prevadzka: null };

  const klient = await bazen.connect();
  /* Názov stĺpca je tu z pevnej trojice nižšie, nie zo vstupu — do dotazu sa
     nikdy nedostane nič, čo napísal človek. */
  const doplnJednu = async (osobaId, stlpec, terajsia, nova, nazov, text, kto) => {
    if (nova === null || nova === undefined) return;
    if (terajsia === null || terajsia === undefined) {
      await klient.query(`UPDATE osoba SET ${stlpec} = $2 WHERE id = $1`, [osobaId, nova]);
      doplnene.push(`${kto} — ${nazov}: ${text}`);
    } else if (terajsia !== nova) {
      rozdielne.push(`${kto} — ${nazov}: v appke ostáva, menoslov píše ${text}`);
    }
  };

  try {
    await klient.query("BEGIN");
    const vazby = async (osobaId, v) => {
      const o = (await klient.query(
        "SELECT vztah, firma_id, prevadzka_id FROM osoba WHERE id = $1", [osobaId])).rows[0];
      if (!o) return;
      const kto = `${v.priezvisko} ${v.meno}`;
      await doplnJednu(osobaId, "vztah", o.vztah, v.vztah, "vzťah",
        v.vztah === "zivnostnik" ? "živnostník" : "pracovný pomer", kto);
      await doplnJednu(osobaId, "firma_id", o.firma_id, skupina.firma?.id ?? null,
        "firma", skupina.firma?.nazov, kto);
      /* Prevádzka pri človeku prebíja hlavičku skupiny: v jednej firme sedia
         ľudia vo viacerých prevádzkach a rozdeliť ich na skupiny len kvôli
         tomu by z menoslovu spravilo samé nadpisy. */
      let pr = skupina.prevadzka;
      if (v.prevadzka) {
        pr = prevadzky.get(v.prevadzka.toLowerCase()) ?? null;
        if (!pr) neznameVazby.add(`prevádzka „${v.prevadzka}"`);
      }
      await doplnJednu(osobaId, "prevadzka_id", o.prevadzka_id, pr?.id ?? null,
        "prevádzka", pr?.nazov, kto);
    };

    for (const r of riadky) {
      const h = rozoberHlavicku(r);
      if (h) {
        const f = firmy.get(h.firma.toLowerCase());
        const p = h.prevadzka ? prevadzky.get(h.prevadzka.toLowerCase()) : null;
        if (!f) neznameVazby.add(`firma „${h.firma}"`);
        if (h.prevadzka && !p) neznameVazby.add(`prevádzka „${h.prevadzka}"`);
        skupina = { firma: f ?? null, prevadzka: p ?? null };
        continue;
      }

      const v = rozober(r);
      if (!v) continue;
      if (v.chyba) { zle.push(v.chyba); continue; }

      /* Bez osobného čísla sa páruje podľa mena — inak by druhý import
         založil tých istých ľudí znova. Číslo je jediný spoľahlivý kľúč,
         takže je to náhrada, nie rovnocenná cesta: prihlásiť sa taký človek
         nevie a v zozname je označený, kým sa číslo nedoplní. */
      if (!v.kod) {
        const uz = (await klient.query(
          `SELECT id FROM osoba
            WHERE lower(priezvisko) = lower($1) AND lower(meno) = lower($2)`,
          [v.priezvisko, v.meno])).rows[0];
        if (uz) { rovnaki.push(uz.id); await vazby(uz.id, v); continue; }
        const novy = (await klient.query(
          `INSERT INTO osoba (priezvisko, meno, povod_mena, import_kedy)
           VALUES ($1,$2,'import',now()) RETURNING id`, [v.priezvisko, v.meno])).rows[0];
        pridani.push(`${v.priezvisko} ${v.meno}`);
        bezCisla++;
        await vazby(novy.id, v);
        continue;
      }
      videne.add(v.kod);

      const je = (await klient.query("SELECT * FROM osoba WHERE kod_dochadzka = $1", [v.kod])).rows[0];

      if (!je) {
        const novy = (await klient.query(
          `INSERT INTO osoba (kod_dochadzka, priezvisko, meno, povod_mena, import_kedy)
           VALUES ($1,$2,$3,'import',now()) RETURNING id`, [v.kod, v.priezvisko, v.meno])).rows[0];
        pridani.push(`${v.priezvisko} ${v.meno}`);
        await vazby(novy.id, v);
        continue;
      }
      if (je.priezvisko === v.priezvisko && je.meno === v.meno) {
        await klient.query("UPDATE osoba SET import_kedy = now() WHERE id = $1", [je.id]);
        rovnaki.push(je.id);
        await vazby(je.id, v);
        continue;
      }
      /* Pravidlo o pôvode: ručne opravené meno import neprepíše. */
      if (je.povod_mena === "rucne") {
        nedotknuti.push(`${v.kod}: v appke „${je.priezvisko} ${je.meno}", v súbore „${v.priezvisko} ${v.meno}"`);
        await klient.query("UPDATE osoba SET import_kedy = now() WHERE id = $1", [je.id]);
        await vazby(je.id, v);
        continue;
      }
      await klient.query(
        `UPDATE osoba SET priezvisko = $2, meno = $3, import_kedy = now() WHERE id = $1`,
        [je.id, v.priezvisko, v.meno]);
      zmeneni.push(`${je.priezvisko} ${je.meno} → ${v.priezvisko} ${v.meno}`);
      await vazby(je.id, v);
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
    pridanych: pridani.length, zmenenych: zmeneni.length, bezCisla,
    doplnenychVazieb: doplnene.length, neznamychVazieb: neznameVazby.size,
    nedotknutych: nedotknuti.length, rovnakych: rovnaki.length, chybnych: zle.length
  });

  const casti = [];
  if (pridani.length) casti.push(`pribudlo ${pridani.length}`);
  if (zmeneni.length) casti.push(`opravených mien ${zmeneni.length}`);
  if (doplnene.length) casti.push(`doplnených väzieb ${doplnene.length}`);
  if (rovnaki.length) casti.push(`bez zmeny ${rovnaki.length}`);
  const sprava = casti.length ? `Import hotový: ${casti.join(", ")}.` : "Import nepriniesol nič nové.";

  const varovania = [];
  /* Nie chyba, ale nedokončená vec — a keby to nikde nesvietilo, zabudne sa
     na ňu. Bez čísla sa človek neprihlási a dochádzka ho nespáruje. */
  if (bezCisla)
    varovania.push(`${mnoho(bezCisla, ["človek pribudol", "ľudia pribudli", "ľudí pribudlo"])} ` +
      "bez osobného čísla — prihlásiť sa zatiaľ nevie a s dochádzkou sa nespáruje. " +
      "Doplňte ho v jeho údajoch, keď bude známe.");
  /* Toto je tá poistka z rozhodnutia 37. Keby import neznámu firmu ticho
     založil, z jedného preklepu by vznikla druhá firma a rozbité súčty by sa
     ukázali až pri uzávierke. Tak sa nezaloží — a povie sa to. */
  if (neznameVazby.size)
    varovania.push(`V číselníku nie je: ${[...neznameVazby].join(", ")}. ` +
      "Tieto väzby sa nepriradili a nič sa nezaložilo — doplňte ich v Číselníkoch " +
      "a spustite import znova.");
  if (rozdielne.length)
    varovania.push(`Väzby, ktoré už v appke sú, sa neprepísali (${rozdielne.length}): ` +
      rozdielne.slice(0, 8).join(" · ") + (rozdielne.length > 8 ? " …" : ""));
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
  /* Odkiaľ používateľ prišiel — nech sa vráti na ten istý filter a nie na
     začiatok zoznamu. Berie sa len to, čo zoznam sám vie prečítať. */
  const spat = new URLSearchParams();
  for (const [kluc, hodnota] of new URLSearchParams(k.data.spat ?? ""))
    if (["hladaj", "stav", "pohlad", "tim", "firma"].includes(kluc)) spat.set(kluc, hodnota);
  const kam = (kluc, text) =>
    `/ludia?${spat.toString()}${spat.toString() ? "&" : ""}${kluc}=${encodeURIComponent(text)}`;

  const kto = [].concat(k.data.kto ?? []).flatMap(v => String(v).split(","))
                .map(Number).filter(Number.isInteger);
  if (!kto.length) return k.inam(k.odp, kam("chyba", "Nikto nebol označený."));

  const zmeny = [], hodnoty = [];
  for (const [pole] of Object.entries(VAZBY)) {
    const v = (k.data[pole] ?? "").trim();
    if (!v) continue;
    hodnoty.push(Number(v));
    zmeny.push(`${pole} = $${hodnoty.length}`);
  }
  const vztah = (k.data.vztah ?? "").trim();
  if (vztah) { hodnoty.push(vztah); zmeny.push(`vztah = $${hodnoty.length}`); }

  /* Hromadné zneaktívnenie aj vrátenie späť — pri odchode partie brigádnikov
     je to jediný rozumný spôsob. */
  const naStav = (k.data.aktivny ?? "").trim();
  if (naStav === "1" || naStav === "0") {
    hodnoty.push(naStav === "1");
    zmeny.push(`aktivny = $${hodnoty.length}`);
  }

  if (!zmeny.length)
    return k.inam(k.odp, kam("chyba", "Nebolo čo nastaviť — všetky polia ostali na „nemeniť\"."));

  if (k.data.firma_id && !(await firmaSaSmieMenit(kto)))
    return k.inam(k.odp, kam("chyba",
      "Firmu nemeníme uprostred mesiaca — niekto z označených už má v tomto mesiaci objednávku. " +
      "Zmena firmy sa dá spraviť k prvému dňu mesiaca."));

  /* Hromadné zneaktívnenie sa nesmie dotknúť posledného správcu — appka by
     ostala bez toho, kto sa do nej vie prihlásiť. */
  if (naStav === "0") {
    const zostane = await jeden(
      "SELECT count(*)::int AS n FROM osoba WHERE je_admin AND aktivny AND NOT (id = ANY($1))", [kto]);
    if (zostane.n === 0)
      return k.inam(k.odp, kam("chyba",
        "Medzi označenými je posledný správca — neaktívny sa už neprihlási a appka by " +
        "ostala bez správy. Najprv určte iného správcu."));
  }

  hodnoty.push(kto);
  const r = await dopyt(`UPDATE osoba SET ${zmeny.join(", ")} WHERE id = ANY($${hodnoty.length})`, hodnoty);

  /* Domovská jedáleň patrí do pridelených vždy — bez toho by hromadné
     priradenie nastavilo jedáleň, z ktorej si potom nikto nemôže vybrať. */
  if (k.data.poskytovatel_id)
    await dopyt(`INSERT INTO osoba_jedalen (osoba_id, poskytovatel_id, pridal_id)
                 SELECT unnest($1::int[]), $2, $3 ON CONFLICT DO NOTHING`,
                [kto, Number(k.data.poskytovatel_id), k.osoba.id]);

  await zapis(k.osoba.id, "ludia.hromadne", { kolko: r.rowCount, zmeny: zmeny.join(", ") });

  k.inam(k.odp, kam("sprava", `Nastavené ${mnoho(r.rowCount, ["človeku", "ľuďom", "ľuďom"])}.`));
}

/* ---------- jeden človek ---------- */

/* Čo z človeka robí históriu. Zámerne to nie je „všetko, čo naň ukazuje":
   prihlásenie do appky ani pridelená jedáleň históriou nie sú a nesmú brániť
   zmazaniu človeka, ktorý sa naimportoval omylom. Bránia veci, po ktorých by
   ostala diera v objednávkach alebo v peniazoch. */
const CO_JE_HISTORIA = [
  ["SELECT count(*)::int AS n FROM objednavka WHERE osoba_id = $1",
   ["objednávku", "objednávky", "objednávok"]],
  ["SELECT count(*)::int AS n FROM objednavka WHERE zadal_id = $1",
   ["objednávku zadanú iným", "objednávky zadané iným", "objednávok zadaných iným"]],
  ["SELECT count(*)::int AS n FROM nepritomnost WHERE osoba_id = $1",
   ["záznam o neprítomnosti", "záznamy o neprítomnosti", "záznamov o neprítomnosti"]],
  ["SELECT count(*)::int AS n FROM nepritomnost WHERE zadal_id = $1",
   ["odhlásenie zadané iným", "odhlásenia zadané iným", "odhlásení zadaných iným"]],
  ["SELECT count(*)::int AS n FROM tim_predak WHERE osoba_id = $1",
   ["tím, ktorému je predákom", "tímy, ktorým je predákom", "tímov, ktorým je predákom"]],
  ["SELECT count(*)::int AS n FROM tyzden_stav WHERE uzavrel_id = $1",
   ["uzavretý týždeň", "uzavreté týždne", "uzavretých týždňov"]]
];

async function historiaOsoby(id) {
  const von = [];
  for (const [sql, tvary] of CO_JE_HISTORIA) {
    const r = await jeden(sql, [id]);
    if (Number(r?.n ?? 0) > 0) von.push(mnoho(r.n, tvary));
  }
  return von;
}

/* `zvonku.noveHeslo` vyplní nastavenie hesla. Vygenerované heslo sa nedá
   presmerovať späť na GET — v adrese by ostalo v histórii prehliadača —
   a uložiť sa nedá ani do databázy, lebo tam je len jeho odtlačok. Ukáže sa
   preto raz, priamo z POST-u, a kto si ho neodpíše, vygeneruje si nové. */
export async function detail(k, zvonku = {}) {
  const id = Number(zvonku.id ?? k.url.searchParams.get("id"));
  const o = await jeden("SELECT * FROM osoba WHERE id = $1", [id]);
  if (!o) return k.inam(k.odp, "/ludia?chyba=" + encodeURIComponent("Taký človek tu nie je."));

  const c = await ciselniky();
  const pridelene = new Set((await vsetky(
    "SELECT poskytovatel_id FROM osoba_jedalen WHERE osoba_id = $1", [id]))
    .map(r => r.poskytovatel_id));
  const historia = await historiaOsoby(id);
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
          <div class="field"><label for="p-poskytovatel_id">Domovská jedáleň</label>
            ${vyber("poskytovatel_id", c.jedalne, o.poskytovatel_id)}
            <p class="hint">Tá, z ktorej dostáva obed bežne.</p></div>
          <div class="field">
            <label>Môže si vybrať aj z</label>
            ${c.jedalne.filter(j => j.id !== o.poskytovatel_id).length === 0
              ? `<p class="hint">Iná aktívna jedáleň nie je.</p>`
              : c.jedalne.filter(j => j.id !== o.poskytovatel_id).map(j =>
                  `<label class="check" style="margin-bottom:6px">
                     <input type="checkbox" name="jedalne" value="${j.id}"${pridelene.has(j.id) ? " checked" : ""}>
                     <span>${esc(j.nazov)}</span></label>`).join("")}
            <p class="hint">Kto má pridelené dve, dostane v matici ponuky pod sebou —
              jeden riadok na jedáleň. Domovská je pridelená vždy.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Roly a príznaky</h3></div>
      ${prep("je_admin", "Správca", o.je_admin, "číselníky, ľudia, uzávierka")}
      ${prep("platca_dph", "Platiteľ DPH", o.platca_dph, "týka sa len živnostníkov")}
      ${prep("aktivny", "Aktívny", o.aktivny, "neaktívny sa neobjaví nikde, ale história ostáva")}
    </div>

    <div class="btn-row">
      <button class="btn primary" type="submit">Uložiť</button>
      <a class="btn" href="/ludia">Späť na zoznam</a>
    </div>
  </form>

  <div class="card">
    <div class="card-head"><h3>Prihlásenie</h3>
      <span class="hint">${o.heslo_hash ? "heslo je nastavené" : "heslo ešte nemá"}</span></div>

    ${zvonku.noveHeslo ? `<div class="okbox">
        <strong>Nové heslo pre ${esc(o.priezvisko)} ${esc(o.meno)}:</strong>
        <div class="heslo-raz">${esc(zvonku.noveHeslo)}</div>
        Odpíšte si ho a odovzdajte — <strong>uvidíte ho len teraz</strong>. V databáze
        je uložený len jeho odtlačok, takže sa už nikde nedá pozrieť. Keď sa stratí,
        vygenerujte nové.
      </div>` : ""}

    <p style="margin:0 0 12px">Prihlasuje sa osobným číslom
      <strong>${esc(o.kod_dochadzka ?? "—")}</strong> a heslom.
      ${o.kod_dochadzka ? "" : `<br><strong>Osobné číslo zatiaľ nemá</strong>, takže sa
        prihlásiť nevie a import z dochádzky ho nespáruje. Doplňte ho vyššie.`}
      ${o.heslo_hash
        ? "Heslo sa nedá pozrieť — v databáze je len jeho odtlačok. Keď ho človek zabudne, vygenerujte nové."
        : "Bez hesla sa človek neprihlási — vygenerujte mu ho."}</p>
    <form method="post" action="/osoba/heslo">
      <input type="hidden" name="znamka" value="${esc(k.csrf)}">
      <input type="hidden" name="id" value="${o.id}">
      <button class="btn${o.heslo_hash ? "" : " primary"}" type="submit">
        ${o.heslo_hash ? "Vygenerovať nové heslo" : "Vygenerovať heslo"}</button>
      <p class="hint" style="margin:8px 0 0">Nové heslo odhlási tohto človeka zo všetkých
        zariadení. Svoje vlastné si každý môže zmeniť sám cez odkaz pri svojom mene.</p>
    </form>
  </div>

  <div class="card">
    <div class="card-head"><h3>Zmazať</h3></div>
    ${historia.length === 0 ? `
      <p style="margin:0 0 12px">Tento človek nemá žiadnu objednávku ani inú históriu,
        takže sa dá zmazať bez toho, aby po ňom ostala diera. Typicky ide o riadok,
        ktorý sa naimportoval omylom.</p>
      <details>
        <summary class="btn">Naozaj zmazať</summary>
        <form method="post" action="/osoba/zmazat" style="margin-top:14px">
          <input type="hidden" name="znamka" value="${esc(k.csrf)}">
          <input type="hidden" name="id" value="${o.id}">
          <p style="margin:0 0 12px">Zmazať <strong>${esc(o.priezvisko)} ${esc(o.meno)}</strong>?
            Späť sa to vrátiť nedá.</p>
          <button class="btn primary" type="submit">Zmazať natrvalo</button>
        </form>
      </details>` : `
      <p style="margin:0 0 12px">Zmazať sa nedá — má ${esc(historia.join(", "))}.</p>
      <p class="hint" style="margin:0">Zmazaním by vznikli riadky bez pôvodu vo faktúre
        aj v mzdovom podklade. Odškrtnite <em>Aktívny</em> vyššie — človek zmizne z matice
        aj zo zoznamov, ale minulosť ostane čitateľná.</p>`}
  </div>
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
  const zapnute = v => k.data[v] === "1";
  const novaJedalen = cislo("poskytovatel_id");

  try {
    await dopyt(`
      UPDATE osoba SET priezvisko=$2, meno=$3, kod_dochadzka=$4, kod_mzdy=$5,
             firma_id=$6, vztah=$7, tim_id=$8, prevadzka_id=$9,
             poskytovatel_id=$10, je_admin=$11, platca_dph=$12,
             aktivny=$13, povod_mena=$14
       WHERE id=$1`, [
      id, priezvisko, meno_,
      (k.data.kod_dochadzka ?? "").trim() || null,
      (k.data.kod_mzdy ?? "").trim() || null,
      novaFirma, (k.data.vztah ?? "").trim() || null, cislo("tim_id"),
      cislo("prevadzka_id"), cislo("poskytovatel_id"),
      zapnute("je_admin"), zapnute("platca_dph"),
      zapnute("aktivny"), povod
    ]);
  } catch (e) {
    return naspat(e.code === "23505"
      ? `Osobné číslo ${k.data.kod_dochadzka} už má niekto iný.`
      : `Nepodarilo sa uložiť: ${e.message}`);
  }

  /* Kto si zoberie sám sebe správcu, vyrobí appku bez správcu. To isté ale
     spraví aj odškrtnutie „Aktívny": neaktívny človek sa neprihlási, takže
     posledný správca sa tým sám zamkne von a dostať sa späť sa dá len cez
     databázu na serveri. Preto sa strážia obe políčka rovnako. */
  const zvysokSpravcov = async () =>
    (await jeden("SELECT count(*)::int AS n FROM osoba WHERE je_admin AND aktivny")).n;

  if (o.je_admin && !zapnute("je_admin") && (await zvysokSpravcov()) === 0) {
    await dopyt("UPDATE osoba SET je_admin = true WHERE id = $1", [id]);
    return naspat("Správcu sme nechali — bol by to posledný a appka by ostala bez správy. " +
                  "Najprv určte iného, potom tomuto rolu odoberte.");
  }
  if (o.je_admin && zapnute("je_admin") && !zapnute("aktivny") && (await zvysokSpravcov()) === 0) {
    await dopyt("UPDATE osoba SET aktivny = true WHERE id = $1", [id]);
    return naspat("Nechali sme ho aktívneho — je to posledný správca a neaktívny sa už " +
                  "neprihlási. Najprv určte iného správcu, potom tohto zneaktívnite.");
  }

  /* Pridelenia sa prepíšu nanovo: domovská jedáleň plus zaškrtnuté.
     Domovská je v zozname vždy — inak by si človek nemohol objednať tam,
     kde má chodiť bežne. */
  const zaskrtnute = [].concat(k.data.jedalne ?? []).map(Number).filter(Number.isInteger);
  const chcene = [...new Set([...(novaJedalen ? [novaJedalen] : []), ...zaskrtnute])];
  await dopyt("DELETE FROM osoba_jedalen WHERE osoba_id = $1 AND NOT (poskytovatel_id = ANY($2))",
              [id, chcene.length ? chcene : [0]]);
  for (const j of chcene)
    await dopyt(`INSERT INTO osoba_jedalen (osoba_id, poskytovatel_id, pridal_id)
                 VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [id, j, k.osoba.id]);

  await zapis(k.osoba.id, "osoba.upravena",
              { id, kto: `${priezvisko} ${meno_}`, jedalne: chcene });
  k.inam(k.odp, `/osoba?id=${id}&sprava=` + encodeURIComponent("Uložené."));
}

/* Mazanie človeka. Rovnaké pravidlo ako pri číselníkoch, len s dlhším
   zoznamom toho, čo je história. */
/* Vygeneruje heslo a ukáže ho raz. Uložiť sa dá len odtlačok, takže druhá
   možnosť neexistuje: buď si ho človek odpíše teraz, alebo sa vyrobí nové. */
export async function nasHeslo(k) {
  const id = Number(k.data.id);
  const o = await jeden("SELECT * FROM osoba WHERE id = $1", [id]);
  if (!o) return k.inam(k.odp, "/ludia?chyba=" + encodeURIComponent("Taký človek tu nie je."));

  const heslo = nahodneHeslo(najmenejZnakov(o));
  await dopyt("UPDATE osoba SET heslo_hash = $2 WHERE id = $1", [id, await hashHesla(heslo)]);
  /* Staré prihlásenia po zmene hesla neplatia — inak by zmena nepomohla proti
     niekomu, kto je práve prihlásený. Vlastnú reláciu si správca nechá, aby
     sa pri zmene vlastného hesla sám nevyhodil. */
  if (id === k.osoba.id) await zrusOstatne(id, k.token);
  else await dopyt("DELETE FROM relacia WHERE osoba_id = $1", [id]);
  await zapis(k.osoba.id, "osoba.heslo", { komu: id });

  return detail(k, { id, noveHeslo: heslo });
}

export async function zmazat(k) {
  const id = Number(k.data.id);
  const o = await jeden("SELECT * FROM osoba WHERE id = $1", [id]);
  if (!o) return k.inam(k.odp, "/ludia?chyba=" + encodeURIComponent("Taký človek tu nie je."));
  const spat = t => k.inam(k.odp, `/osoba?id=${id}&chyba=` + encodeURIComponent(t));

  if (o.id === k.osoba.id) return spat("Sám seba zmazať nemôžete.");

  /* Kontrola znova na serveri: medzi zobrazením stránky a kliknutím mohol
     človek dostať objednávku a formulár sa dá poslať aj bez toho tlačidla. */
  const historia = await historiaOsoby(id);
  if (historia.length)
    return spat(`Medzitým pribudla história (${historia.join(", ")}). Nezmazalo sa nič — ` +
                "odškrtnite Aktívny namiesto mazania.");

  if (o.je_admin) {
    const ini = await jeden("SELECT count(*)::int AS n FROM osoba WHERE je_admin AND aktivny AND id <> $1", [id]);
    if (ini.n === 0) return spat("Toto je posledný správca. Najprv určte iného.");
  }

  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    /* Do denníka sa najprv zapíše meno ako text. Riadky, ktoré ten človek
       v denníku zanechal, potom stratia odkaz na jeho id — ale zápis o zmazaní
       drží, o koho išlo. Denník tak ostáva čitateľný aj po zmazaní. */
    await klient.query(
      "INSERT INTO audit (kto_id, co, detail) VALUES ($1,$2,$3)",
      [k.osoba.id, "osoba.zmazana",
       JSON.stringify({ id, kto: `${o.priezvisko} ${o.meno}`, kod: o.kod_dochadzka })]);
    await klient.query("UPDATE audit SET kto_id = NULL WHERE kto_id = $1", [id]);
    await klient.query("DELETE FROM relacia WHERE osoba_id = $1", [id]);
    await klient.query("UPDATE osoba_jedalen SET pridal_id = NULL WHERE pridal_id = $1", [id]);
    await klient.query("DELETE FROM osoba WHERE id = $1", [id]);
    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    /* Poistka na väzbu, ktorú zoznam vyššie nepokrýva. */
    return spat("Databáza mazanie odmietla — na tohto človeka niečo ukazuje. " +
                "Odškrtnite Aktívny namiesto mazania.");
  }
  klient.release();

  k.inam(k.odp, "/ludia?sprava=" + encodeURIComponent(`Zmazaný: ${o.priezvisko} ${o.meno}.`));
}
