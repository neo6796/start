/* Mazanie číselníkov — len to, na čo nič neukazuje.
     ./test/obnov.sh && node test/01… && … && node test/06-mazanie.mjs */
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

console.log("— preklep sa dá zmazať —");
await p.goto(A + "/ciselniky");
await p.click("details:has(input[value=tim]) summary");
await p.fill("form.pridat:has(input[value=tim]) #p-tim-nazov", "Tím Preklpe");
await p.click("form.pridat:has(input[value=tim]) button[type=submit]");
await p.waitForLoadState("networkidle");
await p.click("tr:has-text('Tím Preklpe') a:has-text('Upraviť')");
ok("nepoužitá položka mazanie ponúka", (await p.content()).includes("Naozaj zmazať"));
await p.click("summary:has-text('Naozaj zmazať')");
await p.click("button:has-text('Zmazať natrvalo')");
await p.waitForLoadState("networkidle");
const t = await p.content();
ok("zmazanie potvrdené", t.includes("Zmazané: Tím Preklpe"));
/* Meno je aj v potvrdzovacej hláške, tak sa pozeráme do riadkov tabuľky. */
ok("zo zoznamu zmizol", (await p.locator("table.data tr:has-text('Tím Preklpe')").count()) === 0);

console.log("— použitý tím sa zmazať nedá —");
await p.click("tr:has-text('Tím Sever') a:has-text('Upraviť')");
const detail = await p.content();
ok("mazanie sa neponúka", !detail.includes("Naozaj zmazať"));
ok("povie, koľko na to ukazuje", /ukazuje naň\s*<strong>\s*[1-9]/.test(detail));
ok("odkáže na zneaktívnenie", detail.includes("Zneaktívniť"));

console.log("— obídenie tlačidla —");
/* Formulár sa dá poslať aj bez toho tlačidla; server musí kontrolovať znova. */
const znamka = await p.locator('input[name="znamka"]').first().inputValue();
const id = await p.locator('input[name="id"]').first().inputValue();
const kam = await p.evaluate(async ([z, i]) => {
  const telo = new URLSearchParams({ znamka: z, druh: "tim", id: i });
  const r = await fetch("/ciselniky/zmazat", { method: "POST", body: telo, redirect: "follow",
    headers: { "content-type": "application/x-www-form-urlencoded" } });
  return r.url;
}, [znamka, id]);
ok("server priame odoslanie odmietne", decodeURIComponent(kam).includes("Nezmazalo sa nič"));
await p.goto(A + "/ciselniky");
ok("tím tam stále je", (await p.content()).includes("Tím Sever"));

console.log("— použitá jedáleň —");
await p.click("tr:has-text('GASTROGAL') a:has-text('Upraviť')");
ok("jedáleň s objednávkami sa zmazať nedá", !(await p.content()).includes("Naozaj zmazať"));

console.log("— človek bez histórie —");
await p.goto(A + "/ludia");
await p.fill("#p-riadky", "9911;Omylný;Fero");
await p.click("form[action='/ludia/import'] button[type=submit]");
await p.waitForLoadState("networkidle");
await p.click("tr:has-text('Omylný') a:has-text('Upraviť')");
ok("človek bez objednávok sa dá zmazať", (await p.content()).includes("Naozaj zmazať"));
await p.click("summary:has-text('Naozaj zmazať')");
await p.click("button:has-text('Zmazať natrvalo')");
await p.waitForLoadState("networkidle");
ok("zmazanie človeka potvrdené", (await p.content()).includes("Zmazaný: Omylný Fero"));
ok("zo zoznamu zmizol", (await p.locator("table.data tr:has-text('Omylný')").count()) === 0);

console.log("— človek s objednávkou —");
await p.click("tr:has-text('Hrušovský') a:has-text('Upraviť')");
const dh = await p.content();
ok("s objednávkou sa zmazať nedá", !dh.includes("Naozaj zmazať"));
ok("povie čo mu bráni", /má[^<]*objedn/.test(dh));
ok("počty sú v správnom tvare", !/\b1 (objednávok|záznamov|tímov|týždňov)/.test(dh));
ok("odkáže na zneaktívnenie", dh.includes("Aktívny"));

console.log("— sám seba —");
await p.goto(A + "/ludia");
/* Meno predáka je v každom riadku, tak sa riadok hľadá podľa osobného čísla. */
await p.click("tr:has(td.num:text-is('4021')) a:has-text('Upraviť')");
const znamka2 = await p.locator('input[name="znamka"]').first().inputValue();
const idJa = await p.locator('input[name="id"]').first().inputValue();
const kam2 = await p.evaluate(async ([z, i]) => {
  const t = new URLSearchParams({ znamka: z, id: i });
  const r = await fetch("/osoba/zmazat", { method: "POST", body: t, redirect: "follow",
    headers: { "content-type": "application/x-www-form-urlencoded" } });
  return r.url;
}, [znamka2, idJa]);
ok("sám seba zmazať nemôže", decodeURIComponent(kam2).includes("Sám seba zmazať nemôžete"));

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
