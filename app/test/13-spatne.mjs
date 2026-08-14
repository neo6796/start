/* Spätný zápis — dopísanie obeda, ktorý sa už zjedol (koncept 4.5a).
   Beží po 01–05, používa ich údaje. */
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

/* Skúša sa v minulom mesiaci: ten má uplynulé pracovné dni vždy, aj keď skúška
   beží prvého. V tomto mesiaci by prvého nebolo čo dopisovať a skúška by padla
   raz za tridsať dní — čo je horšie než keby padala vždy. */
const dnesJe = new Date();
const minuly = new Date(dnesJe.getFullYear(), dnesJe.getMonth() - 1, 1);
const MES = `${minuly.getFullYear()}-${String(minuly.getMonth() + 1).padStart(2, "0")}`;

await p.goto(A + "/prihlasenie");
await p.fill("#kod", KOD); await p.fill("#heslo", HESLO);
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

console.log("— obrazovka —");
await p.goto(A + "/spatne?mesiac=" + MES);
let t = await p.content();
ok("obrazovka existuje", /Spätný zápis/.test(await p.title()));
ok("vedie k nej záložka", (await p.locator('a.tab[href="/spatne"]').count()) === 1);
/* Toto je jediné pravidlo, na ktorom sa spätný zápis dá pokaziť — musí byť
   napísané, nie odvodené. */
ok("povie, že dodávateľovi sa nič neposiela", /Dodávateľovi sa nič neposiela/.test(t));
ok("je v ňom mriežka ľudí a dní", (await p.locator("select.sp-bunka").count()) > 0);
ok("dôvod je povinný",
   (await p.locator("#p-dovod").getAttribute("required")) !== null);

console.log("— budúcnosť sa spätne nezapisuje —");
/* Dnešok ani zajtrajšok sem nepatria: ešte môžu prejsť do kuchyne. Keby ich
   niekto zapísal sem, jedlo by sa neobjednalo a človek by ostal hladný. */
const buduci = new Date(dnesJe.getFullYear(), dnesJe.getMonth() + 1, 1);
const MESB = `${buduci.getFullYear()}-${String(buduci.getMonth() + 1).padStart(2, "0")}`;
await p.goto(A + "/spatne?mesiac=" + MESB);
t = await p.content();
ok("budúci mesiac nemá čo dopisovať", /nie je čo\s+dopisovať/.test(t));
ok("odkáže tam, kde sa objednáva", /Môjom tíme/.test(t));
ok("a nemá ani jedno políčko", (await p.locator("select.sp-bunka").count()) === 0);

console.log("— zápis —");
await p.goto(A + "/spatne?mesiac=" + MES);
/* Prvý deň v riadku Malého — jeho jedáleň mu pridelili skúšky 01–05. */
const riadok = p.locator("tr:has-text('Malý')");
const bunky = riadok.locator("select.sp-bunka");
const kolkoDni = await bunky.count();
ok("uplynulé dni minulého mesiaca sa ponúkajú", kolkoDni >= 15);
const menoPola = await bunky.first().getAttribute("name");
const den = menoPola.split("-").slice(2).join("-");

/* Bez dôvodu to neprejde ani vtedy, keď sa formulár pošle mimo obrazovky. */
const znamka = await p.locator('form[action="/spatne/uloz"] input[name="znamka"]').inputValue();
const bezDovodu = await p.evaluate(async ([z, m, pole]) => {
  const telo = new URLSearchParams({ znamka: z, mesiac: m, dovod: "  ", [pole]: "x" });
  const r = await fetch("/spatne/uloz", { method: "POST", body: telo, redirect: "follow",
    headers: { "content-type": "application/x-www-form-urlencoded" } });
  return r.url;
}, [znamka, MES + "-01", menoPola]);
ok("server bez dôvodu nezapíše", decodeURIComponent(bezDovodu).includes("Dôvod treba vyplniť"));

/* Vyberie sa prvé jedlo, ktoré nie je „—" ani „×". */
const hodnota = await bunky.first().evaluate(s =>
  [...s.options].map(o => o.value).find(v => v && v !== "x"));
await bunky.first().selectOption(hodnota);
await p.fill("#p-dovod", "nábeh appky — prepísané zo zberných hárkov");
await p.click("button:has-text('Zapísať spätne')");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("zápis prešiel", /zapísan/.test(t));
ok("a povie, že jedálni neodišlo nič", /Dodávateľovi neodišlo nič/.test(t));
ok("počítadlo v mesiaci narástlo", /obed zadaný spätne|obedy zadané spätne|obedov zadaných spätne/.test(t));

await p.goto(A + "/spatne?mesiac=" + MES);
ok("hodnota ostala uložená",
   (await p.locator("tr:has-text('Malý') select.sp-bunka").first().inputValue()) === hodnota);
ok("deň je označený ako spätný",
   (await p.locator("tr:has-text('Malý') td.spatne").count()) >= 1);

console.log("— príznak ostáva vidieť aj v matici —");
/* „Príznak ostáva na tom dni natrvalo" — teda aj tam, kde deň normálne žije,
   nielen na obrazovke, kde vznikol. */
const pondelok = (() => {
  const d = new Date(den + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + (d.getUTCDay() === 0 ? 1 : 1 - d.getUTCDay()));
  return d.toISOString().slice(0, 10);
})();
await p.goto(A + "/tim?tyzden=" + pondelok + "&pohlad=vsetci");
ok("v matici je značka spätného zápisu",
   (await p.locator("tr:has-text('Malý') .spmark").count()) >= 1);

console.log("— do objednávky to nejde —");
await p.goto(A + "/uzavierka?tyzden=" + pondelok);
t = await p.content();
ok("uzávierka spätné zápisy vypíše zvlášť", /zapísan[ýéo]\w*\s+spätne/i.test(t));
ok("a povie, že sa neposielajú", /neposielajú/.test(t));
/* Najdôležitejšie: obed, ktorý sa už zjedol, sa nesmie objaviť medzi tým,
   čo sa má poslať do kuchyne. */
const vObjednavke = await p.locator("table.data tr.sucet").count();
ok("v počtoch na odoslanie nie je", vObjednavke === 0);

console.log("— zamknutý mesiac sa nedopisuje —");
/* Mesiac sa zamkne priamo v databáze — obrazovka mesačnej uzávierky je krok 6.
   Zámok však musí platiť už teraz, inak by sa dal mesiac dopisovať aj potom,
   čo z neho odišiel mzdový podklad. */
const { default: pg } = await import("pg");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL ??
  "postgres://obedar:test@127.0.0.1:5432/obedar_test" });
await db.connect();
await db.query(`INSERT INTO mesiac_stav (mesiac, mzdy_uzavrete) VALUES ($1, true)
                ON CONFLICT (mesiac) DO UPDATE SET mzdy_uzavrete = true`, [MES + "-01"]);

await p.goto(A + "/spatne?mesiac=" + MES);
t = await p.content();
ok("uzavretý mesiac to povie", /je uzavretý/.test(t));
ok("a mriežku vôbec neukáže", (await p.locator("select.sp-bunka").count()) === 0);

const poZamknuti = await p.evaluate(async ([z, m, pole, h]) => {
  const telo = new URLSearchParams({ znamka: z, mesiac: m, dovod: "obídenie", [pole]: h });
  const r = await fetch("/spatne/uloz", { method: "POST", body: telo, redirect: "follow",
    headers: { "content-type": "application/x-www-form-urlencoded" } });
  return r.url;
}, [znamka, MES + "-01", menoPola, hodnota]);
ok("server priame odoslanie do zamknutého mesiaca odmietne",
   decodeURIComponent(poZamknuti).includes("Nezapísalo sa nič"));

await db.query("DELETE FROM mesiac_stav WHERE mesiac = $1", [MES + "-01"]);
await db.end();

console.log("— stravník ani predák sem nesmú —");
const c2 = await b.newContext();
const p2 = await c2.newPage();
await p2.goto(A + "/prihlasenie");
await p2.fill("#kod", "3001"); await p2.fill("#heslo", process.env.HESLO_STRAVNIK ?? "nove-heslo-2026");
await p2.click("button[type=submit]"); await p2.waitForLoadState("networkidle");
const odpoved = await p2.request.get(A + "/spatne");
ok("stravník sa na obrazovku nedostane",
   odpoved.status() === 403 || (await odpoved.text()).includes("Nemáte prístup"));

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
