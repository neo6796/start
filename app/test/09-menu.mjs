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

/* Obrazovka ukazuje všetky jedálne pod sebou, každú vo vlastnej karte —
   selektory sa preto musia držať karty, inak by trafili tú druhú. */
const karta = m => p.locator(`details.listok:has(summary:text-is("Jedálny lístok — ${m}"))`);
const ABM = () => karta("GASTRO ABM");
const GG = () => karta("GASTROGAL");
const pole = (k, n) => k.locator(`input[name="${n}"]`);

console.log("— obrazovka menu —");
await p.goto(A + "/menu");
ok("menu je v ponuke", (await p.locator('a.tab:has-text("Menu")').count()) === 1);
/* Obe jedálne naraz, bez prepínania — lístky prídu v jeden deň a
   preklikávanie znamenalo prejsť tú istú cestu dvakrát. */
ok("obe jedálne sú na jednej obrazovke", (await p.locator("details.listok").count()) === 2);
ok("každá má vlastné tlačidlo na uloženie",
   (await p.locator("button:has-text('Uložiť GASTRO ABM')").count()) === 1);
ok("mriežka má päť dní", (await ABM().locator("table.menu-mriezka thead th").count()) === 6);
/* Päť jedál a nad nimi riadok na polievku — tá nie je na výber. */
ok("riadkov je toľko, koľko má jedáleň jedál, plus polievka",
   (await ABM().locator("table.menu-mriezka tbody tr").count()) === 6);
ok("polievka je prvá a oddelená",
   (await ABM().locator("tr.polievka-riadok").count()) === 1);
ok("označenia sú podľa jedálne",
   (await ABM().locator("tr:not(.polievka-riadok) th.oznak").first().innerText()).trim() === "A");
ok("druhá jedáleň má svoje označenia",
   (await GG().locator("tr:not(.polievka-riadok) th.oznak").first().innerText()).trim() === "1");

console.log("— názvy jedál —");
await pole(ABM(), "j-0-0").fill("Fazuľová polievka, vyprážaný syr");
await pole(ABM(), "j-2-1").fill("Guláš s knedľou");
await ABM().locator("button:has-text('Uložiť')").click();
await p.waitForLoadState("networkidle");
ok("uloženie potvrdené", /Uložené: 2 názvy jedál/.test(await p.content()));
ok("názov sa načítal späť",
   await pole(ABM(), "j-0-0").inputValue() === "Fazuľová polievka, vyprážaný syr");
ok("prázdne polia ostali prázdne", await pole(ABM(), "j-1-0").inputValue() === "");
ok("druhej jedálne sa to nedotklo", await pole(GG(), "j-0-0").inputValue() === "");

console.log("— príloha —");
await ABM().locator('input[type="file"]').setInputFiles(PDF);
await ABM().locator("button:has-text('Uložiť')").click();
await p.waitForLoadState("networkidle");
let t = await p.content();
ok("príloha sa uložila", t.includes("listok.pdf"));
ok("názvy sa pri nahratí prílohy nestratili",
   await pole(ABM(), "j-2-1").inputValue() === "Guláš s knedľou");

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
/* Predvolená jedáleň skúšok je GASTRO ABM a tá značí jedlá písmenami.
   Lístok s číslami sem nepatrí a appka ho odmietne — to sa skúša nižšie. */
const listok = (datum, dna) => `${dna} | ${datum}
Hrášková polievka so zemiakmi • 0,3l (1)
A. Vyprážaný kurací rezeň plnený šunkou, dusená ryža • 120g (1,3,7)
B. Pečené bravčové výpečky, dusená kapusta • 150/250g (1)`;

await ABM().locator("details.vlozenie > summary").click();
await ABM().locator("textarea").fill(listok(denVTyzdni(PO, 2), "Streda"));
await ABM().locator("button:has-text('Prečítať názvy z textu')").click();
await p.waitForLoadState("networkidle");
t = await p.content();
ok("z textu sa prečítali názvy", /Z vloženého textu som prečítal\s+2 názvy jedál/.test(t));
ok("povie, že sa nič neuložilo", /Nič sa zatiaľ neuložilo/.test(t));
ok("deň sa určil podľa dátumu, nie podľa poradia",
   (await pole(ABM(), "j-2-0").inputValue()).startsWith("Vyprážaný kurací rezeň"));
/* Bez dátumu by stredajší kus lístka spadol na pondelok a prebil,
   čo tam už bolo uložené. */
ok("pondelok ostal, ako bol",
   await pole(ABM(), "j-0-0").inputValue() === "Fazuľová polievka, vyprážaný syr");
ok("návrh je podfarbený",
   (await pole(ABM(), "j-2-0").getAttribute("class") ?? "").includes("navrh"));
ok("vložený text ostal v políčku, aby sa dal opraviť",
   (await ABM().locator("textarea").inputValue()).includes("Hrášková polievka"));
ok("čo bolo uložené, návrh neprebil", await pole(ABM(), "j-2-1").inputValue() === "Guláš s knedľou");
/* Návrh patrí tej jedálni, do ktorej sa vkladal — druhá ostáva prázdna. */
ok("druhej jedálne sa návrh nedotkol", await pole(GG(), "j-2-0").inputValue() === "");
/* Polievka nie je na výber, ale stravníka zaujíma — musí sa prečítať tiež. */
ok("polievka sa prečítala do vlastného riadka",
   (await pole(ABM(), "pol-2").inputValue()).startsWith("Hrášková polievka"));

/* Kým to človek nepotvrdí, v databáze nesmie byť nič nové. */
await p.goto(A + "/menu");
ok("bez potvrdenia sa návrh neuložil", await pole(ABM(), "j-2-0").inputValue() === "");

console.log("— lístok na iný týždeň —");
/* Toto je tá pomýlená situácia: v schránke je minulotýždňový lístok.
   Nesmie sa ticho vyplniť do týždňa, ktorý je na obrazovke. */
const minuly = new Date(PO + "T12:00:00Z");
minuly.setUTCDate(minuly.getUTCDate() - 7);
const poMinuly = minuly.toISOString().slice(0, 10);
await ABM().locator("details.vlozenie > summary").click();
await ABM().locator("textarea").fill(listok(denVTyzdni(poMinuly, 2), "Streda"));
await ABM().locator("button:has-text('Prečítať názvy z textu')").click();
await p.waitForLoadState("networkidle");
t = await p.content();
ok("iný týždeň sa zachytil", /Pozor, iný týždeň/.test(t));
ok("nič sa nevyplnilo", await pole(ABM(), "j-2-0").inputValue() === "");
ok("ponúkne prečítať na ten správny týždeň",
   (await p.locator('button[name="tyzden_iny"]').count()) === 1);

await p.click('button[name="tyzden_iny"]');
await p.waitForLoadState("networkidle");
ok("po potvrdení sa vyplní na tom týždni, na ktorý lístok je",
   (await pole(ABM(), "j-2-0").inputValue()).startsWith("Vyprážaný kurací rezeň"));
ok("a obrazovka je na tom týždni",
   (await pole(ABM(), "tyzden").inputValue()) === poMinuly);
ok("upozornenie už netreba", !/Pozor, iný týždeň/.test(await p.content()));

await p.goto(A + "/menu");
await ABM().locator("details.vlozenie > summary").click();
await ABM().locator("textarea").fill("Dobrý deň, lístok pošlem zajtra.");
await ABM().locator("button:has-text('Prečítať názvy z textu')").click();
await p.waitForLoadState("networkidle");
ok("text bez jedál to povie, nezhavaruje",
   /nenašiel označené jedlá/.test(await p.content()));

console.log("— polievka sa uloží a je ju vidieť —");
await p.goto(A + "/menu");
await ABM().locator("details.vlozenie > summary").click();
await ABM().locator("textarea").fill(listok(denVTyzdni(PO, 0), "Pondelok"));
await ABM().locator("button:has-text('Prečítať názvy z textu')").click();
await p.waitForLoadState("networkidle");
await ABM().locator("button:has-text('Uložiť')").click();
await p.waitForLoadState("networkidle");
t = await p.content();
ok("uloženie počíta aj polievku", /1 polievka/.test(t));
ok("polievka sa načítala späť",
   (await pole(ABM(), "pol-0").inputValue()).startsWith("Hrášková polievka"));

console.log("— lístok od inej jedálne —");
/* Vložiť GASTROGALov lístok do ABM je tá istá trieda chyby ako zlý týždeň:
   vyplnilo by sa to bez zaváhania a predák by v matici videl päť správne
   vyzerajúcich jedál, ktoré sa v tej kuchyni nevaria. */
await p.goto(A + "/menu");
await ABM().locator("details.vlozenie > summary").click();
await ABM().locator("textarea").fill(`Pondelok | ${denVTyzdni(PO, 0)}
1. Vyprážaný kurací rezeň, dusená ryža • 120g (1,3,7)
2. Bravčový perkelt, domáce halušky • 284/64g (1,3)
3. Pečené buchty so slivkovým lekvárom • 5ks (1,3,7)`);
await ABM().locator("button:has-text('Prečítať názvy z textu')").click();
await p.waitForLoadState("networkidle");
t = await p.content();
ok("cudzí lístok sa zachytil", /Pozor, cudzí lístok/.test(t));
ok("povie prečo", /jedlá sú očíslované/.test(t));
/* j-0-0 má uloženú hodnotu z predošlej skúšky; prázdne musí ostať to,
   čo by cudzí lístok vyplnil. */
ok("nič sa nevyplnilo", await pole(ABM(), "j-0-2").inputValue() === "");
ok("uložené názvy sa nedotklo",
   await pole(ABM(), "j-0-0").inputValue() === "Fazuľová polievka, vyprážaný syr");
ok("ponúkne tú jedáleň, ktorej lístok je",
   (await p.locator('button[name="jedalen_ina"]').count()) === 1);

await p.click('button[name="jedalen_ina"]');
await p.waitForLoadState("networkidle");
ok("po potvrdení sa vyplní pre správnu jedáleň",
   (await pole(GG(), "j-0-0").inputValue()).startsWith("Vyprážaný kurací rezeň"));
ok("a druhej jedálni sa nič nepridalo",
   await pole(ABM(), "j-0-2").inputValue() === "");

console.log("— aj podľa kontaktu v pätičke —");
/* Keď obe jedálne značia rovnako, značenie nepomôže. Kontakt v pätičke áno. */
await p.goto(A + "/ciselniky");
await p.click("tr:has-text('GASTROGAL') a:has-text('Upraviť')");
await p.fill("#p-u-telefon", "0918/119 328");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

await p.goto(A + "/menu");
await ABM().locator("details.vlozenie > summary").click();
await ABM().locator("textarea").fill(`Nahlasovania objednávok od 7:00 do 09:00. Tel. kontakt: 0918/119 328
Pondelok | ${denVTyzdni(PO, 0)}
A. Vyprážaný kurací rezeň, dusená ryža • 120g (1,3,7)
B. Bravčový perkelt, domáce halušky • 284/64g (1,3)
C. Pečené buchty so slivkovým lekvárom • 5ks (1,3,7)`);
await ABM().locator("button:has-text('Prečítať názvy z textu')").click();
await p.waitForLoadState("networkidle");
t = await p.content();
ok("telefón z pätičky prezradil dodávateľa", /Pozor, cudzí lístok/.test(t));
ok("povie, čia pätička to je", /kontakt jedálne GASTROGAL/.test(t));
ok("ani tu sa nič nevyplnilo", await pole(ABM(), "j-0-2").inputValue() === "");

console.log("— menu v matici —");
await p.goto(A + "/tim");
t = await p.content();
ok("odkaz na lístok je nad maticou", t.includes("listok.pdf"));
ok("názov jedla je popiskom bunky", t.includes('title="Guláš s knedľou"'));
/* Do buniek matice sa názov nezmestí a bublina na telefóne neexistuje —
   celý lístok preto musí byť nad maticou ako tabuľka. */
ok("lístok je nad maticou celý, nielen polievka",
   (await p.locator("table.listok-tab").count()) >= 1);
ok("v ňom sú názvy jedál", /table class="data listok-tab"[\s\S]{0,4000}Guláš s knedľou/.test(t));
ok("polievka má vlastný riadok",
   (await p.locator("table.listok-tab tr.polievka-riadok").count()) >= 1);
ok("a je v ňom to, čo sa prečítalo z lístka",
   /polievka-riadok[\s\S]{0,400}Hrášková polievka/.test(t));

console.log("— predák menu vidí, ale nemení —");
await p.goto(A + "/ludia");
await p.click("tr:has(td.num:text-is('3002')) a:has-text('Upraviť')");
await p.uncheck('input[name="je_admin"]').catch(() => {});
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
