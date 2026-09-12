/* Import menoslovu s väzbami. Beží po 01–03, používa ich číselníky.

   Skúša sa tvar, ktorý naozaj príde: štyri polia s druhom pomeru a hlavičky
   `# --- Firma, prevádzka ---`. A hlavne to, čo drží rozhodnutie 37 —
   **neznáme hodnoty sa odmietnu, nezakladajú.** Keby import založil firmu
   z preklepu, „Vráble · Vrable · závod Vráble" by sa objavili ako tri a
   rozbité súčty by sa ukázali až o dva mesiace pri uzávierke. */
import { chromium } from "playwright";
import { rozober, rozoberHlavicku } from "../src/ludia.js";

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };
const je = (t, a, b) => ok(`${t}: ${a}${a === b ? "" : " (čakané " + b + ")"}`, a === b);

console.log("— riadok so štyrmi poľami —");
je("živnostník", rozober("0001;Ž;Solár;Erik").vztah, "zivnostnik");
je("pracovný pomer", rozober("2006;TPP;Murár;Martin").vztah, "pp");
je("priezvisko sa neposunulo", rozober("0001;Ž;Solár;Erik").priezvisko, "Solár");
je("ani meno", rozober("0001;Ž;Solár;Erik").meno, "Erik");
/* Tri polia musia fungovať ďalej — starý menoslov nikto neprepisuje. */
je("tri polia bez vzťahu", rozober("1042;Kováčová;Jana").vztah, null);
je("a priezvisko ostalo priezviskom", rozober("1042;Kováčová;Jana").priezvisko, "Kováčová");
je("bez čísla aj so vzťahom", rozober(";Ž;Valko;Kamil").vztah, "zivnostnik");
je("a číslo je prázdne", rozober(";Ž;Valko;Kamil").kod, null);
je("tabulátory", rozober("0011\tŽ\tZima\tMiloslav").priezvisko, "Zima");

console.log("— hlavička skupiny —");
je("firma", rozoberHlavicku("# --- PD, office ---").firma, "PD");
je("prevádzka", rozoberHlavicku("# --- PD, office ---").prevadzka, "office");
je("názov s medzerou", rozoberHlavicku("# --- Adiumentum 01, agro ---").firma, "Adiumentum 01");
/* Poznámky s čiarkou nesmú prejsť ako hlavičky — pomlčky sú súčasť vzoru. */
ok("bežná poznámka nie je hlavička",
   rozoberHlavicku("# štruktúra údajov: osobné číslo, druh pomeru") === null);
ok("ani veta s čiarkou",
   rozoberHlavicku("# hlavička: zamestnávateľ (platiteľ stravovania), miesto prevádzky") === null);

/* ---------- obrazovka ---------- */
const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const c = await b.newContext({ viewport: { width: 1400, height: 950 } });
const p = await c.newPage();
const chyby = [];
p.on("pageerror", e => chyby.push("JS: " + e.message));
p.on("response", x => { if (x.status() >= 500) chyby.push(x.status() + " " + x.url()); });
const A = process.env.ADRESA ?? "http://localhost:3111";
await p.goto(A + "/prihlasenie");
await p.fill("#kod", process.env.KOD ?? "4021");
await p.fill("#heslo", process.env.HESLO ?? "skusobne-heslo");
await p.click("button[type=submit]"); await p.waitForLoadState("networkidle");

console.log("— neznáma firma sa nezaloží —");
await p.goto(A + "/ludia");
await p.fill("#p-riadky", ["# --- Vymyslená s.r.o., neznáma prevádzka ---",
                           "7001;Ž;Skúšobný;Fero"].join("\n"));
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
let t = await p.content();
ok("človek pribudol", /pribudlo 1/.test(t));
ok("ale firma sa nezaložila", /V číselníku nie je/.test(t));
ok("povie ktorá", /Vymyslená s\.r\.o\./.test(t));
ok("aj prevádzka", /neznáma prevádzka/.test(t));
ok("a poradí, čo s tým", /doplňte ich v Číselníkoch/i.test(t));
await p.goto(A + "/ciselniky");
ok("v číselníku naozaj nie je", !(await p.content()).includes("Vymyslená"));

console.log("— známa firma sa priradí —");
/* Skúška 01 založila prevádzku „Stredisko Vráble", 03 firmu. Vezmeme tie. */
await p.goto(A + "/ciselniky");
const firma = await p.locator("table.data tr:has(a:has-text('Upraviť')) td").first().innerText();
await p.goto(A + "/ludia");
await p.fill("#p-riadky", [`# --- ${firma.trim()}, Stredisko Vráble ---`,
                           "7002;TPP;Skúšobná;Anna"].join("\n"));
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("väzby sa doplnili", /doplnených väzieb/.test(t));
await p.fill("#f-hladaj", "Skúšobná");
await p.click("button:has-text('Hľadať')");
await p.waitForLoadState("networkidle");
const riadok = await p.locator("tr:has-text('Skúšobná')").innerText();
ok("firma je pri človeku", riadok.includes(firma.trim()));
ok("aj prevádzka", riadok.includes("Stredisko Vráble"));

console.log("— vzťah a to, čo sa neprepisuje —");
await p.goto(A + "/ludia");
await p.fill("#p-riadky", "7001;Ž;Skúšobný;Fero");
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
await p.fill("#f-hladaj", "Skúšobný");
await p.click("button:has-text('Hľadať')");
await p.waitForLoadState("networkidle");
ok("živnostník je označený", (await p.locator("tr:has-text('Skúšobný')").innerText()).includes("živnostník"));

/* Druhý import s inou firmou nesmie prepísať tú, čo už je (rozhodnutie 38). */
await p.goto(A + "/ludia");
await p.fill("#p-riadky", [`# --- ${firma.trim()}, Stredisko Vráble ---`,
                           "7002;Ž;Skúšobná;Anna"].join("\n"));
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
t = await p.content();
ok("iný vzťah sa neprepísal, len ohlásil", /neprepísali/.test(t) && /vzťah/.test(t));

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
