/* Mesačný podklad. Beží po 01–05, používa ich objednávky.

   Tento mesiac ide appka paralelne s papierom, takže tá obrazovka má jednu
   hlavnú povinnosť: **čísla, ktoré sa dajú položiť vedľa hárku mzdárky.**
   Preto sa tu skúša hlavne to, či súčty sedia a či sa nič nestratí. */
import { chromium } from "playwright";

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const c = await b.newContext({ viewport: { width: 1500, height: 950 } });
const p = await c.newPage();
const chyby = [];
p.on("pageerror", e => chyby.push("JS: " + e.message));
p.on("response", r => { if (r.status() >= 500) chyby.push(r.status() + " " + r.url()); });
const A = process.env.ADRESA ?? "http://localhost:3111";
const KOD = process.env.KOD ?? "4021";
const HESLO = process.env.HESLO ?? "skusobne-heslo";
let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };
const naCisla = s => [...String(s).matchAll(/(\d+),(\d{2})\s*€/g)].map(m => Number(m[1]) * 100 + Number(m[2]));

await p.goto(A + "/prihlasenie");
await p.fill("#kod", KOD); await p.fill("#heslo", HESLO);
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

/* Objednávky zo skúšok 04–05 sú v aktuálnom alebo budúcom týždni. */
const d = new Date();
const MES = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

console.log("— obrazovka —");
await p.goto(A + "/mesiac?mesiac=" + MES);
let t = await p.content();
ok("obrazovka existuje", /Mesačný podklad/.test(await p.title()));
ok("vedie k nej záložka", (await p.locator('a.tab[href="/mesiac"]').count()) === 1);
/* Kým mesiac beží, čísla sedia, ale mesiac nie je celý — a musí to byť vidieť. */
ok("otvorený mesiac je označený ako odhad", /odhad/.test(t));
ok("povie, podľa čoho počítal", /Príspevok zamestnávateľa/.test(t) && /55 %/.test(t));
ok("aj cenovú hladinu základnej jedálne", /Cenová hladina/.test(t));

console.log("— podklad je delený po firmách —");
/* Mzdárka pôjde po celých firmách, takže to je základné delenie, nie filter. */
ok("firma je vlastná karta", (await p.locator(".card:has(table.podklad)").count()) >= 1);
ok("filter po firmách existuje", (await p.locator("#f-firma").count()) === 1);
ok("v riadku je osobné číslo aj stredisko",
   /Osobné číslo/.test(t) && /Stredisko/.test(t));
ok("stĺpce sú tie, čo chce mzdárka",
   /Príspevok ZL/.test(t) && /Sociálny fond/.test(t) && /Zrážka zo mzdy/.test(t));

console.log("— súčty sedia —");
/* Toto je celé jadro: čo firma zaplatí jedálni, sa musí rovnať tomu, čo sa
   medzi troch rozdelí. Keby sa to rozišlo, mzdárke nesedí stĺpec. */
/* Jedna konkrétna tabuľka, nie všetky naraz: na stránke je karta na každú
   firmu a k tomu živnostníci, takže riadky jednej a súčet druhej by sa
   porovnávali navzájom. */
const tab = p.locator("table.podklad").first();
const riadky = await tab.locator("tbody tr:not(.sucet)").all();
ok("nejaké riadky tam sú", riadky.length > 0);
let vsetkySedia = true;
for (const r of riadky) {
  const [cena, zl, fond, stravnik] = naCisla(await r.innerText());
  if (cena === undefined) continue;
  if (zl + fond + stravnik !== cena) vsetkySedia = false;
}
ok("v každom riadku dá príspevok + fond + podiel presne cenu", vsetkySedia);

const suc = await tab.locator("tr.sucet").first().innerText();
const [scena, szl, sfond, sstravnik] = naCisla(suc);
ok("a sedí aj súčtový riadok", szl + sfond + sstravnik === scena);
/* Súčet stĺpca musí dať to isté, čo súčet riadkov — mzdárka to sčíta na
   papieri rovnako a musí jej vyjsť to isté číslo. */
let rucne = 0;
for (const r of riadky) { const x = naCisla(await r.innerText()); if (x[0] !== undefined) rucne += x[0]; }
ok("ručný súčet stĺpca dá to isté, čo súčtový riadok", rucne === scena);

console.log("— prázdny mesiac —");
await p.goto(A + "/mesiac?mesiac=2020-01");
ok("povie, že nie je čo spočítať", /nie je čo spočítať/.test(await p.content()));

console.log("— neprihlásený sa sem nedostane —");
const c2 = await b.newContext();
const odp = await c2.request.get(A + "/mesiac", { maxRedirects: 0 });
ok("nemá prístup",
   odp.status() === 403 || odp.status() === 303 || /prihlás/i.test(await odp.text()));

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
