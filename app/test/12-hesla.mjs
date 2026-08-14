/* Heslá — správca ich prideľuje, každý si svoje zmení.
   Beží po 01–03, používa ich údaje. */
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

console.log("— správca vygeneruje heslo stravníkovi —");
await p.goto(A + "/ludia");
await p.click("tr:has-text('Vargová') a:has-text('Upraviť')");
let t = await p.content();
ok("pri človeku je karta Prihlásenie", /<h3>Prihlásenie<\/h3>/.test(t));
ok("povie, že heslo ešte nemá", /heslo ešte nemá/.test(t));

await p.click("button:has-text('Vygenerovať')");
await p.waitForLoadState("networkidle");
t = await p.content();
const noveHeslo = (await p.locator(".heslo-raz").innerText()).trim();
ok("heslo sa ukázalo", /^[a-z2-9]{4}(-[a-z2-9]{4})+$/.test(noveHeslo));
/* Znaky, ktoré sa na papieri pletú, v ňom nesmú byť — heslo sa prepisuje
   z obrazovky do telefónu. */
ok("nie sú v ňom mätúce znaky", !/[0O1lI]/.test(noveHeslo));
ok("povie, že ho vidno len teraz", /uvidíte ho len teraz/.test(t));

/* Obnovením stránky by sa formulár odoslal znova a vygenerovalo by sa ďalšie
   heslo — preto sa obrazovka otvorí nanovo cez adresu. */
await p.goto(A + "/ludia");
await p.click("tr:has-text('Vargová') a:has-text('Upraviť')");
ok("po opätovnom otvorení už heslo nikde nie je",
   (await p.locator(".heslo-raz").count()) === 0);
ok("ale je vidieť, že nejaké má", /heslo je nastavené/.test(await p.content()));

console.log("— stravník sa ním prihlási —");
const c2 = await b.newContext();
const p2 = await c2.newPage();
await p2.goto(A + "/prihlasenie");
await p2.fill("#kod", "3001"); await p2.fill("#heslo", noveHeslo);
await p2.click("button[type=submit]"); await p2.waitForLoadState("networkidle");
ok("prihlásenie prešlo", !/prihlás/i.test(await p2.title()));

console.log("— zmena vlastného hesla —");
await p2.goto(A + "/heslo");
ok("obrazovka existuje", /Moje heslo/.test(await p2.content()));
ok("k odkazu vedie meno v hlavičke",
   (await p2.locator('a.kto[href="/heslo"]').count()) === 1);

await p2.fill("#p-stare", "zlé-heslo");
await p2.fill("#p-nove", "nove-heslo-2026");
await p2.fill("#p-znova", "nove-heslo-2026");
await p2.click("button:has-text('Zmeniť heslo')");
await p2.waitForLoadState("networkidle");
ok("bez doterajšieho hesla to neprejde", /Doterajšie heslo nesedí/.test(await p2.content()));

await p2.fill("#p-stare", noveHeslo);
await p2.fill("#p-nove", "nove-heslo-2026");
await p2.fill("#p-znova", "ine-heslo-2026");
await p2.click("button:has-text('Zmeniť heslo')");
await p2.waitForLoadState("networkidle");
ok("nezhodné heslá to neprejde", /nezhodujú/.test(await p2.content()));

/* Osobné číslo pozná každý, kto videl dochádzkový list. */
await p2.fill("#p-stare", noveHeslo);
await p2.fill("#p-nove", "3001");
await p2.fill("#p-znova", "3001");
await p2.click("button:has-text('Zmeniť heslo')");
await p2.waitForLoadState("networkidle");
ok("osobné číslo ako heslo neprejde", /Osobné číslo sa ako heslo/.test(await p2.content()));

await p2.fill("#p-stare", noveHeslo);
await p2.fill("#p-nove", "nove-heslo-2026");
await p2.fill("#p-znova", "nove-heslo-2026");
await p2.click("button:has-text('Zmeniť heslo')");
await p2.waitForLoadState("networkidle");
ok("správna zmena prejde", /Heslo je zmenené/.test(await p2.content()));
ok("a človek ostal prihlásený tu", /Moje heslo/.test(await p2.content()));

const c3 = await b.newContext();
const p3 = await c3.newPage();
await p3.goto(A + "/prihlasenie");
await p3.fill("#kod", "3001"); await p3.fill("#heslo", noveHeslo);
await p3.click("button[type=submit]"); await p3.waitForLoadState("networkidle");
ok("staré heslo už neplatí", /Prihlásenie/.test(await p3.title()));
await p3.fill("#kod", "3001"); await p3.fill("#heslo", "nove-heslo-2026");
await p3.click("button[type=submit]"); await p3.waitForLoadState("networkidle");
ok("nové platí", !/prihlás/i.test(await p3.title()));

console.log("— stravník k cudzím heslám nesmie —");
ok("na obrazovku ľudí sa nedostane",
   (await (await p2.request.get(A + "/ludia")).text()).includes("Nemáte prístup") ||
   (await p2.request.get(A + "/ludia")).status() === 403);

console.log("— správca si mení heslo sám sebe —");
await p.goto(A + "/heslo");
await p.fill("#p-stare", HESLO);
await p.fill("#p-nove", "kratke");
await p.fill("#p-znova", "kratke");
await p.click("button:has-text('Zmeniť heslo')");
await p.waitForLoadState("networkidle");
/* Správca má vyššiu spodnú hranicu — dostane sa ku všetkému vrátane miezd. */
ok("krátke heslo správcovi neprejde",
   /aspoň 10 znakov/.test(await p.content()) ||
   (await p.locator("#p-nove").getAttribute("minlength")) === "10");

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
