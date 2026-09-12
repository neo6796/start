/* Mesačný podklad. Beží po 01–05, používa ich objednávky.

   Tento mesiac ide appka paralelne s papierom, takže tá obrazovka má jednu
   hlavnú povinnosť: **čísla, ktoré sa dajú položiť vedľa hárku mzdárky.**
   Preto sa tu skúša hlavne to, či súčty sedia a či sa nič nestratí. */
import { chromium } from "playwright";

const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const c = await b.newContext({ viewport: { width: 1500, height: 950 } });
const p = await c.newPage();
const chyby = [];
p.on("pageerror", e => chyby.push("JS: " + e.message));
p.on("response", r => { if (r.status() >= 500) chyby.push(r.status() + " " + r.url()); });
const A = process.env.ADRESA ?? "http://localhost:3111";
const KOD = process.env.KOD ?? "4021";
const HESLO = process.env.HESLO ?? "skusobne-heslo";
let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };
const naCisla = s => [...String(s).matchAll(/(\d+),(\d{2})\s*€/g)].map(m => Number(m[1]) * 100 + Number(m[2]));

await p.goto(A + "/prihlasenie");
await p.fill("#kod", KOD); await p.fill("#heslo", HESLO);
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

/* Objednávky zo skúšok 04–05 sú v aktuálnom alebo budúcom týždni. */
const d = new Date();
const MES = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

console.log("— obrazovka —");
await p.goto(A + "/mesiac?mesiac=" + MES);
let t = await p.content();
ok("obrazovka existuje", /Mesačný podklad/.test(await p.title()));
ok("vedie k nej záložka", (await p.locator('a.tab[href="/mesiac"]').count()) === 1);
/* Kým mesiac beží, čísla sedia, ale mesiac nie je celý — a musí to byť vidieť. */
ok("otvorený mesiac je označený ako odhad", /odhad/.test(t));
ok("povie, podľa čoho počítal", /Príspevok zamestnávateľa/.test(t) && /55 %/.test(t));
ok("aj cenovú hladinu základnej jedálne", /Cenová hladina/.test(t));

console.log("— podklad je delený po firmách —");
/* Mzdárka pôjde po celých firmách, takže to je základné delenie, nie filter. */
ok("firma je vlastná karta", (await p.locator(".card:has(table.podklad)").count()) >= 1);
ok("filter po firmách existuje", (await p.locator("#f-firma").count()) === 1);
ok("v riadku je osobné číslo aj stredisko",
   /Osobné číslo/.test(t) && /Stredisko/.test(t));
ok("stĺpce sú tie, čo chce mzdárka",
   /Príspevok ZL/.test(t) && /Sociálny fond/.test(t) && /Zrážka zo mzdy/.test(t));

console.log("— súčty sedia —");
/* Toto je celé jadro: čo firma zaplatí jedálni, sa musí rovnať tomu, čo sa
   medzi troch rozdelí. Keby sa to rozišlo, mzdárke nesedí stĺpec. */
/* Jedna konkrétna tabuľka, nie všetky naraz: na stránke je karta na každú
   firmu a k tomu živnostníci, takže riadky jednej a súčet druhej by sa
   porovnávali navzájom. */
const tab = p.locator("table.podklad").first();
const riadky = await tab.locator("tbody tr:not(.sucet)").all();
ok("nejaké riadky tam sú", riadky.length > 0);
let vsetkySedia = true;
for (const r of riadky) {
  const [cena, zl, fond, stravnik] = naCisla(await r.innerText());
  if (cena === undefined) continue;
  if (zl + fond + stravnik !== cena) vsetkySedia = false;
}
ok("v každom riadku dá príspevok + fond + podiel presne cenu", vsetkySedia);

const suc = await tab.locator("tr.sucet").first().innerText();
const [scena, szl, sfond, sstravnik] = naCisla(suc);
ok("a sedí aj súčtový riadok", szl + sfond + sstravnik === scena);
/* Súčet stĺpca musí dať to isté, čo súčet riadkov — mzdárka to sčíta na
   papieri rovnako a musí jej vyjsť to isté číslo. */
let rucne = 0;
for (const r of riadky) { const x = naCisla(await r.innerText()); if (x[0] !== undefined) rucne += x[0]; }
ok("ručný súčet stĺpca dá to isté, čo súčtový riadok", rucne === scena);

console.log("— čo očakávať na faktúre —");
/* Jediné číslo, ktoré sa porovnáva s papierom. Počíta sa z porcií a z ceny
   odfotenej na objednávke — nie zo zaokrúhlených mesiacov ľudí, lebo jeden
   človek môže jesť v dvoch kuchyniach a jeho mesiac sa zaokrúhľuje raz. */
const fakt = p.locator("div.card:has(h3:text-is('Čo očakávať na faktúre')) table");
ok("karta s faktúrami je na obrazovke", (await fakt.count()) === 1);
/* Nadpisy sú v CSS zväčšené na verzálky, takže `innerText` by vrátil
   „JEDÁLEŇ" — porovnáva sa preto zdrojový text, nie vykreslený. */
const faktText = await fakt.textContent();
ok("delí sa po jedálňach", /Jedáleň/.test(faktText));
ok("a porcie zamestnancov aj živnostníkov sú zvlášť",
   /Porcií zamestnancov/.test(faktText) && /Porcií živnostníkov/.test(faktText));
const fr = await fakt.locator("tbody tr").first().innerText();
const [bez, dph, spolu] = naCisla(fr);
ok("bez DPH + DPH dá presne to, čo má prísť na faktúru", bez + dph === spolu);

console.log("— súhrn po prevádzkach —");
const prev = p.locator("div.card:has(h3:text-is('Súhrn po prevádzkach')) table");
ok("karta je na obrazovke", (await prev.count()) === 1);
const psuc = naCisla(await prev.locator("tr.sucet").innerText());
/* „Stálo firmu" je príspevok plus fond — a musí to sedieť, lebo je to
   jediné číslo, ktoré si z tejto tabuľky niekto odpíše. */
ok("stĺpec „stálo firmu“ je súčet príspevku a fondu", psuc[1] + psuc[2] === psuc[3]);

console.log("— export pre mzdy —");
await p.goto(A + "/mesiac?mesiac=" + MES);
const odkaz = p.locator('a[href*="/export/mzdy"][href*="tvar=csv"]').first();
ok("pri firme je odkaz na export", (await odkaz.count()) === 1);
const csvOdp = await p.context().request.get(A + (await odkaz.getAttribute("href")));
ok("export sa stiahne", csvOdp.status() === 200);
ok("ako súbor, nie ako stránka",
   /attachment/.test(csvOdp.headers()["content-disposition"] ?? ""));
/* Kým mesiac nie je uzavretý, sú čísla odhad — na súbore, ktorý medzitým
   odišiel e-mailom, to musí byť vidieť. */
ok("a v názve je vidieť, že je to odhad",
   /filename="mzdy-\d{4}-\d{2}-[A-Za-z0-9-]+-odhad\.csv"/.test(csvOdp.headers()["content-disposition"] ?? ""));
const telo = await csvOdp.body();
ok("začína sa BOM", telo[0] === 0xEF && telo[1] === 0xBB && telo[2] === 0xBF);
const csvText = telo.slice(3).toString("utf8");
ok("má stĺpce, ktoré chce mzdárka",
   /Osobné číslo;/.test(csvText) && /Zrážka zo mzdy/.test(csvText));
/* Živnostník nie je v mzdovom podklade ani ako riadok s nulou (6.2a). */
const ziv = await p.locator("div.card:has(h3:text-is('Živnostníci')) table.podklad tbody tr:not(.sucet) td:nth-child(2)")
  .allInnerTexts();
ok("živnostník v exporte nie je",
   ziv.length === 0 || !ziv.some(m => csvText.includes(m.split(" ")[0])));

console.log("— dva zámky mesiaca —");
/* Zámky sú dva, nie jeden (rozhodnutie 46): mzdy nečakajú na faktúru. */
const zamky = p.locator("div.card:has(h3:text-is('Uzávierka mesiaca'))");
ok("obrazovka má uzávierku", (await zamky.count()) === 1);
ok("a sú v nej obidva zámky",
   /Mzdová uzávierka/.test(await zamky.textContent()) &&
   /Fakturačná kontrola/.test(await zamky.textContent()));
/* Bežiaci mesiac sa zamknúť nedá — zafixoval by sa podklad, do ktorého ešte
   pribudnú obedy. */
ok("bežiaci mesiac sa zamknúť nedá",
   (await zamky.locator("button").count()) === 0 && /mesiac ešte beží/.test(await zamky.textContent()));

const m = new Date(); m.setDate(1); m.setMonth(m.getMonth() - 1);
const MINULY = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
await p.goto(A + "/mesiac?mesiac=" + MINULY);
const zamky2 = p.locator("div.card:has(h3:text-is('Uzávierka mesiaca'))");
await zamky2.locator("tr", { hasText: "Mzdová uzávierka" }).locator("button").click();
await p.waitForLoadState("networkidle");
t = await p.content();
ok("uzavretý mesiac to povie", /je uzavretá/.test(t) && /uzavret/.test(t));
ok("a hlavička už nehovorí o odhade", !/· odhad/.test(t));
/* Fakturačná kontrola je samostatná — mzdy na faktúru nečakajú. */
ok("druhý zámok ostal otvorený",
   (await zamky2.locator("tr", { hasText: "Fakturačná kontrola" }).textContent()).includes("otvorené"));
/* Do zamknutého mesiaca sa už nedopisuje — inak by sa podklad, ktorý odišiel
   mzdárke, ticho rozišiel s tým, čo je v appke. */
await p.goto(A + "/spatne?mesiac=" + MINULY);
ok("spätný zápis do zamknutého mesiaca už neprejde", /je uzavretý/.test(await p.content()));

await p.goto(A + "/mesiac?mesiac=" + MINULY);
await p.locator("div.card:has(h3:text-is('Uzávierka mesiaca')) tr", { hasText: "Mzdová uzávierka" })
  .locator("button").click();
await p.waitForLoadState("networkidle");
ok("dá sa aj otvoriť späť", /je znovu otvorená/.test(await p.content()));

console.log("— prázdny mesiac —");
await p.goto(A + "/mesiac?mesiac=2020-01");
ok("povie, že nie je čo spočítať", /nie je čo spočítať/.test(await p.content()));
/* Aj v mesiaci bez obedov musí byť vidieť, v akom je stave — inak sa nedá
   zistiť, či je prázdny preto, že sa nejedlo, alebo preto, že je zamknutý. */
ok("aj prázdny mesiac ukáže zámky",
   (await p.locator("div.card:has(h3:text-is('Uzávierka mesiaca'))").count()) === 1);

console.log("— neprihlásený sa sem nedostane —");
const c2 = await b.newContext();
const odp = await c2.request.get(A + "/mesiac", { maxRedirects: 0 });
ok("nemá prístup",
   odp.status() === 403 || odp.status() === 303 || /prihlás/i.test(await odp.text()));

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
