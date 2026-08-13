/* Uzávierka týždňa a odoslanie objednávky — celá cesta.
     ./test/uzavierka.sh

   Skúša sa to, čo sa inak overiť nedá inak než na kuchyni: že z uzávierky
   naozaj vyjde správa, že je v nej to isté, čo bolo na obrazovke, že sa to
   zapíše aj keď odoslanie zlyhá, a že potvrdenie zapíše až stlačenie
   tlačidla — nie samotné otvorenie odkazu. */

import { chromium } from "playwright";
import { server, pocuvaj } from "./smtp.mjs";

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const c = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const p = await c.newPage();
const chyby = [];
p.on("pageerror", e => chyby.push("JS: " + e.message));
p.on("response", r => { if (r.status() >= 500) chyby.push(r.status() + " " + r.url()); });
const A = process.env.ADRESA ?? "http://localhost:3111";
const KOD = process.env.KOD ?? "4021";
const HESLO = process.env.HESLO ?? "skusobne-heslo";
let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };

const { s, prijate } = server();
await new Promise(h => s.listen(Number(process.env.SMTP_PORT ?? 2526), "127.0.0.1", h));

/* Správa je viacdielna: hlavičky, potom čistý text v base64 a za ním zošit.
   Kuchyňu zaujíma ten text — tak sa vyberie a dekóduje presne ten. */
const telaSprav = () => prijate.filter(z => z.data).map(z => {
  const cele = z.data;
  const i = cele.indexOf("\n\n");
  const prvyDiel = cele.match(/Content-Transfer-Encoding: base64\n\n([A-Za-z0-9+/=\n]+)/);
  return {
    hlavicky: i < 0 ? cele : cele.slice(0, i),
    prikazy: z.prikazy,
    text: prvyDiel ? Buffer.from(prvyDiel[1].replace(/\s/g, ""), "base64").toString("utf8") : "",
    cele
  };
});

await p.goto(A + "/prihlasenie");
await p.fill("#kod", KOD); await p.fill("#heslo", HESLO);
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

/* --- príprava: predák, tím, jedáleň ľuďom, pár objednávok --- */
await p.goto(A + "/ludia");
await p.click("tr:has-text('Solár') a:has-text('Upraviť')");
await p.check('input[name="je_predak"]');
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
/* Jedáleň dostane adresu až v druhej polovici skúšky — najprv sa overuje,
   že sa uzávierka bez nej nezasekne a že to povie nahlas. */
await p.goto(A + "/ciselniky");
await p.click("tr:has-text('GASTROGAL') a:has-text('Upraviť')");
await p.fill("#p-u-email", "");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

await p.goto(A + "/ciselniky");
await p.click("tr:has-text('Tím Sever') a:has-text('Upraviť')");
await p.selectOption("#p-u-predak_id", { label: "Solár Erik" });
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
await p.goto(A + "/ludia");
for (const ch of await p.locator('input[name="kto"]').all()) await ch.check();
await p.selectOption("#p-poskytovatel_id", { label: "GASTROGAL" });
await p.selectOption("#p-tim_id", { label: "Tím Sever" });
await p.click("button:has-text('Priradiť označeným')");
await p.waitForLoadState("networkidle");

await p.goto(A + "/tim");
const riadky = p.locator("table.matrix tbody tr");
const koľkoĽudí = await riadky.count();
/* Prvý si dá jedlo 1 v pondelok aj utorok, druhý jedlo 2 v pondelok.
   Zvyšok ostane nerozhodnutý — práve o tých ide na obrazovke uzávierky. */
await riadky.nth(0).locator("td .opts").nth(0).locator("input[value$=':0']").first().check();
await riadky.nth(0).locator("td .opts").nth(1).locator("input[value$=':0']").first().check();
if (koľkoĽudí > 1)
  await riadky.nth(1).locator("td .opts").nth(0).locator("input[value$=':1']").first().check();
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

console.log("— obrazovka uzávierky —");
await p.goto(A + "/uzavierka");
let t = await p.content();
ok("uzávierka sa otvorí", t.includes("Uzávierka týždňa"));
ok("ukazuje počty po jedlách", (await p.locator("table.data tr.sucet").count()) >= 1);
ok("nerozhodnutých vypisuje menovite", (await p.locator("ul.zoznam-mien li").count()) > 0);
ok("upozorní, že jedáleň nemá adresu", /nemá e-mailovú adresu/.test(t));
ok("bez adresy sa dá vopred vidieť znenie", /Objednávka obedov na týždeň/.test(t));

console.log("— uzavretie bez adresy jedálne —");
await p.click("button:has-text('Uzavrieť týždeň a odoslať')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("týždeň sa uzavrel aj tak", /Týždeň je uzavretý/.test(t));
ok("neúspech je vidieť, nie zamlčaný", /Neodoslané/.test(t));
ok("zlyhanie sa zapísalo medzi odoslania", (await p.locator('span.badge.zle').count()) >= 1);
ok("dôvod je pri ňom", /nemá e-mailovú adresu/.test(t));
ok("nič sa neodoslalo", prijate.length === 0);

console.log("— po odoslaní sa dá meniť ďalej —");
/* Uzavretý týždeň nie je zámok. Kto ochorie v pondelok ráno, musí sa dať
   odhlásiť — appka to musí dovoliť a povedať, že treba poslať opravu. */
const c2 = await b.newContext({ viewport: { width: 1200, height: 900 } });
const p2 = await c2.newPage();
await p2.goto(A + "/prihlasenie");
await p2.fill("#kod", KOD); await p2.fill("#heslo", HESLO);
await p2.click("button[type=submit]"); await p2.waitForLoadState("networkidle");
await p2.goto(A + "/tim");
ok("predák vidí, že týždeň je uzavretý", /Týždeň je uzavretý/.test(await p2.content()));
ok("a že zmena si vyžiada opravu", /vyžiada <strong>opravu<\/strong>/.test(await p2.content()));
ok("políčka sa dajú stlačiť aj tak",
   (await p2.locator("table.matrix input[type=radio]:not([disabled])").count()) > 0);
ok("tlačidlo Uložiť je dostupné",
   !(await p2.locator("button:has-text('Uložiť')").first().isDisabled()));

console.log("— doplní sa adresa a pošle znova —");
await p.goto(A + "/uzavierka");
await p.click("form[action='/uzavierka/otvorit'] button");
await p.waitForLoadState("networkidle");
await p.goto(A + "/ciselniky");
await p.click("tr:has-text('GASTROGAL') a:has-text('Upraviť')");
await p.fill("#p-u-email", "kuchyna@example.test");
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

/* Menu bez dátumov — dni sa poznajú podľa názvov, takže skúška nezávisí od
   toho, ktorý týždeň je práve dnes. Ide o to, či sa názvy dostanú do
   objednávky: kuchyňa má vidieť, čo si ľudia dali, nie iba čísla. */
await p.goto(A + "/menu");
/* Obrazovka menu ukazuje všetky jedálne pod sebou — treba trafiť tú svoju. */
const kartaGG = () => p.locator(
  'details.listok:has(summary:text-is("Jedálny lístok — GASTROGAL"))');
await kartaGG().locator("details.vlozenie > summary").click();
await kartaGG().locator("textarea").fill(`Pondelok
1. Vyprážaný kurací rezeň, dusená ryža, šalát • 120g
2. Bravčový perkelt, domáce halušky • 284/64g
Utorok
1. Vyprážaný bravčový rezeň, varené zemiaky • 120g
Streda
1. Pečené výpečky, dusená kapusta • 150/250g
Štvrtok
1. Vyprážané čevapčiči, varené zemiaky • 120g
Piatok
1. Vyprážané rybie filé, varené zemiaky • 120g`);
await kartaGG().locator("button:has-text('Prečítať názvy z textu')").click();
await p.waitForLoadState("networkidle");
await kartaGG().locator("button:has-text('Uložiť')").click();
await p.waitForLoadState("networkidle");

await p.goto(A + "/uzavierka");
ok("adresa je vidieť pred odoslaním", /kuchyna@example\.test/.test(await p.content()));
await p.click("button:has-text('Uzavrieť týždeň a odoslať')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("odoslanie potvrdené na obrazovke", /Odoslané:/.test(t));
ok("správa naozaj odišla", prijate.filter(z => z.data).length === 1);

const [sprava] = telaSprav();
const PO_TEST = new URL(await p.getAttribute('a:has-text("tento týždeň")', "href"), A)
  .searchParams.get("tyzden");
console.log("— čo prišlo do kuchyne —");
ok("príjemca je adresa jedálne",
   sprava.prikazy.some(x => /^RCPT TO:<kuchyna@example\.test>$/i.test(x)));
ok("predmet hovorí, o čo ide", /Subject: =\?UTF-8\?B\?/.test(sprava.hlavicky));
ok("predmet sa dá prečítať späť", (() => {
  const m = sprava.hlavicky.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/);
  return m && Buffer.from(m[1], "base64").toString("utf8").startsWith("Objednávka obedov");
})());
ok("počty sú v tele ako čistý text, nielen v prílohe",
   /Pondelok\s+\d+\.\s*\d+\./.test(sprava.text) && /\d+ ks/.test(sprava.text));
/* Tri tvary: 1 obed · 3 obedy · 5 obedov. „3 obedov" v objednávke vyzerá,
   ako keby to písal stroj — a je to chyba. */
/* Správcovi chodia objednávky pre obe jedálne do tej istej schránky —
   bez mena jedálne ich od seba nerozozná. */
ok("hore je meno jedálne", /Jedáleň:\s+GASTROGAL/.test(sprava.text));
ok("aj odberateľ", /Odberateľ:\s+Poľnohospodárske družstvo/.test(sprava.text));
ok("meno jedálne je aj v predmete", (() => {
  const m = sprava.hlavicky.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/);
  return m && Buffer.from(m[1], "base64").toString("utf8").includes("GASTROGAL");
})());
ok("je v ňom súčet za týždeň v správnom tvare",
   /Spolu za týždeň: (1 obed|[2-4] obedy|\d+ obedov)\./.test(sprava.text));
ok("je v ňom odkaz na potvrdenie", /\/potvrdenie\?t=[\w-]+/.test(sprava.text));
/* Bez názvov by kuchyňa dostala holé čísla — a musela by si sama dohľadať,
   čo je „1" a čo „2" v jej vlastnom lístku. */
ok("pri počtoch sú názvy jedál z menu",
   /1\s+\d+ ks\s+Vyprážaný kurací rezeň/.test(sprava.text));
ok("zošit je priložený", /objednavka-\d{4}-\d{2}-\d{2}\.xlsx/.test(sprava.cele));
ok("zošit je naozaj zip", (() => {
  const m = sprava.cele.match(/spreadsheetml\.sheet[\s\S]*?\r?\n\r?\n([A-Za-z0-9+/=\s]+)/);
  return m && Buffer.from(m[1].replace(/\s/g, ""), "base64").subarray(0, 2).toString() === "PK";
})());

console.log("— čo je uložené, je to isté, čo odišlo —");
ok("znenie na obrazovke sa zhoduje so správou", (() => {
  const naObrazovke = t.replace(/&#39;/g, "'").replace(/&quot;/g, '"')
                       .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return sprava.text.split("\n").filter(r => r.trim()).every(r => naObrazovke.includes(r.trim()));
})());

console.log("— potvrdenie prijatia —");
const odkaz = sprava.text.match(/(https?:\/\/\S+\/potvrdenie\?t=[\w-]+)/)[1];
/* Kuchár nie je prihlásený — otvára to z e-mailu. */
const c3 = await b.newContext();
const p3 = await c3.newPage();
await p3.goto(odkaz);
let t3 = await p3.content();
ok("odkaz sa otvorí bez prihlásenia", /Potvrdenie objednávky/.test(t3));
ok("sú na ňom počty, nielen tlačidlo", /Spolu za týždeň/.test(t3));
ok("tlačidlo tam je", (await p3.locator("button:has-text('Potvrdzujem')").count()) === 1);

/* Samotné otvorenie odkazu potvrdenie NESMIE zapísať — odkazy v správach
   navštevujú bezpečnostné skenery samy. */
await p.goto(A + "/uzavierka");
ok("otvorenie odkazu ešte nič nepotvrdilo", /čaká sa/.test(await p.content()));

await p3.click("button:has-text('Potvrdzujem')");
await p3.waitForLoadState("networkidle");
ok("po stlačení je potvrdené", /je potvrdená/.test(await p3.content()));
await p.goto(A + "/uzavierka");
ok("uzávierka to ukazuje", (await p.locator("td span.badge.ok").count()) >= 1);

const c4 = await b.newContext();
const p4 = await c4.newPage();
await p4.goto(A + "/potvrdenie?t=nezmysel");
ok("cudzí token nič nepotvrdí", /Odkaz už neplatí/.test(await p4.content()));

console.log("— zmena po odoslaní si pýta opravu —");
/* Toto je bežný pondelok ráno: niekto ochorel. Matica sa mení bez toho, aby
   sa čokoľvek odomykalo, a uzávierka to musí ohlásiť aj poslať. */
await p.goto(A + "/tim");
await p.locator("table.matrix tbody tr").nth(0).locator("td .opts").nth(0)
  .locator("input[value=x]").first().check();
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("uloženie prešlo aj v uzavretom týždni", /Uložené — \d+ zmen/.test(t));
ok("a povie, že treba poslať opravu", /jedálni treba poslať opravu/.test(t));

await p.goto(A + "/uzavierka");
t = await p.content();
ok("uzávierka ohlási, že sa počty zmenili", /sa počty zmenili/.test(t));
ok("vypíše, čo presne", /−1 ks\s+\(\d+ → \d+\)/.test(t));
ok("a ponúkne tlačidlo na opravu",
   (await p.locator("form[action='/uzavierka/oprava'] button").count()) === 1);

await p.click("form[action='/uzavierka/oprava'] button");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("oprava odišla", /Oprava odoslaná/.test(t));
ok("a už sa nepýta znova", !/sa počty zmenili/.test(t));

ok("odišla druhá správa", prijate.filter(z => z.data).length === 2);
const oprava = telaSprav()[1];
ok("predmet hovorí, že je to oprava", (() => {
  const m = oprava.hlavicky.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/);
  return m && Buffer.from(m[1], "base64").toString("utf8").startsWith("OPRAVA");
})());
ok("povie, ktorú objednávku nahrádza", /nahrádza objednávku poslanú/.test(oprava.text));
ok("vypíše, čo sa mení", /Čo sa mení:/.test(oprava.text));
ok("aj s rozdielom v kusoch", /−1 ks\s+\(\d+ → \d+\)/.test(oprava.text));
ok("povie, že platí celý zoznam nižšie", /Platí celý zoznam nižšie/.test(oprava.text));
/* Dni, ktoré už prebehli, v oprave nemajú čo hľadať — uvariť sa už nedajú
   a kuchár by cez ne musel preskakovať. */
ok("celá objednávka je v nej tiež", /Spolu za (týždeň|zostávajúce dni):/.test(oprava.text));
ok("uplynulé dni sa nevypisujú", (() => {
  const dnesJe = new Date().toISOString().slice(0, 10);
  const den = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"];
  return den.every((n, i) => {
    const d = new Date(PO_TEST + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    const uplynul = d.toISOString().slice(0, 10) < dnesJe;
    return !uplynul || !new RegExp(`^${n} `, "m").test(oprava.text);
  });
})());

t = await p.content();
ok("staré odoslanie je označené ako nahradené", /nahradené/.test(t));

/* Potvrdenie platí pre konkrétne čísla — staré už potvrdiť nejde. */
const p5 = await (await b.newContext()).newPage();
await p5.goto(odkaz);
t = await p5.content();
ok("starý odkaz povie, že počty už neplatia", /Tieto počty už neplatia/.test(t));
ok("a tlačidlo na potvrdenie nemá",
   (await p5.locator("button:has-text('Potvrdzujem')").count()) === 0);

const novyOdkaz = oprava.text.match(/(https?:\/\/\S+\/potvrdenie\?t=[\w-]+)/)[1];
ok("oprava má vlastný odkaz", novyOdkaz !== odkaz);

/* Ten istý odkaz otvára aj správca vo vlastnom prehliadači, kde prihlásený
   je. Smerovač vtedy vyžaduje známku a bez nej sa potvrdenie odmietlo
   hláškou o formulári — pritom je to najbežnejšia cesta pri skúšaní. */
await p.goto(novyOdkaz);
await p.click("button:has-text('Potvrdzujem')");
await p.waitForLoadState("networkidle");
ok("potvrdiť sa dá aj z prihlásenej schránky", /je potvrdená/.test(await p.content()));

console.log("— dvakrát sa neposiela —");
await p.goto(A + "/uzavierka");
ok("uzavretý týždeň už tlačidlo na odoslanie neponúka",
   (await p.locator("button:has-text('Uzavrieť týždeň a odoslať')").count()) === 0);
ok("viac správ už nepribudlo", prijate.filter(z => z.data).length === 2);

s.close();
await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
