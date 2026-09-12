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
import { jeden, vsetky, zapis } from "./db.js";
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
           p.nazov AS jedalen, p.model, p.fakturuje_zivnostnikom,
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

/* Čo príde na faktúru od jedálne. Počíta sa z porcií, nie z podielov: cena
   pre dodávateľa je vec obeda, kdežto príspevok a zrážka sú vec človeka
   a zaokrúhľujú sa raz za mesiac za neho. Miešať tie dve veci by znamenalo
   deliť jednému človeku zaokrúhlený mesiac medzi dve kuchyne — a číslo na
   faktúre by prestalo sedieť práve preto, že sa niekomu strhla celá suma. */
function doFaktury(mapa, r, cena) {
  const kluc = `${r.firma_id ?? 0}|${r.poskytovatel_id ?? 0}`;
  if (!mapa.has(kluc)) mapa.set(kluc, {
    firmaId: r.firma_id, firma: r.firma, jedalenId: r.poskytovatel_id,
    jedalen: r.jedalen ?? "—", fakturuje: r.fakturuje_zivnostnikom ?? null,
    zam: { porcie: 0, bezDph: 0, dph: 0 }, ziv: { porcie: 0, bezDph: 0, dph: 0 }
  });
  const c = mapa.get(kluc)[r.vztah === "zivnostnik" ? "ziv" : "zam"];
  c.porcie++;
  c.bezDph += cena;
  c.dph += Math.round((cena * Number(r.sadzba_dph ?? 0)) / 100);
}

/* Spočíta mesiac po osobách. Rozúčtovanie beží na každom obede v plnej
   presnosti; zaokrúhľuje sa až súčet za osobu — presne raz (6.2). */
export async function podklad(prvy, { firmaId = null } = {}) {
  const n = await platneKu(prvy);
  const zaklad = await zakladnaCena();
  const riadky = await obedyMesiaca(prvy);

  const ludia = new Map();
  const faktury = new Map();
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
    doFaktury(faktury, r, cena);
  }

  const von = [];
  for (const c of ludia.values()) von.push({ ...c, s: spocitajMesiac(c.obedy) });
  von.sort((a, b) => (a.firma ?? "").localeCompare(b.firma ?? "", "sk") ||
                     a.priezvisko.localeCompare(b.priezvisko, "sk"));

  const naFakturu = [...faktury.values()].sort((a, b) =>
    (a.firma ?? "").localeCompare(b.firma ?? "", "sk") || a.jedalen.localeCompare(b.jedalen, "sk"));
  return { ludia: von, nastavenia: n, zaklad, naFakturu };
}

/* Súhrn po prevádzkach — tie isté čísla, iné triedenie (6.3). Sčítavajú sa už
   zaokrúhlené mesiace ľudí, takže súčet sedí s podkladom na cent.

   Živnostník je v stĺpci „stálo firmu" spolu so zamestnancami zámerne: u neho
   tá istá suma nejde ako príspevok, ale ako odmena na jeho faktúre — firmu to
   stojí rovnako, o to v tom modeli ide. Zo mzdy sa mu ale nestrháva nič, tak
   v zrážkach nie je. */
export function poPrevadzkach(ludia) {
  const mapa = new Map();
  for (const c of ludia) {
    const kluc = c.prevadzka ?? "bez prevádzky";
    if (!mapa.has(kluc)) mapa.set(kluc, {
      prevadzka: kluc, ludi: 0, zivnostnikov: 0,
      poctov: 0, cena: 0, zl: 0, fond: 0, zrazky: 0
    });
    const s = mapa.get(kluc);
    s.ludi++;
    if (c.vztah === "zivnostnik") s.zivnostnikov++;
    s.poctov += c.s.poctov; s.cena += c.s.cena;
    s.zl += c.s.zl; s.fond += c.s.fond;
    if (c.vztah !== "zivnostnik") s.zrazky += c.s.plati;
  }
  return [...mapa.values()].sort((a, b) => a.prevadzka.localeCompare(b.prevadzka, "sk"));
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

/* Súhrn po prevádzkach. Na otázku „kde tie peniaze vznikajú" (6.3). */
function tabulkaPrevadzok(riadky) {
  const s = { ludi: 0, poctov: 0, cena: 0, zl: 0, fond: 0, zrazky: 0 };
  for (const r of riadky) for (const kluc of Object.keys(s)) s[kluc] += r[kluc];
  const bunky = (r, silne) => {
    const b = t => `<td class="num">${silne ? `<strong>${t}</strong>` : t}</td>`;
    return b(r.ludi + (r.zivnostnikov ? ` <span class="hint">z toho ${r.zivnostnikov} živn.</span>` : "")) +
      b(r.poctov) + b(eur(r.cena)) + b(eur(r.zl)) + b(eur(r.fond)) +
      b(eur(r.zl + r.fond)) + b(eur(r.zrazky));
  };
  return `<div class="scroll-x"><table class="data">
    <thead><tr><th>Prevádzka</th><th class="num">Ľudí</th><th class="num">Obedov</th>
      <th class="num">Cena bez DPH</th><th class="num">Príspevok ZL</th>
      <th class="num">Sociálny fond</th><th class="num">Stálo firmu</th>
      <th class="num">Zrážky zo mzdy</th></tr></thead>
    <tbody>${riadky.map(r => `<tr><td>${esc(r.prevadzka)}</td>${bunky(r, false)}</tr>`).join("")}
      <tr class="sucet"><th>Spolu</th>${bunky({ ...s, zivnostnikov: 0 }, true)}</tr>
    </tbody></table></div>`;
}

/* Čo očakávať na faktúre — jediné číslo, ktoré sa porovnáva s papierom (6.3).
   Nepredvypĺňa sa nikam do formulára: predvyplnená kontrola je kontrola,
   ktorú si odklepneme sami sebe (rozhodnutie 23). */
function tabulkaFaktur(riadky) {
  const naFakturu = r => r.fakturuje === "firme"
    ? r.zam.bezDph + r.zam.dph + r.ziv.bezDph + r.ziv.dph
    : r.zam.bezDph + r.zam.dph;
  return `<div class="scroll-x"><table class="data">
    <thead><tr><th>Firma</th><th>Jedáleň</th><th class="num">Porcií zamestnancov</th>
      <th class="num">Porcií živnostníkov</th><th class="num">Bez DPH</th>
      <th class="num">DPH</th><th class="num">Na firemnú faktúru</th></tr></thead>
    <tbody>${riadky.map(r => {
      const suma = naFakturu(r);
      const vsetko = r.fakturuje === "firme" || !r.ziv.porcie;
      return `<tr>
        <td>${esc(r.firma ?? "—")}</td>
        <td>${esc(r.jedalen)}</td>
        <td class="num">${r.zam.porcie}</td>
        <td class="num">${r.ziv.porcie}${r.ziv.porcie && r.fakturuje === "priamo"
          ? ' <span class="hint">fakturuje sa im priamo</span>' : ""}</td>
        <td class="num">${eur(naCenty(vsetko ? r.zam.bezDph + r.ziv.bezDph : r.zam.bezDph))}</td>
        <td class="num">${eur(naCenty(vsetko ? r.zam.dph + r.ziv.dph : r.zam.dph))}</td>
        <td class="num"><strong>${eur(naCenty(suma))}</strong>${
          r.ziv.porcie && !r.fakturuje ? ' <span class="badge adm">bez živnostníkov?</span>' : ""}</td>
      </tr>`;
    }).join("")}</tbody></table></div>`;
}

export async function zobraz(k) {
  const prvy = prvyVMesiaci(k.url.searchParams.get("mesiac") || dnes());
  const firmaId = Number(k.url.searchParams.get("firma")) || null;

  const firmy = await vsetky("SELECT id, nazov FROM firma WHERE aktivna ORDER BY nazov");
  const { ludia, nastavenia, zaklad, naFakturu } = await podklad(prvy, { firmaId });
  const zamok = await jeden("SELECT * FROM mesiac_stav WHERE mesiac = $1", [prvy]);
  const uzSpatne = await poctySpatnych(prvy);
  const otvoreny = !zamok?.mzdy_uzavrete;
  const mesiacSkoncil = prvy < prvyVMesiaci(dnes());
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");

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
    const kluc = c.firmaId ?? 0;
    if (!poFirmach.has(kluc)) poFirmach.set(kluc, { nazov: c.firma ?? "Bez firmy", ludia: [] });
    poFirmach.get(kluc).ludia.push(c);
  }

  k.html(k.odp, 200, stranka({
    titulok: "Mesačný podklad", osoba: k.osoba, cesta: "/mesiac", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Mesačný podklad</h2>
    <span class="who">${esc(mesiacPopis(prvy))}${otvoreny ? " · odhad" : " · uzavretý"}</span>
  </div>

  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

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

  ${[...poFirmach].map(([id, f]) => `
  <div class="card">
    <div class="card-head"><h3>${esc(f.nazov)}</h3>
      <span class="hint">zamestnanci — podklad pre mzdy</span></div>
    ${tabulka(f.ludia)}
    ${id ? `<div class="btn-row" style="margin-top:14px">
      <a class="btn" href="/export/mzdy?mesiac=${prvy.slice(0, 7)}&firma=${id}&tvar=xlsx">Stiahnuť pre mzdy (XLSX)</a>
      <a class="btn" href="/export/mzdy?mesiac=${prvy.slice(0, 7)}&firma=${id}&tvar=csv">CSV</a>
    </div>` : `<p class="hint" style="margin:14px 0 0">Títo ľudia nemajú zaradenú firmu,
      takže nie sú v žiadnom mzdovom podklade. Doplňte firmu v <a href="/ludia">Ľuďoch</a>.</p>`}
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
    <div class="card-head"><h3>Čo očakávať na faktúre</h3>
      <span class="hint">po jedálňach</span></div>
    ${tabulkaFaktur(naFakturu)}
    <p class="hint" style="margin:12px 0 0">Toto je číslo, ktoré sa porovnáva s papierom.
      Počíta sa z porcií a z ceny odfotenej na objednávke, nie z podielov ľudí —
      preto sa nemusí na cent zhodovať so súčtom stĺpca <em>Cena bez DPH</em> vyššie,
      ktorý je zaokrúhlený raz za mesiac za každého človeka.${
      naFakturu.some(r => r.ziv.porcie && !r.fakturuje)
        ? ` <strong>Pri jedálni, ktorá má porcie živnostníkov, nie je nastavené, komu ich
            fakturuje</strong> — dopĺňa sa v <a href="/ciselniky">Číselníkoch</a>. Kým to tam
            nie je, tu je uvedená suma bez nich.` : ""}</p>
  </div>

  <div class="card">
    <div class="card-head"><h3>Súhrn po prevádzkach</h3>
      <span class="hint">tie isté čísla, iné triedenie</span></div>
    ${tabulkaPrevadzok(poPrevadzkach(ludia))}
    <p class="hint" style="margin:12px 0 0">V stĺpci <em>Stálo firmu</em> sú aj živnostníci —
      u nich tá istá suma nejde ako príspevok, ale ako odmena na ich faktúre, a firmu
      stojí rovnako. V <em>Zrážkach</em> nie sú: zo mzdy sa im nestrháva nič.</p>
  </div>

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

  <div class="card">
    <div class="card-head"><h3>Uzávierka mesiaca</h3><span class="hint">dva zámky</span></div>
    <div class="note">Mzdová uzávierka <strong>nečaká na faktúru</strong>. Appka pozná presný
      počet porcií, lebo ho sama odoslala — nepotrebuje ho od nikoho potvrdiť. Fakturačná
      kontrola sa zamyká, až keď faktúra príde a rozdiely sú vyriešené; rozdiel ide ako
      opravná položka do najbližšieho otvoreného mesiaca. Tvrdý mzdový termín tak
      neprehráva s termínom, ktorý neriadime.</div>
    <div class="scroll-x"><table class="data"><tbody>
      ${[["mzdy", "Mzdová uzávierka", "do 5.–6. dňa · podklad pre mzdy",
          zamok?.mzdy_uzavrete, zamok?.mzdy_kedy],
         ["faktury", "Fakturačná kontrola", "keď príde faktúra a rozdiely sú vyriešené",
          zamok?.faktury_uzavrete, zamok?.faktury_kedy]].map(([kluc, nazov, kedy, hotovo, cas]) => `
      <tr>
        <td><strong>${esc(nazov)}</strong><div class="podriadok">${esc(kedy)}</div></td>
        <td>${hotovo
          ? `<span class="badge ok">uzavreté</span>${cas
              ? ` <span class="hint">${esc(dlhy(String(cas).slice(0, 10)))}</span>` : ""}`
          : '<span class="badge">otvorené</span>'}</td>
        <td class="akcie">${!mesiacSkoncil && !hotovo
          ? '<span class="hint">mesiac ešte beží</span>'
          : `<form method="post" action="/mesiac/${hotovo ? "otvorit" : "uzavriet"}" class="riadok-akcia">
              <input type="hidden" name="znamka" value="${esc(k.csrf)}">
              <input type="hidden" name="mesiac" value="${prvy.slice(0, 7)}">
              <input type="hidden" name="zamok" value="${kluc}">
              <button class="btn${hotovo ? "" : " primary"}" type="submit">${
                hotovo ? "Otvoriť späť" : "Uzavrieť"}</button>
            </form>`}</td>
      </tr>`).join("")}
    </tbody></table></div>
    ${!mesiacSkoncil ? `<p class="hint" style="margin:12px 0 0">Bežiaci mesiac sa zamknúť nedá —
      zafixoval by sa podklad, do ktorého ešte pribudnú obedy. Zámky sa sprístupnia
      prvým dňom nasledujúceho mesiaca.</p>` : ""}
  </div>
</section>`
  }));
}

/* ---------- zámky ---------- */

/* Zámok sa dá zavrieť aj otvoriť, ale nie ticho: každý pohyb ide do auditu.
   Otvorenie uzavretého mesiaca je výnimka, nie bežný krok — podklad už mohol
   odísť mzdárke a od tej chvíle sa dve čísla rozchádzajú. */
const ZAMKY = {
  mzdy: { stlpec: "mzdy_uzavrete", cas: "mzdy_kedy", nazov: "Mzdová uzávierka" },
  faktury: { stlpec: "faktury_uzavrete", cas: "faktury_kedy", nazov: "Fakturačná kontrola" }
};

async function prepni(k, na) {
  const prvy = prvyVMesiaci(k.data.mesiac || dnes());
  const z = ZAMKY[k.data.zamok];
  const spat = (kluc, t) => k.inam(k.odp,
    `/mesiac?mesiac=${prvy.slice(0, 7)}&${kluc}=` + encodeURIComponent(t));
  if (!z) return spat("chyba", "Taký zámok neexistuje.");

  if (na && prvy >= prvyVMesiaci(dnes()))
    return spat("chyba", `${z.nazov} sa nedá uzavrieť — mesiac ešte beží a pribudnú doň obedy.`);

  const stav = await jeden("SELECT * FROM mesiac_stav WHERE mesiac = $1", [prvy]);
  if (Boolean(stav?.[z.stlpec]) === na)
    return spat("chyba", `${z.nazov} už ${na ? "je uzavretá" : "je otvorená"}.`);

  await jeden(`
    INSERT INTO mesiac_stav (mesiac, ${z.stlpec}, ${z.cas}) VALUES ($1, $2, $3)
    ON CONFLICT (mesiac) DO UPDATE SET ${z.stlpec} = EXCLUDED.${z.stlpec}, ${z.cas} = EXCLUDED.${z.cas}
    RETURNING mesiac`, [prvy, na, na ? new Date() : null]);
  await zapis(k.osoba.id, `mesiac.${k.data.zamok}.${na ? "uzavrete" : "otvorene"}`, { mesiac: prvy });

  return spat("sprava", na
    ? `${z.nazov} je uzavretá. Spätný zápis do tohto mesiaca už neprejde; oprava ide ako ` +
      "položka do najbližšieho otvoreného mesiaca."
    : `${z.nazov} je znovu otvorená. Ak podklad už odišiel, pri zmene čísel ho treba poslať znova.`);
}

export const uzavriet = k => prepni(k, true);
export const otvorit  = k => prepni(k, false);
