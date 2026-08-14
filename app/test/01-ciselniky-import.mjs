/* Skúšky v skutočnom prehliadači. Púšťa sa proti čistej databáze:
     ./test/obnov.sh && node test/01-ciselniky-import.mjs && node test/02-pravidla.mjs
   Heslo a adresa sa dajú prebiť premennými HESLO a ADRESA. */
import { chromium } from "playwright";
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const c = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
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

console.log("— číselníky —");
await p.goto(A + "/ciselniky");
await p.click("details:has(input[value=prevadzka]) summary");
await p.fill("form.pridat:has(input[value=prevadzka]) #p-prevadzka-nazov", "Stredisko Vráble");
await p.fill("form.pridat:has(input[value=prevadzka]) #p-prevadzka-skratka", "VRA");
await p.click("form.pridat:has(input[value=prevadzka]) button[type=submit]");
await p.waitForLoadState("networkidle");
ok("prevádzka pribudla", (await p.content()).includes("Stredisko Vráble"));

/* Tímy majú vlastnú obrazovku — patria k ľuďom, nie medzi číselníky. */
await p.goto(A + "/timy");
await p.fill("#t-novy", "Údržba");
await p.click("form[action='/timy/pridat'] button[type=submit]");
await p.waitForLoadState("networkidle");
ok("tím pribudol", (await p.content()).includes("Údržba"));

// duplicita
await p.fill("#t-novy", "Údržba");
await p.click("form[action='/timy/pridat'] button[type=submit]");
await p.waitForLoadState("networkidle");
ok("duplicitný názov odmietnutý so zrozumiteľnou hláškou",
   (await p.content()).includes("už existuje"));
await p.goto(A + "/ciselniky");

// zneaktívnenie
const predTym = await p.locator("text=neaktívna").count();
await p.locator("tr:has-text('Stredisko Vráble') button:has-text('Zneaktívniť')").click();
await p.waitForLoadState("networkidle");
ok("zneaktívnenie funguje", await p.locator("text=neaktívna").count() > predTym);
await p.locator("tr:has-text('Stredisko Vráble') button:has-text('Obnoviť')").click();
await p.waitForLoadState("networkidle");

console.log("— import menoslovu —");
await p.goto(A + "/ludia");
await p.fill("#p-riadky", "1042;Kováčová;Jana\n2117\tHrušovský\tMartin\n0055,Malý,Ján\nnezmysel\n4021;Solár;Erik");
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
const t = await p.content();
ok("import pridal troch", t.includes("pribudlo 3"));
ok("existujúci správca sa nezdvojil", t.includes("bez zmeny 1"));
ok("nezrozumiteľný riadok ohlásený", t.includes("Nezrozumiteľné riadky"));
ok("úvodná nula zachovaná", (await p.locator("td.num:has-text('0055')").count()) === 1);
ok("tabulátorový riadok prešiel", t.includes("Hrušovský"));

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
