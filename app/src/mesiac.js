/* Mesačný podklad — čo sa komu strhne a čo to stálo firmu (koncept 6.3).

   Tento mesiac ide appka **paralelne s papierom**, takže prvá povinnosť tejto
   obrazovky nie je zamykať, ale **dať sa položiť vedľa hárku mzdárky**. Preto
   je základné delenie po firmách — tak to bude porovnávať — a v rámci firmy
   riadok na človeka s rozpisom, ktorý na papieri existuje.

   Kým je mesiac otvorený, je to **odhad** a je tak aj označený. Nie preto, že
   by čísla boli iné, ale preto, že mesiac ešte nie je celý.

   Živnostník nie je v mzdovom podklade ani ako riadok s nulou (6.2a). Vzorec
   sa mu počíta rovnako — inak by sa nevedelo, o koľko si má zvýšiť faktúru —
   ale výsledok ide iným smerom, tak je aj v inej tabuľke. */

import { stranka, esc, mnoho } from "./html.js";
import { jeden, vsetky } from "./db.js";
import { dnes, dlhy, mesiacPopis, prvyVMesiaci, posunMesiac } from "./datum.js";
import { obed, mesiac as spocitajMesiac, eur, zEur, naCenty } from "./peniaze.js";
import { platneKu } from "./nastavenia.js";
import { poctySpatnych } from "./spatne.js";

/* ---------- údaje ---------- */

/* Cenová hladina základného poskytovateľa pre ekonomický model: najnižšia
   cena spomedzi aktívnych jedální (6.2). Udržiava sa tým sama — keď pribudne
   lacnejšia jedáleň, hladina klesne bez zásahu. Cenník zatiaľ nemá históriu,
   takže je to cena, ktorá platí teraz; keď história pribudne, číta sa ku dňu. */
async function zakladnaCena() {
  const r = await vsetky("SELECT cena_s_dph, sadzba_dph FROM poskytovatel WHERE aktivny");
  const bezDph = r.map(x => zEur(Number(x.cena_s_dph) / (1 + Number(x.sadzba_dph) / 100)));
  return bezDph.length ? Math.min(...bezDph) : null;
}

/* Obedy mesiaca aj s tým, čo sa o nich musí vedieť pri rozúčtovaní.
   `neskoro` = v ten deň má človek zapísanú neprítomnosť a obed si aj tak
   objednal. To je prípad na rozhodnutie (6.4), nie na tiché doúčtovanie. */
async function obedyMesiaca(prvy) {
  const koniec = posunMesiac(prvy, 1);
  return vsetky(`
    SELECT ob.osoba_id, ob.datum::text AS datum, ob.jedlo, ob.poskytovatel_id,
           ob.cena_bez_dph, ob.sadzba_dph, ob.spatny_zapis,
           p.nazov AS jedalen, p.model,
           o.priezvisko, o.meno, o.kod_dochadzka, o.kod_mzdy, o.vztah, o.platca_dph,
           f.id AS firma_id, f.nazov AS firma,
           pr.nazov AS prevadzka, t.nazov AS tim,
           (n.id IS NOT NULL) AS neskoro
      FROM objednavka ob
      JOIN osoba o        ON o.id = ob.osoba_id
      LEFT JOIN poskytovatel p ON p.id = ob.poskytovatel_id
      LEFT JOIN firma f    ON f.id = o.firma_id
      LEFT JOIN prevadzka pr ON pr.id = o.prevadzka_id
      LEFT JOIN tim t      ON t.id = o.tim_id
      LEFT JOIN nepritomnost n ON n.osoba_id = ob.osoba_id
                              AND ob.datum BETWEEN n.od AND n.do_
     WHERE ob.datum >= $1 AND ob.datum < $2 AND ob.jedlo >= 0
     ORDER BY f.nazov NULLS LAST, o.priezvisko, o.meno, ob.datum`, [prvy, koniec]);
}

/* Spočíta mesiac po osobách. Rozúčtovanie beží na každom obede v plnej
   presnosti; zaokrúhľuje sa až súčet za osobu — presne raz (6.2). */
export async function podklad(prvy, { firmaId = null } = {}) {
  const n = await platneKu(prvy);
  const zaklad = await zakladnaCena();
  const riadky = await obedyMesiaca(prvy);

  const ludia = new Map();
  for (const r of riadky) {
    if (firmaId && r.firma_id !== firmaId) continue;
    if (!ludia.has(r.osoba_id)) ludia.set(r.osoba_id, {
      id: r.osoba_id, priezvisko: r.priezvisko, meno: r.meno,
      kod: r.kod_dochadzka, kodMzdy: r.kod_mzdy,
      vztah: r.vztah, platcaDph: r.platca_dph,
      firmaId: r.firma_id, firma: r.firma, prevadzka: r.prevadzka, tim: r.tim,
      obedy: [], poJedalni: new Map(), naRozhodnutie: [], spatne: 0
    });
    const c = ludia.get(r.osoba_id);

    /* Cena je odfotená na objednávke (6.1) — neskoršia zmena cenníka minulosť
       neprepíše. Keby chýbala, obed sa nedá rozúčtovať a musí to byť vidieť,
       nie sa ticho počítať za nulu. */
    const cena = zEur(r.cena_bez_dph);
    if (!cena) { c.naRozhodnutie.push({ datum: r.datum, preco: "chýba odfotená cena" }); continue; }

    /* Nárok sa predpokladá — dochádzka zatiaľ nie je naimportovaná (6.2b).
       Deň, keď má človek zapísanú neprítomnosť a obed si aj tak objednal, sa
       nedoúčtuje sám: appka ho označí a čaká (6.4). */
    if (r.neskoro) c.naRozhodnutie.push({ datum: r.datum, preco: "obed v deň neprítomnosti" });
    if (r.spatny_zapis) c.spatne++;

    c.obedy.push(obed({ cena, zaklad, model: r.model ?? "eko", narok: true, n }));
    c.poJedalni.set(r.jedalen ?? "—", (c.poJedalni.get(r.jedalen ?? "—") ?? 0) + 1);
  }

  const von = [];
  for (const c of ludia.values()) von.push({ ...c, s: spocitajMesiac(c.obedy) });
  von.sort((a, b) => (a.firma ?? "").localeCompare(b.firma ?? "", "sk") ||
                     a.priezvisko.localeCompare(b.priezvisko, "sk"));
  return { ludia: von, nastavenia: n, zaklad };
}

/* Súčet skupiny riadkov. Sčítavajú sa už zaokrúhlené centy — to je zámer:
   mzdárka sčíta stĺpec na papieri rovnako a musí jej vyjsť to isté číslo. */
function sucet(ludia) {
  const s = { poctov: 0, cena: 0, zl: 0, fond: 0, stravnik: 0, dph: 0, plati: 0 };
  for (const c of ludia)
    for (const k of Object.keys(s)) s[k] += c.s[k];
  return s;
}

/* ---------- obrazovka ---------- */

const STLPCE = [
  ["poctov", "Obedov"], ["cena", "Cena bez DPH"], ["zl", "Príspevok ZL"],
  ["fond", "Sociálny fond"], ["stravnik", "Podiel stravníka"], ["dph", "DPH"],
  ["plati", "Zrážka zo mzdy"]
];

function tabulka(ludia, { zrazka = true } = {}) {
  const s = sucet(ludia);
  return `<div class="scroll-x"><table class="data podklad">
    <thead><tr>
      <th>Osobné číslo</th><th>Priezvisko a meno</th><th>Stredisko</th>
      ${STLPCE.map(([k, p]) => `<th class="num">${esc(
        k === "plati" && !zrazka ? "Doplatok — ako keby" : p)}</th>`).join("")}
    </tr></thead>
    <tbody>${ludia.map(c => `<tr>
      <td class="num">${esc(c.kod ?? "—")}</td>
      <td>${esc(c.priezvisko)} ${esc(c.meno)}${
        c.naRozhodnutie.length ? ' <span class="badge adm">na rozhodnutie</span>' : ""}${
        c.spatne ? ` <span class="badge">${c.spatne}× spätne</span>` : ""}</td>
      <td>${esc(c.prevadzka ?? c.tim ?? "—")}</td>
      ${STLPCE.map(([k]) => `<td class="num">${k === "poctov" ? c.s[k] : eur(c.s[k])}</td>`).join("")}
    </tr>`).join("")}
    <tr class="sucet"><th colspan="3">Spolu — ${mnoho(ludia.length, ["človek", "ľudia", "ľudí"])}</th>
      ${STLPCE.map(([k]) => `<td class="num"><strong>${k === "poctov" ? s[k] : eur(s[k])}</strong></td>`).join("")}
    </tr></tbody>
  </table></div>`;
}

export async function zobraz(k) {
  const prvy = prvyVMesiaci(k.url.searchParams.get("mesiac") || dnes());
  const firmaId = Number(k.url.searchParams.get("firma")) || null;

  const firmy = await vsetky("SELECT id, nazov FROM firma WHERE aktivna ORDER BY nazov");
  const { ludia, nastavenia, zaklad } = await podklad(prvy, { firmaId });
  const zamok = await jeden("SELECT * FROM mesiac_stav WHERE mesiac = $1", [prvy]);
  const uzSpatne = await poctySpatnych(prvy);
  const otvoreny = !zamok?.mzdy_uzavrete;

  const zamestnanci = ludia.filter(c => c.vztah !== "zivnostnik");
  const zivnostnici = ludia.filter(c => c.vztah === "zivnostnik");
  const naRozhodnutie = ludia.filter(c => c.naRozhodnutie.length);

  const mesiace = [];
  for (let i = 0; i <= 5; i++) mesiace.push(posunMesiac(prvyVMesiaci(dnes()), -i));
  if (!mesiace.includes(prvy)) mesiace.push(prvy);
  mesiace.sort().reverse();

  /* Zoskupenie po firmách — mzdárka pôjde po celých firmách, takže je to
     základné delenie, nie filter navyše. */
  const poFirmach = new Map();
  for (const c of zamestnanci) {
    const kluc = c.firma ?? "bez firmy";
    if (!poFirmach.has(kluc)) poFirmach.set(kluc, []);
    poFirmach.get(kluc).push(c);
  }

  k.html(k.odp, 200, stranka({
    titulok: "Mesačný podklad", osoba: k.osoba, cesta: "/mesiac", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Mesačný podklad</h2>
    <span class="who">${esc(mesiacPopis(prvy))}${otvoreny ? " · odhad" : " · uzavretý"}</span>
  </div>

  ${otvoreny ? `<div class="infobox">Mesiac je otvorený, takže je to <strong>odhad</strong> —
    čísla sedia, ale mesiac ešte nie je celý. Uzavretím sa zafixujú a ďalšie zmeny
    pôjdu ako opravná položka do ďalšieho mesiaca.</div>`
  : `<div class="okbox">Mzdová uzávierka je hotová
      ${zamok.mzdy_kedy ? `(${esc(dlhy(String(zamok.mzdy_kedy).slice(0, 10)))})` : ""}.
      Čísla sú zafixované.</div>`}

  <form method="get" action="/mesiac" class="card filtre">
    <div class="hromadne">
      <div class="field"><label for="f-mesiac">Mesiac</label>
        <select id="f-mesiac" name="mesiac">${mesiace.map(m =>
          `<option value="${m.slice(0, 7)}"${m === prvy ? " selected" : ""}>${esc(mesiacPopis(m))}</option>`
        ).join("")}</select></div>
      <div class="field"><label for="f-firma">Firma</label>
        <select id="f-firma" name="firma"><option value="">všetky</option>
          ${firmy.map(f => `<option value="${f.id}"${f.id === firmaId ? " selected" : ""}>${esc(f.nazov)}</option>`).join("")}
        </select></div>
    </div>
    <button class="btn" type="submit">Zobraziť</button>
    <a class="btn" href="/porovnanie?mesiac=${prvy.slice(0, 7)}">Porovnať s papierom</a>
  </form>

  ${!ludia.length ? `<div class="infobox">V mesiaci ${esc(mesiacPopis(prvy))} zatiaľ
    nie je čo spočítať.</div>` : `

  ${[...poFirmach].map(([firma, ludiaFirmy]) => `
  <div class="card">
    <div class="card-head"><h3>${esc(firma)}</h3>
      <span class="hint">zamestnanci — podklad pre mzdy</span></div>
    ${tabulka(ludiaFirmy)}
  </div>`).join("")}

  ${zivnostnici.length ? `
  <div class="card">
    <div class="card-head"><h3>Živnostníci</h3>
      <span class="hint">nie sú v mzdovom podklade</span></div>
    <div class="note">Dodávateľovi platia sami, v plnej cene. Vzorec sa im počíta
      rovnako — inak by sa nevedelo, o koľko si majú zvýšiť faktúru — ale nič sa im
      nestrháva. Súčet stĺpcov <em>Príspevok ZL</em> a <em>Sociálny fond</em> je to,
      čo si pridajú ako <strong>stabilizačný príplatok</strong>.</div>
    ${tabulka(zivnostnici, { zrazka: false })}
  </div>` : ""}

  <div class="card">
    <div class="card-head"><h3>Podľa čoho sa to počítalo</h3></div>
    <div class="scroll-x"><table class="data"><tbody>
      <tr><td>Príspevok zamestnávateľa</td><td class="num">${nastavenia.zamestnavatel_pct} %</td></tr>
      <tr><td>Podiel stravníka</td><td class="num">${nastavenia.stravnik_od_pct} – ${nastavenia.stravnik_do_pct} %</td></tr>
      <tr><td>DPH k podielu stravníka</td><td class="num">${nastavenia.dph_stravnik_pct} %</td></tr>
      <tr><td>Zákonný strop</td><td class="num">${nastavenia.strop_zapnuty
        ? eur(naCenty(Math.round(zEur(nastavenia.stravne_5_12) * nastavenia.zamestnavatel_pct / 100)))
        : "neuplatňuje sa"}</td></tr>
      <tr><td>Cenová hladina základnej jedálne</td><td class="num">${
        zaklad ? eur(naCenty(zaklad)) : "—"}</td></tr>
      ${uzSpatne.kolko ? `<tr><td>Z toho zadaných spätne</td>
        <td class="num">${uzSpatne.kolko} <a href="/spatne?mesiac=${prvy.slice(0, 7)}">zobraziť</a></td></tr>` : ""}
    </tbody></table></div>
    <p class="hint" style="margin:12px 0 0">Hodnoty sa berú ku dňu obeda —
      neskoršia zmena tento mesiac neprepočíta. Menia sa v <a href="/nastavenia">Rozúčtovaní</a>.</p>
  </div>

  ${naRozhodnutie.length ? `
  <div class="card">
    <div class="card-head"><h3>Na rozhodnutie</h3>
      <span class="hint">${mnoho(naRozhodnutie.length, ["človek", "ľudia", "ľudí"])}</span></div>
    <div class="warnbox">Obed v deň, keď má človek zapísanú neprítomnosť. Podľa
      pravidla sa taký obed účtuje v plnej cene bez príspevku aj bez fondu — príspevok
      je viazaný na odpracovanú zmenu a v ten deň nemá z čoho vzniknúť.
      <strong>Appka to sama nedoúčtuje</strong>: krátka zmena, zle pípnutá karta aj
      skutočná neprítomnosť vyzerajú v údajoch rovnako. Vyššie je to počítané
      s príspevkom, teda v prospech človeka.</div>
    <ul class="zoznam-mien">
      ${naRozhodnutie.map(c => `<li>${esc(c.priezvisko)} ${esc(c.meno)}
        <span class="hint">· ${c.naRozhodnutie.map(x => `${esc(dlhy(x.datum))} (${esc(x.preco)})`).join(" · ")}</span></li>`).join("")}
    </ul>
  </div>` : ""}
  `}
</section>`
  }));
}
