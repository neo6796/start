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
/* Predáctvo je funkcia tímu, nie vlastnosť človeka — v karte stravníka
   preto nie je čo zaškrtávať. */
ok("v detaile človeka nie je nič o predákovi",
   (await p.locator('input[name="je_predak"]').count()) === 0 &&
   (await p.locator('select[name="predak_id"]').count()) === 0);

await p.goto(A + "/timy");
await p.fill("#t-novy", "Tím Sever");
await p.click("form[action='/timy/pridat'] button[type=submit]");
await p.waitForLoadState("networkidle");
ok("tím sa založil", /Tím Sever/.test(await p.content()));

const karta = () => p.locator("div.card:has(h3:text-is('Tím Sever'))");
await karta().locator('select[name="novy_predak"]').selectOption({ label: "Sedlák Ivan" });
await karta().locator("button:has-text('Uložiť')").click();
await p.waitForLoadState("networkidle");
ok("predák sa priradil tímu",
   (await karta().locator('input[name="predak"]:checked').count()) === 1);

/* Ľudia sa do tímu pridávajú priamo pri tíme — bez preklikávania po jednom. */
await p.goto(A + "/timy");
for (const ch of await karta().locator('input[name="clen"]').all()) await ch.check();
await karta().locator("button:has-text('Uložiť')").click();
await p.waitForLoadState("networkidle");
ok("ľudia sa priradili z obrazovky tímu", /Tím Sever: \d+ ľud/.test(await p.content()));

await p.goto(A + "/ludia");
t = await p.content();
/* Predák je pri názve tímu, nie vo vlastnom stĺpci — opakovať to isté meno
   v každom riadku bol len šum. */
ok("predák sa v zozname ľudí ukazuje pri tíme",
   (await p.locator("tr:has-text('Vargová') .podriadok").innerText()).includes("Sedlák Ivan"));
ok("hromadné priradenie už predáka neponúka",
   (await p.locator('select[name="predak_id"]').count()) === 0);

console.log("— zloženie tímu na jednom mieste —");
/* Kto tím vedie a kto v ňom je, musí byť vidieť naraz — inak sa to dá
   zistiť len prechádzaním tímov po jednom. */
await p.goto(A + "/ludia");
const prehlad = p.locator("div.card:has(h3:text-is('Tímy'))");
ok("nad zoznamom ľudí je prehľad tímov", (await prehlad.count()) === 1);
ok("aj s predákom", (await prehlad.innerText()).includes("Sedlák Ivan"));

await p.goto(A + "/timy");
await p.fill("#t-novy", "Tím Juh");
await p.click("form[action='/timy/pridat'] button[type=submit]");
await p.waitForLoadState("networkidle");
/* Tím, ktorý nikto nevedie, sa nesmie tváriť rovnako ako ostatné — jeho
   matica sa nikomu neukáže. */
ok("tím bez predáka to povie",
   (await p.locator("div.card:has(h3:text-is('Tím Juh'))").innerText()).includes("nikto nevedie"));

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
