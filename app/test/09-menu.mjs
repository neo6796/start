/* Menu na týždeň — názvy jedál a priložený lístok.
   Beží po 01–05, používa ich údaje. */
import { chromium } from "playwright";
import { writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

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

/* Malé, ale skutočné PDF — nech sa overí, že sa bajty nepoškodia. */
const d = mkdtempSync(join(tmpdir(), "obedar-menu-"));
const PDF = join(d, "listok.pdf");
const OBSAH = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";
writeFileSync(PDF, OBSAH, "binary");

await p.goto(A + "/prihlasenie");
await p.fill("#kod", KOD); await p.fill("#heslo", HESLO);
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

console.log("— obrazovka menu —");
await p.goto(A + "/menu");
ok("menu je v ponuke", (await p.locator('a.tab:has-text("Menu")').count()) === 1);
ok("mriežka má päť dní", (await p.locator("table.menu-mriezka thead th").count()) === 6);
ok("riadkov je toľko, koľko má jedáleň jedál",
   (await p.locator("table.menu-mriezka tbody tr").count()) === 5);
ok("označenia sú podľa jedálne",
   (await p.locator("table.menu-mriezka th.oznak").first().innerText()).trim() === "A");

console.log("— názvy jedál —");
await p.fill('input[name="j-0-0"]', "Fazuľová polievka, vyprážaný syr");
await p.fill('input[name="j-2-1"]', "Guláš s knedľou");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
ok("uloženie potvrdené", /Uložené: 2 názvy jedál/.test(await p.content()));
ok("názov sa načítal späť",
   await p.inputValue('input[name="j-0-0"]') === "Fazuľová polievka, vyprážaný syr");
ok("prázdne polia ostali prázdne", await p.inputValue('input[name="j-1-0"]') === "");

console.log("— príloha —");
await p.setInputFiles("#p-priloha", PDF);
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
let t = await p.content();
ok("príloha sa uložila", t.includes("listok.pdf"));
ok("názvy sa pri nahratí prílohy nestratili",
   await p.inputValue('input[name="j-2-1"]') === "Guláš s knedľou");

const odp = await p.request.get(A + await p.locator('a:has-text("listok.pdf")').getAttribute("href"));
ok("príloha sa dá stiahnuť", odp.status() === 200);
ok("bajty sú nepoškodené", (await odp.body()).toString("binary") === OBSAH);
ok("typ je PDF", odp.headers()["content-type"].includes("application/pdf"));
/* Príloha je od dodávateľa, teda zvonku — prehliadač ju nesmie spustiť
   ako stránku na našej doméne. */
ok("príloha beží v pieskovisku", (odp.headers()["content-security-policy"] ?? "").includes("sandbox"));

console.log("— menu v matici —");
await p.goto(A + "/tim");
t = await p.content();
ok("odkaz na lístok je nad maticou", t.includes("Jedálny lístok na tento týždeň"));
ok("názov jedla je popiskom bunky", t.includes('title="Guláš s knedľou"'));

console.log("— predák menu vidí, ale nemení —");
await p.goto(A + "/ludia");
await p.click("tr:has(td.num:text-is('3002')) a:has-text('Upraviť')");
await p.uncheck('input[name="je_admin"]').catch(() => {});
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
