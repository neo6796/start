/* Porovnanie s papierom. Beží po 01–05, používa ich objednávky.

   Vstupné údaje sú skutočný hárok ABM za august 2026 — vrátane dvoch mien,
   ktoré sú na ňom neúplné („Murár", „Valko"). Práve na nich sa ukáže, či
   párovanie robí to, čo má: priradí, keď je priezvisko jediné, a nehádа,
   keď nie je. */
import { chromium } from "playwright";
import { zPapiera } from "../src/porovnanie.js";

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };
const je = (t, a, b) => ok(`${t}: ${a}${a === b ? "" : " (čakané " + b + ")"}`, a === b);

/* Presne to, čo vypadne z Excelu pri označení a skopírovaní. */
const HAROK = [
  "OBEDY za 08 /2026\t\tABM",
  "\t\t1.týž.\t2.týž.\t3.týž.\t4.týž.\t5.týž.\tSpolu",
  "Solárová Denisa\tPD\t4\t5\t5\t3\t0\t17",
  "Jelenská Lucia\tPD\t0\t0\t0\t0\t0\t0",
  "",
  "Valentová Dagmar\tA 01\t5\t5\t0\t3\t1\t14",
  "Danko Pavol\tA 01\t4\t4\t2\t3\t1\t14",
  "Lauková Zuzana\tA 01\t5\t2\t3\t3\t1\t14",
  "Murár\tA 01\t0\t0\t0\t0\t0\t0",
  "Zima Miloslav\tSz Adm.\t5\t5\t5\t5\t1\t21",
  "Horniaková Martina\tSz Adm.\t4\t0\t3\t4\t0\t11",
  "\t\t\t\t\t\tSPOLU:\t91"
].join("\n");

console.log("— čítanie hárku —");
const r = zPapiera(HAROK);
je("prečítalo len riadky s ľuďmi", r.length, 8);
je("prvé meno", r[0].meno, "Solárová Denisa");
je("a jeho počet je zo stĺpca Spolu, nie z týždňa", r[0].pocet, 17);
je("nula sa nestratí", r.find(x => x.meno === "Jelenská Lucia").pocet, 0);
/* „A 01" má v sebe číslo — počet sa berie z konca riadku, nie odkiaľkoľvek. */
je("stredisko s číslom nepomýli", r.find(x => x.meno === "Danko Pavol").pocet, 14);
ok("hlavička sa preskočila", !r.some(x => /OBEDY za|týž/.test(x.meno)));
ok("súčtový riadok sa preskočil", !r.some(x => /SPOLU/i.test(x.meno)));
je("súčet sedí s hárkom", r.reduce((a, x) => a + x.pocet, 0), 91);

console.log("— iné tvary vloženia —");
je("meno a počet bez tabulátorov",
   zPapiera("Zima Miloslav 21")[0].pocet, 21);
je("aj meno ostane celé", zPapiera("Zima Miloslav 21")[0].meno, "Zima Miloslav");
je("bodkočiarky", zPapiera("Danko Pavol;A 01;14")[0].pocet, 14);
je("prázdny vstup", zPapiera("").length, 0);
je("riadok bez čísla sa preskočí", zPapiera("Iba meno bez počtu").length, 0);

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

console.log("— obrazovka —");
await p.goto(A + "/porovnanie");
ok("obrazovka existuje", /Porovnanie s papierom/.test(await p.title()));
ok("vedie k nej odkaz z Mesiaca",
   (await (await p.goto(A + "/mesiac")).text()).includes("/porovnanie"));

console.log("— rozdiel sa nájde a pomenuje —");
const d = new Date();
const MES = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
await p.goto(A + "/porovnanie?mesiac=" + MES);
/* Vargová má v appke objednávky zo skúšky 04; na „papieri" jej dáme iné
   číslo, aby sa rozdiel musel ukázať. */
await p.fill("#p-papier", "Vargová Zuzana\t99\nNiekto Neznámy\t3");
await p.click("button:has-text('Porovnať')");
await p.waitForLoadState("networkidle");
let t = await p.content();
ok("rozdiel je vypísaný", /rozchádza/.test(t));
ok("aj s osobným číslom", /3001/.test(t));
/* Meno, ktoré v menoslove nie je, sa nesmie ticho stratiť. */
ok("nespárované meno to povie", /nespárovalo/.test(t) && /Niekto Neznámy/.test(t));
ok("povie aj prečo", /v menoslove nie je/.test(t));
/* A druhá strana rozdielu — kto je v appke a na papieri nie je. */
ok("koho papier nemá, tiež ukáže", /V appke áno, na hárku nie/.test(t));

console.log("— keď sedí, povie to —");
const kolko = await p.evaluate(async m => {
  const r = await fetch("/mesiac?mesiac=" + m);
  const h = await r.text();
  const d = new DOMParser().parseFromString(h, "text/html");
  const r1 = [...d.querySelectorAll("table.podklad tbody tr:not(.sucet)")];
  return r1.map(x => {
    const c = x.querySelectorAll("td");
    /* Prvý textový uzol — za menom môžu byť odznaky („na rozhodnutie"),
       ktoré do mena nepatria. */
    return [c[1].childNodes[0].textContent.trim(), c[3].textContent.trim()];
  });
}, MES);
if (kolko.length) {
  await p.goto(A + "/porovnanie?mesiac=" + MES);
  await p.fill("#p-papier", kolko.map(([m, n]) => `${m}\t${n}`).join("\n"));
  await p.click("button:has-text('Porovnať')");
  await p.waitForLoadState("networkidle");
  t = await p.content();
  ok("zhodný hárok sa vyhlási za sediaci", /Sedí to na kus/.test(t));
} else ok("zhodný hárok sa vyhlási za sediaci — niet čo porovnať", true);

console.log("— neprihlásený sa sem nedostane —");
const c2 = await b.newContext();
const odp = await c2.request.get(A + "/porovnanie", { maxRedirects: 0 });
ok("nemá prístup",
   odp.status() === 403 || odp.status() === 303 || /prihlás/i.test(await odp.text()));

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
