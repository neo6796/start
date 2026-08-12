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
/* Päť jedál a nad nimi riadok na polievku — tá nie je na výber. */
ok("riadkov je toľko, koľko má jedáleň jedál, plus polievka",
   (await p.locator("table.menu-mriezka tbody tr").count()) === 6);
ok("polievka je prvá a oddelená",
   (await p.locator("table.menu-mriezka tr.polievka-riadok").count()) === 1);
ok("označenia sú podľa jedálne",
   (await p.locator("table.menu-mriezka tr:not(.polievka-riadok) th.oznak").first().innerText()).trim() === "A");

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

console.log("— vloženie lístka cez schránku —");
/* Toto je cesta, ktorá musí fungovať aj vtedy, keď sa zo súboru názvy
   prečítať nedajú — a hlavne nesmie nič uložiť sama od seba. */
/* Vkladá sa do týždňa, ktorý je práve na obrazovke — nech dátumy v texte
   sedia, musí sa lístok poskladať na ten istý týždeň. */
const PO = await (async () => {
  await p.goto(A + "/menu");
  return new URL(await p.getAttribute('a:has-text("tento týždeň")', "href"), A)
    .searchParams.get("tyzden");
})();
const denVTyzdni = (po, i) => {
  const d = new Date(po + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + i);
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
};
const listok = (datum, dna) => `${dna} | ${datum}
Hrášková polievka so zemiakmi • 0,3l (1)
1. Vyprážaný kurací rezeň plnený šunkou, dusená ryža • 120g (1,3,7)
2. Pečené bravčové výpečky, dusená kapusta • 150/250g (1)`;

await p.click("details.vlozenie > summary");
await p.fill("#p-vlozeny", listok(denVTyzdni(PO, 2), "Streda"));
await p.click("button:has-text('Prečítať názvy z textu')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("z textu sa prečítali názvy", /Z vloženého textu som prečítal\s+2 názvy jedál/.test(t));
ok("povie, že sa nič neuložilo", /Nič sa zatiaľ neuložilo/.test(t));
ok("deň sa určil podľa dátumu, nie podľa poradia",
   (await p.inputValue('input[name="j-2-0"]')).startsWith("Vyprážaný kurací rezeň"));
/* Bez dátumu by stredajší kus lístka spadol na pondelok a prebil,
   čo tam už bolo uložené. */
ok("pondelok ostal, ako bol",
   await p.inputValue('input[name="j-0-0"]') === "Fazuľová polievka, vyprážaný syr");
ok("návrh je podfarbený",
   (await p.getAttribute('input[name="j-2-0"]', "class") ?? "").includes("navrh"));
ok("vložený text ostal v políčku, aby sa dal opraviť",
   (await p.inputValue("#p-vlozeny")).includes("Hrášková polievka"));
ok("čo bolo uložené, návrh neprebil", await p.inputValue('input[name="j-2-1"]') === "Guláš s knedľou");
/* Polievka nie je na výber, ale stravníka zaujíma — musí sa prečítať tiež. */
ok("polievka sa prečítala do vlastného riadka",
   (await p.inputValue('input[name="pol-2"]')).startsWith("Hrášková polievka"));

/* Kým to človek nepotvrdí, v databáze nesmie byť nič nové. */
await p.goto(A + "/menu");
ok("bez potvrdenia sa návrh neuložil", await p.inputValue('input[name="j-2-0"]') === "");

console.log("— lístok na iný týždeň —");
/* Toto je tá pomýlená situácia: v schránke je minulotýždňový lístok.
   Nesmie sa ticho vyplniť do týždňa, ktorý je na obrazovke. */
const minuly = new Date(PO + "T12:00:00Z");
minuly.setUTCDate(minuly.getUTCDate() - 7);
const poMinuly = minuly.toISOString().slice(0, 10);
await p.click("details.vlozenie > summary");
await p.fill("#p-vlozeny", listok(denVTyzdni(poMinuly, 2), "Streda"));
await p.click("button:has-text('Prečítať názvy z textu')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("iný týždeň sa zachytil", /Pozor, iný týždeň/.test(t));
ok("nič sa nevyplnilo", await p.inputValue('input[name="j-2-0"]') === "");
ok("ponúkne prečítať na ten správny týždeň",
   (await p.locator('button[name="tyzden_iny"]').count()) === 1);

await p.click('button[name="tyzden_iny"]');
await p.waitForLoadState("networkidle");
ok("po potvrdení sa vyplní na tom týždni, na ktorý lístok je",
   (await p.inputValue('input[name="j-2-0"]')).startsWith("Vyprážaný kurací rezeň"));
ok("a obrazovka je na tom týždni",
   (await p.inputValue('input[name="tyzden"]')) === poMinuly);
ok("upozornenie už netreba", !/Pozor, iný týždeň/.test(await p.content()));

await p.goto(A + "/menu");
await p.click("details.vlozenie > summary");
await p.fill("#p-vlozeny", "Dobrý deň, lístok pošlem zajtra.");
await p.click("button:has-text('Prečítať názvy z textu')");
await p.waitForLoadState("networkidle");
ok("text bez jedál to povie, nezhavaruje",
   /nenašiel označené jedlá/.test(await p.content()));

console.log("— polievka sa uloží a je ju vidieť —");
await p.goto(A + "/menu");
await p.click("details.vlozenie > summary");
await p.fill("#p-vlozeny", listok(denVTyzdni(PO, 0), "Pondelok"));
await p.click("button:has-text('Prečítať názvy z textu')");
await p.waitForLoadState("networkidle");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("uloženie počíta aj polievku", /1 polievka/.test(t));
ok("polievka sa načítala späť",
   (await p.inputValue('input[name="pol-0"]')).startsWith("Hrášková polievka"));

console.log("— menu v matici —");
await p.goto(A + "/tim");
t = await p.content();
ok("odkaz na lístok je nad maticou", t.includes("listok.pdf"));
ok("názov jedla je popiskom bunky", t.includes('title="Guláš s knedľou"'));
ok("stravník vidí, aká je polievka", /class="polievky"[\s\S]{0,200}Hrášková polievka/.test(t));

console.log("— predák menu vidí, ale nemení —");
await p.goto(A + "/ludia");
await p.click("tr:has(td.num:text-is('3002')) a:has-text('Upraviť')");
await p.uncheck('input[name="je_admin"]').catch(() => {});
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
