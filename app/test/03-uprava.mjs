/* Úprava číselníkov a predák na tíme.
     ./test/obnov.sh && node test/03-uprava.mjs */
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

console.log("— úprava jedálne —");
await p.goto(A + "/ciselniky");
await p.click("tr:has-text('GASTROGAL') a:has-text('Upraviť')");
ok("formulár má načítané hodnoty", await p.inputValue("#p-u-nazov") === "GASTROGAL");
ok("cena je predvyplnená", (await p.inputValue("#p-u-cena_s_dph")).startsWith("6.3"));
await p.fill("#p-u-email", "objednavky@gastrogal.sk");
await p.fill("#p-u-cena_s_dph", "6.50");
await p.fill("#p-u-odhlasenie_do", "07:00");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
ok("uloženie potvrdené", (await p.content()).includes("Uložené"));
ok("e-mail sa zapísal", await p.inputValue("#p-u-email") === "objednavky@gastrogal.sk");

await p.goto(A + "/ciselniky");
let t = await p.content();
ok("nová cena je v zozname", t.includes("6,50 €"));
ok("nový čas odhlásenia je v zozname", t.includes("07:00"));

console.log("— oprava preklepu vo firme —");
await p.goto(A + "/ciselniky");
await p.click("tr:has-text('Cronus') a:has-text('Upraviť')");
await p.fill("#p-u-nazov", "Cronus s.r.o.");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
await p.goto(A + "/ciselniky");
ok("premenovanie firmy prešlo", (await p.content()).includes("Cronus s.r.o."));

console.log("— duplicitný názov pri úprave —");
await p.click("tr:has-text('Adiumentum') a:has-text('Upraviť')");
await p.fill("#p-u-nazov", "Cronus s.r.o.");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
ok("duplicita odmietnutá", (await p.content()).includes("už existuje"));

console.log("— predák patrí tímu —");
await p.goto(A + "/ludia");
await p.fill("#p-riadky", "3001;Vargová;Zuzana\n3002;Sedlák;Ivan");
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");

await p.click("tr:has-text('Sedlák') a:has-text('Upraviť')");
ok("v detaile človeka už nie je výber predáka",
   (await p.locator('select[name="predak_id"]').count()) === 0);
await p.check('input[name="je_predak"]');
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

await p.goto(A + "/ciselniky");
await p.click("details:has(input[value=tim]) summary");
await p.fill("form.pridat:has(input[value=tim]) #p-tim-nazov", "Tím Sever");
await p.selectOption("form.pridat:has(input[value=tim]) #p-tim-predak_id", { label: "Sedlák Ivan" });
await p.click("form.pridat:has(input[value=tim]) button[type=submit]");
await p.waitForLoadState("networkidle");
ok("tím sa založil aj s predákom",
   (await p.locator("tr:has-text('Tím Sever'):has-text('Sedlák Ivan')").count()) === 1);

await p.goto(A + "/ludia");
for (const ch of await p.locator('input[name="kto"]').all()) await ch.check();
await p.selectOption("#p-tim_id", { label: "Tím Sever" });
await p.click("button:has-text('Priradiť označeným')");
await p.waitForLoadState("networkidle");
t = await p.content();
/* Predák je pri názve tímu, nie vo vlastnom stĺpci — opakovať to isté meno
   v každom riadku bol len šum. */
ok("predák sa v zozname ľudí ukazuje pri tíme",
   (await p.locator("tr:has-text('Vargová') .podriadok").innerText()).includes("Sedlák Ivan"));
ok("hromadné priradenie už predáka neponúka",
   (await p.locator('select[name="predak_id"]').count()) === 0);

console.log("— zloženie tímu na jednom mieste —");
/* Predák bol v číselníku a členovia v zozname ľudí. Skontrolovať, či je
   každý niekde zaradený, sa dalo len prechádzaním tímov po jednom. */
await p.goto(A + "/ciselniky");
const riadokTimu = p.locator("tr:has-text('Tím Sever')");
ok("pri tíme je predák", (await riadokTimu.innerText()).includes("Sedlák Ivan"));
ok("aj počet ľudí", (await riadokTimu.locator("details.clenovia summary").innerText()).includes("ľud"));
await riadokTimu.locator("details.clenovia > summary").click();
const mena = await riadokTimu.locator("ul.zoznam-clenov li").allInnerTexts();
ok("po rozkliknutí sú v ňom mená", mena.length >= 2);
ok("aj s osobným číslom", /\d{3,}/.test(mena.join(" ")));
ok("a je medzi nimi ten, koho sme priradili",
   mena.some(x => x.includes("Vargová Zuzana")));

await p.goto(A + "/ciselniky");
await p.click("details:has(input[value=tim]) summary");
await p.fill("form.pridat:has(input[value=tim]) #p-tim-nazov", "Tím Juh");
await p.click("form.pridat:has(input[value=tim]) button[type=submit]");
await p.waitForLoadState("networkidle");
/* Prázdny tím sa nesmie tváriť rovnako ako plný — práve on je ten,
   ktorý treba nájsť. */
ok("prázdny tím to povie",
   (await p.locator("tr:has-text('Tím Juh')").innerText()).includes("nikto"));

console.log("— prázdne polia —");
await p.goto(A + "/ciselniky");
await p.click("tr:has-text('GASTRO ABM') a:has-text('Upraviť')");
await p.fill("#p-u-sadzba_dph", "");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
ok("povinné pole sa nedá vymazať a povie prečo",
   (await p.content()).includes("sa nedá vymazať"));

await p.goto(A + "/ciselniky");
await p.click("tr:has-text('GASTRO ABM') a:has-text('Upraviť')");
await p.fill("#p-u-telefon", "0905 123 456");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
await p.fill("#p-u-telefon", "");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
ok("nepovinné pole sa vymazať dá", await p.inputValue("#p-u-telefon") === "");

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
