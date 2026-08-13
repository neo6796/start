/* Matica predáka. Beží po 01–03, používa ich údaje.
     ./test/obnov.sh && node test/01… && … && node test/04-matica.mjs */
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

await p.goto(A + "/prihlasenie");
await p.fill("#kod", KOD); await p.fill("#heslo", HESLO);
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

/* Správca sa spraví aj predákom a vezme si tím, aby matica mala koho ukázať. */
await p.goto(A + "/ludia");
await p.click("tr:has-text('Solár') a:has-text('Upraviť')");
await p.check('input[name="je_predak"]');
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
await p.goto(A + "/ciselniky");
await p.click("tr:has-text('Tím Sever') a:has-text('Upraviť')");
await p.selectOption("#p-u-predak_id", { label: "Solár Erik" });
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");

/* Bez pridelenej jedálne sa objednať nedá — matica by nemala čo ponúknuť. */
await p.goto(A + "/ludia");
for (const ch of await p.locator('input[name="kto"]').all()) await ch.check();
await p.selectOption("#p-poskytovatel_id", { label: "GASTROGAL" });
await p.click("button:has-text('Priradiť označeným')");
await p.waitForLoadState("networkidle");

console.log("— matica —");
await p.goto(A + "/tim");
let t = await p.content();
ok("matica sa otvorí", t.includes("Môj tím"));
ok("ukazuje päť pracovných dní",
   (await p.locator("table.matrix thead th").count()) === 7);   // meno + 5 dní + počet
ok("v tíme sú ľudia", (await p.locator("table.matrix tbody tr").count()) > 0);
ok("bez volieb sa počítajú", /Bez voľby[\s\S]{0,80}\d/.test(t));

const prvy = p.locator("table.matrix tbody tr").first();
const bunky = prvy.locator("td .opts");
ok("bunka ponúka jedlá aj krížik",
   (await bunky.first().locator("input[type=radio]").count()) >= 2);

/* Predák objednáva aj sebe. Hľadať sa medzi tridsiatimi menami je zbytočná
   práca, tak je jeho riadok prvý a oddelený. */
ok("vlastný riadok je prvý",
   (await p.locator("table.matrix tbody tr").first().innerText()).includes("Solár"));
ok("je označený", (await p.locator("table.matrix tbody tr.ja").count()) === 1);
/* innerText vracia to, čo je vidieť — odznak je veľkými písmenami. */
ok("a povie, že je to on",
   (await p.locator("table.matrix tbody tr.ja .badge").innerText()).trim().toLowerCase() === "vy");

console.log("— zápis volieb —");
await bunky.nth(0).locator("input[value$=':1']").first().check();
await bunky.nth(1).locator("input[value=x]").check();
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("uloženie potvrdené", /Uložené — \d+ zmen/.test(t));

const prvy2 = p.locator("table.matrix tbody tr").first();
/* Meno je <th>, takže prvé <td> je pondelok. */
ok("voľba jedla ostala zaškrtnutá",
   await prvy2.locator("td").nth(0).locator("input[value$=':1']").first().isChecked());
ok("krížik ostal zaškrtnutý",
   await prvy2.locator("td").nth(1).locator("input[value=x]").isChecked());
ok("počet bez voľby klesol na 3",
   (await prvy2.locator("td.cnt").innerText()).trim() === "3");

console.log("— cena sa odfotí —");
ok("uložené bez chyby v prehliadači", chyby.length === 0);

console.log("— posun týždňov —");
await p.click("a:has-text('nasledujúci')");
await p.waitForLoadState("networkidle");
const buducy = await p.content();
ok("nasledujúci týždeň je prázdny",
   (await p.locator("table.matrix input:checked").count()) === 0);
await p.click("a:has-text('tento týždeň')");
await p.waitForLoadState("networkidle");
ok("návrat na tento týždeň ukáže voľby",
   (await p.locator("table.matrix input:checked").count()) === 2);

console.log("— cudzia jedáleň sa odmietne —");
/* Priamy zápis mimo formulára: hodnota ukazuje na jedáleň, ktorú človek nemá. */
const idOsoby = await p.locator("table.matrix tbody tr").first()
  .locator("td .opts input").first().getAttribute("name");
const den = idOsoby.split("-").slice(2).join("-");
const osoba = idOsoby.split("-")[1];
const znamka = await p.locator('input[name="znamka"]').first().inputValue();
const tyzden = await p.locator('input[name="tyzden"]').first().inputValue();
const odpoved = await p.evaluate(async ([o, d, z, w]) => {
  const telo = new URLSearchParams({ znamka: z, tyzden: w });
  telo.set(`b-${o}-${d}`, "999:0");
  const r = await fetch("/tim", { method: "POST", body: telo, redirect: "follow",
    headers: { "content-type": "application/x-www-form-urlencoded" } });
  return r.url;
}, [osoba, den, znamka, tyzden]);
ok("neexistujúca jedáleň sa neuložila", decodeURIComponent(odpoved).includes("nie je danému stravníkovi pridelená"));

/* Dve zámerné pravidlá naraz, nie vedľajšie účinky:
   1. Bunka, ktorá vo formulári nie je, znamená „nerozhodnuté". Práve tak sa
      dá voľba zrušiť — skript prepínač odškrtne a prehliadač ho neodošle.
   2. Odmietnutá voľba nechá bunku tak, ako bola. Neplatná hodnota nesmie
      zmazať to, čo tam predtým platilo.
   Predchádzajúci priamy zápis poslal jedinú bunku a tá bola odmietnutá:
   ostatné sa teda mali vyprázdniť a tá jedna si mala nechať pôvodné jedlo. */
await p.goto(A + "/tim");
await p.waitForLoadState("networkidle");
ok("neposlané bunky sa vrátili na nerozhodnuté a odmietnutá si nechala pôvodné",
   (await p.locator("table.matrix input:checked").count()) === 1);

/* Panel sa otvára a zatvára; klikať naň naslepo by ho raz otvorilo a raz zavrelo. */
const otvorPanel = () => p.evaluate(() => {
  const d = document.getElementById("n-kto")?.closest("details");
  if (d) d.open = true;
});

console.log("— hromadné odhlásenie —");
await p.goto(A + "/tim");
await otvorPanel();
await p.selectOption("#n-kto", "vsetci");
await p.selectOption("#n-dovod", "dovolenka");
await p.click("button:has-text('Označiť')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("odhlásenie potvrdené", /Odhlásené: \d+ ľud/.test(t));
ok("hlási aj počet pracovných dní", /5 pracovných dní/.test(t));
ok("všetky bunky sú krížiky",
   (await p.locator("table.matrix input[value=x]:checked").count()) === 30);
ok("dôvod je pri dni vidieť",
   (await p.locator(".precmark").first().getAttribute("title")) === "dovolenka");
ok("bez voľby kleslo na nulu", !/BEZ VOĽBY[\s\S]{0,60}[1-9]/i.test(
   (await p.locator(".deadline").innerText())));

console.log("— neprítomnosť neblokuje —");
const jedna = p.locator("table.matrix tbody tr").first().locator("td").nth(0);
await jedna.locator("input[value$=':2']").first().check();
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
ok("deň označený dovolenkou sa dá prebiť jedlom",
   await p.locator("table.matrix tbody tr").first().locator("td").nth(0)
     .locator("input[value$=':2']").first().isChecked());
ok("značka dovolenky pri prebitom dni ostala",
   (await p.locator("table.matrix tbody tr").first().locator("td").nth(0)
     .locator(".precmark").count()) === 1);

console.log("— bez vybratej osoby —");
await p.goto(A + "/tim");
await otvorPanel();
await p.click("button:has-text('Označiť')");
await p.waitForTimeout(300);
ok("bez vybratej osoby prehliadač formulár nepustí", p.url().endsWith("/tim"));

console.log("— nezmyselný rozsah —");
await otvorPanel();
await p.selectOption("#n-kto", "vsetci");     // po znovunačítaní je výber prázdny
await p.fill("#n-od", "2026-09-10");
await p.fill("#n-do", "2026-09-01");
await p.click("button:has-text('Označiť')");
await p.waitForLoadState("networkidle");
ok("koniec pred začiatkom sa odmietne", (await p.content()).includes("Koniec je skôr"));

console.log("— víkend sa preskočí —");
await otvorPanel();
await p.selectOption("#n-kto", "vsetci");
await p.fill("#n-od", "2026-09-05");   // sobota
await p.fill("#n-do", "2026-09-06");   // nedeľa
await p.click("button:has-text('Označiť')");
await p.waitForLoadState("networkidle");
ok("samé víkendové dni sa odmietnu", (await p.content()).includes("ani jeden pracovný deň"));

console.log("— správca sa dostane aj mimo svojho tímu —");
/* Správca je zároveň predákom, takže začína pri svojom tíme. Bez prepínača
   by sa k ostatným tímom nedostal práve ten, kto na to má právo. */
await p.goto(A + "/tim");
ok("prepínač je na obrazovke", (await p.locator('a.btn:has-text("všetci")').count()) === 1);
const vTime = await p.locator("table.matrix tbody tr").count();
await p.click('a.btn:has-text("všetci")');
await p.waitForLoadState("networkidle");
t = await p.content();
ok("celý podnik má aspoň toľko ľudí ako tím",
   (await p.locator("table.matrix tbody tr").count()) >= vTime);
ok("nadpis to hovorí", /Všetci stravníci/.test(t));
ok("pri mene je aj tím", /class="pn"[^>]*>[^<]*·/.test(t));

/* Uloženie musí zapísať tomu, kto je na obrazovke — nie len vlastnému tímu. */
const cudzi = p.locator("table.matrix tbody tr:not(.is-off)").last();
await cudzi.locator("td .opts").first().locator("input[type=radio]").first().check();
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("uloženie prešlo aj v pohľade na všetkých", /Uložené — \d+ zmen/.test(t));
ok("pohľad ostal na všetkých", /Všetci stravníci/.test(t));

await p.click('a.btn:has-text("môj tím")');
await p.waitForLoadState("networkidle");
ok("prepnutie späť na tím funguje",
   (await p.locator("table.matrix tbody tr").count()) === vTime);

console.log("— stravník vidí svoj týždeň —");
/* Obrazovka nič neukladá, tak sa v nej ani nesmie dať klikať: políčko, ktoré
   sa stlačí a nič sa nestane, je horšie než políčko, ktoré sa stlačiť nedá. */
await p.goto(A + "/moje");
t = await p.content();
ok("vlastný týždeň sa otvorí", t.includes("Môj týždeň"));
ok("je v ňom len jeden človek", (await p.locator("table.matrix tbody tr").count()) === 1);
ok("políčka sa nedajú stlačiť",
   (await p.locator("table.matrix input[type=radio]:not([disabled])").count()) === 0);
ok("čo je zvolené, je aj tak vidieť",
   (await p.locator("table.matrix input[type=radio]:checked").count()) > 0);
ok("povie, prečo sa nedá klikať", /len na pozeranie/.test(t));
ok("nie je tam tlačidlo Uložiť",
   (await p.locator("button:has-text('Uložiť')").count()) === 0);

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
