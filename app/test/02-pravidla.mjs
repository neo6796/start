/* Skúšky v skutočnom prehliadači. Púšťa sa proti čistej databáze:
     ./test/obnov.sh && node test/01-ciselniky-import.mjs && node test/02-pravidla.mjs
   Heslo a adresa sa dajú prebiť premennými HESLO a ADRESA. */
import { chromium } from "playwright";
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
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

console.log("— pravidlo o pôvode —");
await p.goto(A + "/ludia");
await p.click("tr:has-text('Kováčová') a:has-text('Upraviť')");
ok("detail ukazuje pôvod z importu", (await p.content()).includes("<strong>import</strong>"));
await p.fill("#p-priezvisko", "Kováčová-Nová");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
ok("ručná oprava uložená", (await p.content()).includes("Uložené"));
ok("pôvod sa prepol na ručne", (await p.content()).includes("<strong>ručne</strong>"));

await p.goto(A + "/ludia");
await p.fill("#p-riadky", "1042;Kováčová;Jana");
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
let t = await p.content();
ok("import ručne opravené meno neprepísal", t.includes("Ručne zadané mená sa neprepísali"));
ok("v zozname ostalo ručné meno", t.includes("Kováčová-Nová"));

console.log("— hromadné priradenie —");
await p.goto(A + "/ludia");
for (const ch of await p.locator('input[name="kto"]').all()) await ch.check();
await p.selectOption("#p-firma_id", { label: "Cronus" });
await p.selectOption("#p-tim_id", { label: "Údržba" });
await p.click("button:has-text('Priradiť označeným')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("hromadné priradenie ohlásené", /Nastavené \d+ ľuďom/.test(t));
ok("firma sa zapísala", (await p.locator("td:has-text('Cronus')").count()) >= 4);
ok("upozornenie na bez zaradenia zmizlo", !t.includes("Bez zaradenia:"));

console.log("— nič neoznačené —");
await p.goto(A + "/ludia");
await p.click("button:has-text('Priradiť označeným')");
await p.waitForLoadState("networkidle");
ok("prázdny výber odmietnutý", (await p.content()).includes("Nikto nebol označený"));

console.log("— posledný správca —");
await p.goto(A + "/ludia");
await p.click("tr:has-text('Solár') a:has-text('Upraviť')");
await p.uncheck('input[name="je_admin"]');
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("posledného správcu appka nepustí", t.includes("bol by to posledný"));
ok("rola ostala zapnutá", await p.locator('input[name="je_admin"]').isChecked());

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
