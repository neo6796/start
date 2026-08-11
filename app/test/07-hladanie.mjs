/* Hľadanie, filtre a neaktívni ľudia.
     ./test/obnov.sh && node test/01… && … && node test/07-hladanie.mjs */
import { chromium } from "playwright";
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const c = await b.newContext({ viewport: { width: 1400, height: 950 } });
const p = await c.newPage();
const chyby = [];
p.on("pageerror", e => chyby.push("JS: " + e.message));
p.on("response", r => { if (r.status() >= 500) chyby.push(r.status() + " " + r.url()); });
const A = process.env.ADRESA ?? "http://localhost:3111";
const KOD = process.env.KOD ?? "4021";
const HESLO = process.env.HESLO ?? "skusobne-heslo";
let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };
const riadkov = () => p.locator("table.data tbody tr").count();

await p.goto(A + "/prihlasenie");
await p.fill("#kod", KOD); await p.fill("#heslo", HESLO);
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

console.log("— hľadanie —");
await p.goto(A + "/ludia");
const vsetkych = await riadkov();
ok("zoznam má ľudí", vsetkych > 1);

await p.fill("#f-hladaj", "malý");
await p.click("button:has-text('Hľadať')");
await p.waitForLoadState("networkidle");
ok("hľadanie podľa priezviska nájde jedného", await riadkov() === 1);
ok("nezáleží na veľkosti písmen", (await p.content()).includes("Malý"));

await p.fill("#f-hladaj", "0055");
await p.click("button:has-text('Hľadať')");
await p.waitForLoadState("networkidle");
ok("hľadá aj podľa osobného čísla", await riadkov() === 1);

await p.fill("#f-hladaj", "xyzabc");
await p.click("button:has-text('Hľadať')");
await p.waitForLoadState("networkidle");
ok("nič sa nenašlo a povie to", (await p.content()).includes("Nikto nevyhovuje"));
ok("poradí prepnúť stav", (await p.content()).includes("prepnúť"));

await p.click("a:has-text('Zrušiť filtre')");
await p.waitForLoadState("networkidle");
ok("zrušenie filtrov vráti celý zoznam", await riadkov() === vsetkych);

console.log("— neaktívni sa dajú nájsť a vrátiť —");
await p.click("tr:has(td.num:text-is('0055')) a:has-text('Upraviť')");
await p.uncheck('input[name="aktivny"]');
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

await p.goto(A + "/ludia");
ok("neaktívny zmizol z predvoleného pohľadu", await riadkov() === vsetkych - 1);

await p.selectOption("#f-stav", "neaktivni");
await p.click("button:has-text('Hľadať')");
await p.waitForLoadState("networkidle");
ok("prepnutie na neaktívnych ho ukáže", await riadkov() === 1);
ok("má odznak neaktívny", (await p.content()).includes("neaktívny"));

await p.locator('input[name="kto"]').first().check();
await p.selectOption("#p-aktivny", "1");
await p.click("button:has-text('Priradiť označeným')");
await p.waitForLoadState("networkidle");
ok("hromadné vrátenie späť funguje", /Nastavené 1 človeku/.test(await p.content()));
ok("filter po uložení ostal na neaktívnych",
   await p.locator("#f-stav").inputValue() === "neaktivni");
ok("a neaktívnych už niet", await riadkov() === 0);

await p.selectOption("#f-stav", "aktivni");
await p.click("button:has-text('Hľadať')");
await p.waitForLoadState("networkidle");
ok("človek je späť medzi aktívnymi", await riadkov() === vsetkych);

console.log("— filter podľa tímu —");
await p.selectOption("#f-tim", { index: 1 });
await p.click("button:has-text('Hľadať')");
await p.waitForLoadState("networkidle");
ok("filter podľa tímu zúži zoznam", await riadkov() > 0);
ok("výber tímu ostal nastavený", (await p.locator("#f-tim").inputValue()) !== "");

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
