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
/* Aj s poznámkovými riadkami — menoslov skopírovaný z hárku má medzi ľuďmi
   nadpisy stredísk a tie nie sú chyba. */
await p.fill("#p-riadky", "# --- A 01 ---\n1042;Kováčová;Jana\n2117\tHrušovský\tMartin\n0055,Malý,Ján\nnezmysel\n4021;Solár;Erik");
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
let t = await p.content();
ok("import pridal troch", t.includes("pribudlo 3"));
ok("existujúci správca sa nezdvojil", t.includes("bez zmeny 1"));
ok("nezrozumiteľný riadok ohlásený", t.includes("Nezrozumiteľné riadky"));
ok("poznámka sa za chybu nepovažuje", !t.includes("--- A 01 ---"));
ok("úvodná nula zachovaná", (await p.locator("td.num:has-text('0055')").count()) === 1);
ok("tabulátorový riadok prešiel", t.includes("Hrušovský"));

/* Menoslov od dodávateľa osobné čísla nemá. Človek sa doň aj tak musí dostať;
   číslo sa doplní, keď bude známe. */
console.log("— ľudia bez osobného čísla —");
await p.fill("#p-riadky", "# --- A 01 ---\n;Murár;Martin\n;Valko;Kamil");
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("pribudli aj bez čísla", t.includes("pribudlo 2"));
ok("appka to nezamlčí", /bez osobného čísla/.test(t));
ok("povie aj čo to znamená", /prihlásiť sa zatiaľ nevie/.test(t));
ok("v zozname je to vidieť", (await p.locator("td.num.gap:text-is('chýba')").count()) >= 2);

/* Druhý import tých istých ľudí ich nesmie založiť znova — bez čísla sa
   páruje podľa mena, inak by z 25 ľudí bolo 50. */
await p.fill("#p-riadky", ";Murár;Martin\n;Valko;Kamil");
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("opakovaný import nezaloží dvojice", t.includes("bez zmeny 2") && !t.includes("pribudlo"));
ok("a naozaj sú v zozname raz",
   (await p.locator("table.data tr:has-text('Murár')").count()) === 1);

/* Vynechané pole je niečo iné než preklep: „Murár;Martin" sa nemá čítať ako
   číslo „Murár", ale ohlásiť. */
await p.fill("#p-riadky", "Murár;Martin");
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
ok("chýbajúci bodkočiarok sa ohlási", /Nezrozumiteľné riadky/.test(await p.content()));

console.log("— menoslov s hlavičkami skupín —");
/* Menoslov nesie aj firmu, prevádzku a druh pomeru. Mená sú vymyslené —
   skutočné do repozitára nepatria. */
await p.goto(A + "/ciselniky");
await p.click("details:has(input[value=prevadzka]) summary");
await p.fill("form.pridat:has(input[value=prevadzka]) #p-prevadzka-nazov", "dielňa");
await p.fill("form.pridat:has(input[value=prevadzka]) #p-prevadzka-skratka", "DIE");
await p.click("form.pridat:has(input[value=prevadzka]) button[type=submit]");
await p.waitForLoadState("networkidle");

await p.goto(A + "/ludia");
await p.fill("#p-riadky", [
  "--- Adiumentum;dielňa ---",
  "7001;Nováková;Elena;Ž",
  "7002;Bruk;Igor;TPP"
].join("\n"));
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
const t2 = await p.content();
ok("hlavička sa nepovažuje za chybný riadok", !t2.includes("Adiumentum;dielňa"));
ok("väzby sa doplnili", /doplnených väzieb/.test(t2));

await p.click("tr:has-text('Nováková') a:has-text('Upraviť')");
const detail2 = await p.content();
ok("firma z hlavičky sedí",
   (await p.locator('select[name="firma_id"] option:checked').innerText()).includes("Adiumentum"));
ok("prevádzka z hlavičky sedí",
   (await p.locator('select[name="prevadzka_id"] option:checked').innerText()).includes("dielňa"));
/* A hlavne: „Ž" sa nesmie zlepiť s krstným menom. */
ok("krstné meno ostalo samo", /Elena/.test(detail2) && !/Elena Ž/.test(detail2));
ok("živnostník je označený ako živnostník",
   (await p.locator('select[name="vztah"] option:checked').innerText()).includes("živnostník"));

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
