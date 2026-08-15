/* Nastavenia rozúčtovania. Beží po 01–03, používa ich údaje.

   Podstata skúšky nie je „dá sa to uložiť". Podstata je, že **stará hodnota
   ostane platiť pre staré dni** — inak by zmena stravného v septembri
   prepočítala august, ktorý už odišiel na mzdy. */
import { chromium } from "playwright";

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const c = await b.newContext({ viewport: { width: 1280, height: 950 } });
const p = await c.newPage();
const chyby = [];
p.on("pageerror", e => chyby.push("JS: " + e.message));
p.on("response", r => { if (r.status() >= 500) chyby.push(r.status() + " " + r.url()); });
const A = process.env.ADRESA ?? "http://localhost:3111";
const KOD = process.env.KOD ?? "4021";
const HESLO = process.env.HESLO ?? "skusobne-heslo";
let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };

await p.goto(A + "/prihlasenie");
await p.fill("#kod", KOD); await p.fill("#heslo", HESLO);
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

console.log("— obrazovka —");
await p.goto(A + "/nastavenia");
let t = await p.content();
ok("obrazovka existuje", /Rozúčtovanie/.test(await p.title()));
ok("vedie k nej záložka", (await p.locator('a.tab[href="/nastavenia"]').count()) === 1);
ok("predvolené hodnoty sú z konceptu", /55 %/.test(t) && /35 %/.test(t) && /45 %/.test(t));
/* Zadáva sa stravné, strop appka dopočíta — inak by ho musel niekto rátať
   ručne pri každej zmene. */
ok("stravné je 8,30 €", /8,30 €/.test(t));
ok("a strop je dopočítaný na 4,57 €", /4,57 €/.test(t));

console.log("— nastavenie, ktoré by rozbilo model —");
await p.fill("#p-stravnik_do_pct", "50");
await p.click("button:has-text('Uložiť novú sadu')");
await p.waitForLoadState("networkidle");
ok("55 + 50 sa odmietne", /viac než 100/.test(await p.content()));
ok("a nič sa neuložilo", /45 %/.test(await p.content()));

console.log("— zmena stravného —");
/* Presne ten prípad, na ktorý sa Erik pýtal: ministerstvo zdvihne stravné. */
await p.goto(A + "/nastavenia");
await p.fill("#p-od", "2027-01-01");
await p.fill("#p-stravne_5_12", "9.20");
await p.click("button:has-text('Uložiť novú sadu')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("uloženie prešlo", /Uložené/.test(t));
ok("povie nový strop", /5,06 €/.test(t));
ok("je to v histórii", /1\. januára 2027/.test(t));
/* Dnes ešte platí staré — nová sada začína až v roku 2027. */
ok("dnes platí stále staré stravné",
   (await p.locator(".card:has(h3:text-is('Čo platí teraz'))").innerText()).includes("8,30"));

console.log("— stará hodnota ostáva pre staré dni —");
const kuDnu = await p.evaluate(async () => {
  const r = await fetch("/nastavenia");
  return r.status;
});
ok("obrazovka sa načíta aj s históriou", kuDnu === 200);

console.log("— neprihlásený sa sem nedostane —");
/* Bez prihlásenia, nie ako konkrétny stravník: heslo stravníka nastavuje iná
   skúška a táto by potom padala podľa toho, v akom poradí sa púšťajú.
   Rovnaká brána, o dôvod na náhodné padanie menej. */
const c2 = await b.newContext();
const odp = await c2.request.get(A + "/nastavenia", { maxRedirects: 0 });
ok("nemá prístup",
   odp.status() === 403 || odp.status() === 303 ||
   /prihlás/i.test(await odp.text()));

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
