/* Vykresľovanie HTML. Žiadny šablónovací systém — na desiatku obrazoviek
   je to zbytočná vrstva. Jediné pravidlo: do stránky sa nič nedostane inak
   než cez esc(), aby priezvisko s apostrofom nerozbilo stránku. */

const NAHRADY = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[&<>"']/g, z => NAHRADY[z]);
}

/* Značka: to isté koliesko ako v preview. */
const ZNACKA = `<svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="24" fill="none" stroke="#EFF3F2" stroke-width="3"/>
  <path d="M32,32 L32,8 A24,24 0 0,1 54.83,24.58 Z" fill="#E0A233"/>
  <g stroke="#EFF3F2" stroke-width="3" stroke-linecap="round">
    <line x1="32" y1="32" x2="32" y2="8"/>
    <line x1="32" y1="32" x2="54.83" y2="24.58"/>
    <line x1="32" y1="32" x2="46.10" y2="51.42"/>
    <line x1="32" y1="32" x2="17.90" y2="51.42"/>
    <line x1="32" y1="32" x2="9.17" y2="24.58"/>
  </g>
</svg>`;

/* Ponuka sa skladá podľa roly — stravník o obrazovkách predáka nevie. */
function polozky(osoba) {
  const p = [["/moje", "Môj týždeň"]];
  if (osoba.je_predak) p.unshift(["/tim", "Môj tím"]);
  if (osoba.je_predak || osoba.je_admin) p.push(["/menu", "Menu"]);
  if (osoba.je_admin) p.push(["/ludia", "Ľudia"], ["/timy", "Tímy"],
                             ["/ciselniky", "Číselníky"], ["/uzavierka", "Uzávierka"],
                             ["/spatne", "Spätný zápis"]);
  return p;
}

export function meno(o) {
  return `${o.meno} ${o.priezvisko}`;
}

/* Slovenčina má tri tvary: 1 predák · 2 predáci · 5 predákov.
   „1 predákov" v hlavičke obrazovky vyzerá ako chyba a je to chyba. */
export function mnoho(n, [jeden, dvaAzStyri, patAViac]) {
  const tvar = n === 1 ? jeden : (n >= 2 && n <= 4) ? dvaAzStyri : patAViac;
  return `${n} ${tvar}`;
}

function rola(o) {
  if (o.je_admin) return "správca";
  if (o.je_predak) return "predák";
  return "stravník";
}

/* Pruh na testovacej kópii. Dve rovnaké appky vedľa seba sú návod na to, ako
   raz niekto zmení ostré dáta v presvedčení, že skúša — alebo naopak nájde
   chybu, ktorá „sa nedeje", lebo ju hľadal na kópii. Preto to musí byť vidieť
   na každej obrazovke, nielen v drobnom čísle verzie dole. */
const PRUH = (process.env.PRUH ?? "").trim();
const pruh = PRUH
  ? `<div class="pruh" role="status">${esc(PRUH)}</div>`
  : "";
/* Trieda na <body>, aby si stránka pod pruhom spravila miesto. Bez nej by
   pruh ležal na hlavičke — a na prihlasovacej obrazovke, ktorá centruje
   obsah zvislo, by sa zaradil vedľa karty. */
const telo = PRUH ? " s-pruhom" : "";

/* Celá stránka. `cesta` je aktuálna cesta, aby sa zvýraznila záložka. */
export function stranka({ titulok, osoba, cesta, obsah, siroka = false, verzia = "" }) {
  const zalozky = osoba
    ? polozky(osoba).map(([c, n]) =>
        `<a class="tab" href="${c}"${c === cesta ? ' aria-current="page"' : ""}>${esc(n)}</a>`
      ).join("")
    : "";

  /* Meno vedie na zmenu vlastného hesla. Vlastná záložka by v ponuke zavadzala
     každý deň kvôli veci, ktorú človek spraví raz za rok; pri mene ju hľadá
     ten, kto ju potrebuje. */
  const vpravo = osoba
    ? `<form method="post" action="/odhlasenie" class="odhlas">
         <a class="kto" href="/heslo" title="Zmeniť si heslo"
            >${esc(meno(osoba))} · ${esc(rola(osoba))}</a>
         <button class="tab" type="submit">Odhlásiť</button>
       </form>`
    : "";

  return `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${esc(titulok)} · Obedár</title>
<link rel="stylesheet" href="/static/obedar.css?v=${esc(verzia)}">
<link rel="icon" href="/static/ikona.svg">
</head>
<body class="${telo.trim()}">
${pruh}
<div class="topbar">
  <div class="wrap${siroka ? " wide" : ""}">
    <a class="brand" href="/">
      ${ZNACKA}
      <span class="brand-name">Obedár</span>
    </a>
    <div class="tabs">${zalozky}</div>
    ${vpravo}
  </div>
</div>

<main>
${obsah}
</main>

</body>
</html>`;
}

/* Obrazovka bez ponuky — prihlásenie, chybové stránky. */
export function holaStranka({ titulok, obsah, verzia = "" }) {
  return `<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${esc(titulok)} · Obedár</title>
<link rel="stylesheet" href="/static/obedar.css?v=${esc(verzia)}">
<link rel="icon" href="/static/ikona.svg">
</head>
<body class="hola${telo}">
${pruh}
<main>
${obsah}
</main>
</body>
</html>`;
}
