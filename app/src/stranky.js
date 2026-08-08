/* Obrazovky. Kostra — jednotlivé obrazovky pribúdajú v poradí z 11-etapa2-plan.md. */

import { stranka, holaStranka, esc, meno, mnoho } from "./html.js";


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

export async function uzavierka(k) {
  k.html(k.odp, 200, rozrobene({
    titulok: "Uzávierka", kto: k.osoba, cesta: "/uzavierka", verzia: k.verzia, krok: "6",
    coBude: "Uzávierka mesiaca v dvoch zámkoch — mzdový podklad do 5.–6. dňa a kontrola faktúry, keď príde."
  }));
}
