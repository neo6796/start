/* Prehliadka: skutočné obrazovky appky zabalené do jedného súboru, ktorý sa
   otvorí v prehliadači bez servera aj bez databázy.

   Načo: keď sa človek nevie dostať na server (cudzí počítač, žiadny kľúč),
   toto je jediný spôsob, ako mu ukázať, ako appka naozaj vyzerá — nie obrázok,
   ale samotné HTML aj s vlastným vzhľadom.

   Čo v nej funguje a čo nie: zaškrtávanie, prepínače, rozbaľovacie zoznamy aj
   rozkliknutia áno — to všetko robí prehliadač sám. Uloženie nie, lebo nemá
   komu odpovedať. Preto to hovorí rovno, keď to niekto skúsi.

     node test/prehliadka.mjs [cieľový súbor]

   Beží proti bežiacej skúšobnej appke (./test/obnov.sh + skúšky 01–09, aby
   v nej boli dáta). */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const A = process.env.ADRESA ?? "http://localhost:3111";
const KOD = process.env.KOD ?? "4021";
const HESLO = process.env.HESLO ?? "skusobne-heslo";
const CIEL = process.argv[2] ?? "prehliadka.html";

/* Budúci týždeň — v ňom nie je matica zamknutá dennými uzávierkami, takže je
   na nej vidieť, ako sa vyberá jedlo. */
const d = new Date();
d.setDate(d.getDate() + 7 - ((d.getDay() + 6) % 7));
const TYZ = d.toISOString().slice(0, 10);
const m = new Date(d.getFullYear(), d.getMonth() - 1, 1);
const MES = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;

const OBRAZOVKY = [
  ["tim",       "Môj tím",      `/tim?tyzden=${TYZ}&pohlad=vsetci`,
   "Matica predáka. Trojstavový deň: prázdne = nikto nekonal, × = nechce obed, písmeno alebo číslo = zvolené jedlo."],
  ["moje",      "Môj týždeň",   "/moje",
   "To isté očami stravníka — vidí len seba a zatiaľ len číta."],
  ["timy",      "Tímy",         "/timy",
   "Tím je entita: tu sa mu prideľujú ľudia aj predáci. Rola je výber, odobratie má vlastný stĺpec."],
  ["menu",      "Menu",         "/menu",
   "Ponuka na týždeň za obe jedálne pod sebou. Názvy jedál sa čítajú z prílohy alebo z vloženého textu."],
  ["uzavierka", "Uzávierka",    `/uzavierka?tyzden=${TYZ}`,
   "Počty po jedlách, kto sa nevyjadril, a znenie správy skôr, než odíde do kuchyne."],
  ["spatne",    "Spätný zápis", `/spatne?mesiac=${MES}`,
   "Dopísanie obeda, ktorý sa už zjedol. Dodávateľovi sa neposiela nič."],
  ["ludia",     "Ľudia",        "/ludia",
   "Menoslov, hromadné priradenie väzieb a heslá."]
];

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const p = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await p.goto(A + "/prihlasenie");
await p.fill("#kod", KOD); await p.fill("#heslo", HESLO);
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

const strany = [];
for (const [id, nazov, cesta, popis] of OBRAZOVKY) {
  await p.goto(A + cesta);
  await p.waitForLoadState("networkidle");
  /* Berie sa len obsah — hlavičku aj pruh si prehliadka kreslí vlastné,
     spoločné pre všetky obrazovky. */
  const html = await p.evaluate(() => document.querySelector("main")?.innerHTML ?? "");
  strany.push({ id, nazov, popis, html });
  console.log("  ·", nazov);
}
await b.close();

const css = readFileSync(new URL("../public/obedar.css", import.meta.url), "utf8");
const znacka = `<svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r="24" fill="none" stroke="#EFF3F2" stroke-width="3"/>
  <path d="M32,32 L32,8 A24,24 0 0,1 54.83,24.58 Z" fill="#E0A233"/>
  <g stroke="#EFF3F2" stroke-width="3" stroke-linecap="round">
    <line x1="32" y1="32" x2="32" y2="8"/><line x1="32" y1="32" x2="54.83" y2="24.58"/>
    <line x1="32" y1="32" x2="46.10" y2="51.42"/><line x1="32" y1="32" x2="17.90" y2="51.42"/>
    <line x1="32" y1="32" x2="9.17" y2="24.58"/>
  </g></svg>`;

const dnes = new Date().toISOString().slice(0, 10);

writeFileSync(CIEL, `<title>Prehliadka Obedára</title>
<style>
${css}

/* ---------- čo patrí len prehliadke ---------- */
  .pruh{
    position:fixed;top:0;left:0;right:0;z-index:60;
    background:var(--mustard);color:#fff;
    font-family:var(--mono);font-size:11.5px;letter-spacing:.08em;
    text-align:center;padding:6px 12px;
  }
  body{padding-top:28px}
  .tabs button{
    font-family:var(--mono);font-size:12.5px;letter-spacing:.04em;
    background:transparent;color:var(--bar-dim);
    border:1px solid transparent;border-radius:var(--r);
    padding:6px 11px;cursor:pointer;
  }
  .tabs button:hover{color:var(--bar-fg)}
  .tabs button[aria-current="page"]{
    background:var(--bar-sel);color:var(--bar-sel-fg);font-weight:700;
  }
  .tabs button:focus-visible{outline:2px solid var(--mustard);outline-offset:1px}
  .obr[hidden]{display:none}
  .popis{
    max-width:var(--sirka);margin:0 auto;padding:18px 20px 0;
    color:var(--ink-2);font-size:14px;
  }
  .popis strong{color:var(--ink)}
  /* Hláška pri pokuse o uloženie. Sadá tam, kde človek klikol, nie hore —
     inak by ju prehliadol. */
  .nejde{
    display:block;margin-top:10px;padding:9px 12px;
    border:1px solid var(--mustard);border-radius:var(--r);
    background:var(--mustard-soft);color:var(--mustard);
    font-size:13.5px;
  }
</style>

<div class="pruh">Prehliadka · klikať sa dá, ukladať nie · stav k ${dnes}</div>

<div class="topbar">
  <div class="wrap wide">
    <span class="brand">${znacka}<span class="brand-name">Obedár</span></span>
    <div class="tabs">${strany.map((s, i) =>
      `<button type="button" data-obr="${s.id}"${i === 0 ? ' aria-current="page"' : ""}>${s.nazov}</button>`
    ).join("")}</div>
  </div>
</div>

<main>
${strany.map((s, i) => `<section class="obr" id="obr-${s.id}"${i ? " hidden" : ""}>
  <p class="popis"><strong>${s.nazov}.</strong> ${s.popis}</p>
  ${s.html}
</section>`).join("\n")}
</main>

<script>
/* Prepínanie obrazoviek. */
const tlacidla = [...document.querySelectorAll(".tabs button")];
function ukaz(id) {
  for (const s of document.querySelectorAll(".obr")) s.hidden = s.id !== "obr-" + id;
  for (const t of tlacidla)
    t.dataset.obr === id ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current");
  window.scrollTo(0, 0);
}
for (const t of tlacidla) t.addEventListener("click", () => ukaz(t.dataset.obr));

/* Odkazy vnútri appky vedú na server, ktorý tu nie je. Kam sa dá, prepne sa
   na tú obrazovku; inak sa povie, že tadiaľ cesta nevedie. */
const KAM = { "/tim": "tim", "/moje": "moje", "/timy": "timy", "/menu": "menu",
              "/uzavierka": "uzavierka", "/spatne": "spatne", "/ludia": "ludia" };
document.addEventListener("click", e => {
  const a = e.target.closest("a[href^='/']");
  if (!a) return;
  e.preventDefault();
  const ciel = KAM[new URL(a.href, location.origin).pathname];
  if (ciel) ukaz(ciel); else povedz(a, "Sem prehliadka nesiaha — otvorí sa to až v appke.");
});

/* Uloženie nemá komu odpovedať. Povedať to je lepšie než nechať tlačidlo,
   ktoré vyzerá, že funguje. */
function povedz(kde, text) {
  const stary = kde.parentElement.querySelector(":scope > .nejde");
  if (stary) stary.remove();
  const s = document.createElement("span");
  s.className = "nejde";
  s.setAttribute("role", "status");
  s.textContent = text;
  kde.insertAdjacentElement("afterend", s);
}
for (const f of document.querySelectorAll("form")) {
  f.addEventListener("submit", e => {
    e.preventDefault();
    povedz(e.submitter ?? f, "Toto je prehliadka — uloží sa to až v appke na serveri.");
  });
}
</script>
`);

console.log("\n✔ " + CIEL + " — " +
  (readFileSync(CIEL).length / 1024).toFixed(0) + " kB, " + strany.length + " obrazoviek");
