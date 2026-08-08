/* Obrazovky. Kostra — jednotlivé obrazovky pribúdajú v poradí z 11-etapa2-plan.md. */

import { stranka, holaStranka, esc, meno, mnoho } from "./html.js";
import { jeden, vsetky } from "./db.js";

/* ---------- prihlásenie ---------- */

const ZNAK_VELKY = `<svg width="52" height="52" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="3" style="color:var(--petrol)"/>
  <path d="M32,32 L32,8 A24,24 0 0,1 54.83,24.58 Z" fill="var(--mustard)"/>
  <g stroke="var(--surface)" stroke-width="3" stroke-linecap="round">
    <line x1="32" y1="32" x2="32" y2="8"/>
    <line x1="32" y1="32" x2="54.83" y2="24.58"/>
  </g>
  <g stroke="var(--petrol)" stroke-width="3" stroke-linecap="round">
    <line x1="32" y1="32" x2="46.10" y2="51.42"/>
    <line x1="32" y1="32" x2="17.90" y2="51.42"/>
    <line x1="32" y1="32" x2="9.17" y2="24.58"/>
  </g>
</svg>`;

/* Jedno pole na osobné číslo, jedno na heslo. Žiadny výber roly ani zoznam
   používateľov — appka po overení sama vie, kto sa prihlásil (preview, Prihlásenie). */
export function prihlasenieHtml({ chyba = null, kod = "", verzia = "" }) {
  return holaStranka({
    titulok: "Prihlásenie", verzia,
    obsah: `
<section class="prihlas">
  <form class="card" method="post" action="/prihlasenie">
    <div class="prihlas-znak">
      ${ZNAK_VELKY}
      <span class="lw" style="font-size:22px">Obedár</span>
    </div>

    ${chyba ? `<p class="warnbox" role="alert">${esc(chyba)}</p>` : ""}

    <div class="field">
      <label for="kod">Osobné číslo</label>
      <input type="text" id="kod" name="kod" value="${esc(kod)}"
             inputmode="numeric" autocomplete="username" autofocus required>
    </div>
    <div class="field">
      <label for="heslo">Heslo</label>
      <input type="password" id="heslo" name="heslo"
             autocomplete="current-password" required>
    </div>

    <button class="btn primary wide" type="submit">Prihlásiť sa</button>
    <p class="hint" style="text-align:center;margin-top:16px">
      Zabudnuté heslo vie nastaviť správca — nedá sa poslať, dá sa len nové.
    </p>
  </form>
</section>`
  });
}

export function prihlasenieForm(k) {
  if (k.osoba) return k.inam(k.odp, "/");
  k.html(k.odp, 200, prihlasenieHtml({ verzia: k.verzia }));
}

/* ---------- rozpracované obrazovky ---------- */

/* Kým obrazovka nie je hotová, povie to rovno. Prázdna stránka bez vysvetlenia
   vyzerá ako porucha a predák zavolá, že „appka nejde". */
function rozrobene({ titulok, kto, cesta, verzia, krok, coBude, siroka = false }) {
  return stranka({
    titulok, osoba: kto, cesta, verzia, siroka,
    obsah: `
<section class="wrap${siroka ? " wide" : ""}">
  <div class="screen-head">
    <h2>${esc(titulok)}</h2>
    <span class="who">${esc(meno(kto))}</span>
  </div>
  <div class="card">
    <div class="card-head"><h3>Táto obrazovka sa ešte stavia</h3></div>
    <p style="margin:0 0 12px;color:var(--ink-2)">${esc(coBude)}</p>
    <p class="hint" style="margin:0">Krok ${esc(krok)} z plánu druhej etapy.
      Celý cieľový stav je zatiaľ v preview na
      <a href="https://obedy.ahafarma.sk">obedy.ahafarma.sk</a>.</p>
  </div>
</section>`
  });
}

export async function moje(k) {
  k.html(k.odp, 200, rozrobene({
    titulok: "Môj týždeň", kto: k.osoba, cesta: "/moje", verzia: k.verzia, krok: "3",
    coBude: "Prehľad vlastných objednávok na týždeň a možnosť zmeniť ich do uzávierky."
  }));
}

export async function tim(k) {
  k.html(k.odp, 200, rozrobene({
    titulok: "Môj tím", kto: k.osoba, cesta: "/tim", verzia: k.verzia, krok: "3", siroka: true,
    coBude: "Trojstavová matica na týždeň — nerozhodnuté, bez obeda, číslo jedla — a uzávierka týždňa."
  }));
}

/* ---------- správa ---------- */

/* Prvá obrazovka, ktorá naozaj číta z databázy. Nie je ozdoba: po nasadení
   je to jediné miesto, kde sa dá overiť, že sa appka na databázu naozaj
   dostala a že schéma je nabehnutá. */
export async function ciselniky(k) {
  const [firmy, prevadzky, poskytovatelia, timy] = await Promise.all([
    vsetky("SELECT * FROM firma ORDER BY nazov"),
    vsetky("SELECT * FROM prevadzka ORDER BY nazov"),
    vsetky("SELECT * FROM poskytovatel ORDER BY nazov"),
    vsetky("SELECT * FROM tim ORDER BY nazov")
  ]);

  const tabulka = (nadpis, riadky, stlpce, prazdne) => `
  <div class="card">
    <div class="card-head"><h3>${esc(nadpis)}</h3><span class="hint">${riadky.length}</span></div>
    ${riadky.length === 0
      ? `<p class="hint" style="margin:0">${esc(prazdne)}</p>`
      : `<table class="data">
          <thead><tr>${stlpce.map(s => `<th>${esc(s[0])}</th>`).join("")}</tr></thead>
          <tbody>${riadky.map(r =>
            `<tr>${stlpce.map(s => `<td>${esc(s[1](r))}</td>`).join("")}</tr>`).join("")}</tbody>
         </table>`}
  </div>`;

  k.html(k.odp, 200, stranka({
    titulok: "Číselníky", osoba: k.osoba, cesta: "/ciselniky", verzia: k.verzia,
    obsah: `
<section class="wrap">
  <div class="screen-head">
    <h2>Číselníky</h2>
    <span class="who">firmy · prevádzky · jedálne · tímy</span>
  </div>
  ${tabulka("Firmy", firmy, [["Názov", r => r.nazov], ["Stav", r => r.aktivna ? "aktívna" : "neaktívna"]],
            "Zatiaľ žiadna firma. Zakladajú sa ako prvé — bez nich sa nedá zaradiť človek.")}
  ${tabulka("Prevádzky", prevadzky, [["Názov", r => r.nazov], ["Skratka", r => r.skratka],
            ["Stav", r => r.aktivna ? "aktívna" : "neaktívna"]],
            "Zatiaľ žiadna prevádzka.")}
  ${tabulka("Jedálne", poskytovatelia, [["Názov", r => r.nazov],
            ["Cena s DPH", r => Number(r.cena_s_dph).toFixed(2).replace(".", ",") + " €"],
            ["Značenie", r => r.znacenie], ["Jedál", r => r.pocet_jedal],
            ["Model", r => r.model === "eko" ? "ekonomický" : "štandardný"],
            ["Odhlásenie do", r => String(r.odhlasenie_do).slice(0, 5)]],
            "Zatiaľ žiadna jedáleň. Bez nej niet z čoho vyberať ani komu poslať objednávku.")}
  ${tabulka("Tímy", timy, [["Názov", r => r.nazov], ["Stav", r => r.aktivny ? "aktívny" : "neaktívny"]],
            "Zatiaľ žiadny tím.")}
  <div class="card">
    <div class="card-head"><h3>Zakladanie a úpravy</h3></div>
    <p class="hint" style="margin:0">Pribudne v kroku 2. Zatiaľ sa číselníky napĺňajú
      pri nasadení; toto je kontrolný pohľad, či sa appka na databázu dostala.</p>
  </div>
</section>`
  }));
}

export async function ludia(k) {
  const suhrn = await jeden(`
    SELECT count(*)::int AS spolu,
           count(*) FILTER (WHERE je_predak)::int AS predakov,
           count(*) FILTER (WHERE je_admin)::int AS spravcov,
           count(*) FILTER (WHERE firma_id IS NULL OR tim_id IS NULL)::int AS bez_zaradenia
      FROM osoba WHERE aktivny`);

  const ludia = await vsetky(`
    SELECT o.*, f.nazov AS firma, t.nazov AS tim
      FROM osoba o
      LEFT JOIN firma f ON f.id = o.firma_id
      LEFT JOIN tim   t ON t.id = o.tim_id
     WHERE o.aktivny
     ORDER BY o.priezvisko, o.meno`);

  const odznaky = o => [
    o.je_admin ? '<span class="badge adm">správca</span>' : "",
    o.je_predak ? '<span class="badge lead">predák</span>' : "",
    o.vztah === "zivnostnik" ? '<span class="badge ziv">živnostník</span>' : ""
  ].join(" ");

  k.html(k.odp, 200, stranka({
    titulok: "Ľudia", osoba: k.osoba, cesta: "/ludia", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Ľudia</h2>
    <span class="who">${mnoho(suhrn.spolu, ["aktívny", "aktívni", "aktívnych"])}
      · ${mnoho(suhrn.predakov, ["predák", "predáci", "predákov"])}
      · ${mnoho(suhrn.spravcov, ["správca", "správcovia", "správcov"])}</span>
  </div>

  ${suhrn.bez_zaradenia > 0 ? `<div class="warnbox">Bez zaradenia:
    ${mnoho(suhrn.bez_zaradenia, ["človek", "ľudia", "ľudí"])}.
    Kým človek nemá firmu a tím, neobjaví sa v matici predáka.</div>` : ""}

  <div class="card">
    <div class="card-head"><h3>Zoznam</h3><span class="hint">${ludia.length}</span></div>
    ${ludia.length === 0
      ? `<p class="hint" style="margin:0">Zatiaľ nikto. Menoslov sa importuje v kroku 2
           v tvare <code>ID · priezvisko · meno</code>; ostatné sa dopĺňa tu z rozbaľovacích zoznamov.</p>`
      : `<div class="scroll-x"><table class="data">
          <thead><tr><th>Osobné číslo</th><th>Priezvisko a meno</th><th>Firma</th><th>Tím</th><th>Roly</th></tr></thead>
          <tbody>${ludia.map(o => `<tr>
            <td class="num">${esc(o.kod_dochadzka ?? "—")}</td>
            <td>${esc(o.priezvisko)} ${esc(o.meno)}</td>
            <td>${esc(o.firma ?? "—")}</td>
            <td>${esc(o.tim ?? "—")}</td>
            <td>${odznaky(o)}</td>
          </tr>`).join("")}</tbody>
         </table></div>
         <p class="swipe-hint">Tabuľka sa posúva vbok</p>`}
  </div>

  <div class="card">
    <div class="card-head"><h3>Import menoslovu</h3></div>
    <p class="hint" style="margin:0">Pribudne v kroku 2. Import prinesie len identitu;
      ručne zadaný údaj import neprepíše (koncept 1.3b).</p>
  </div>
</section>`
  }));
}

export async function uzavierka(k) {
  k.html(k.odp, 200, rozrobene({
    titulok: "Uzávierka", kto: k.osoba, cesta: "/uzavierka", verzia: k.verzia, krok: "6",
    coBude: "Uzávierka mesiaca v dvoch zámkoch — mzdový podklad do 5.–6. dňa a kontrola faktúry, keď príde."
  }));
}
