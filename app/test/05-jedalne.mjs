/* Prideľovanie jedální — správca pri človeku, predák nad svojím tímom.
     ./test/obnov.sh && node test/01… && … && node test/05-jedalne.mjs */
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

console.log("— správca pridelí druhú jedáleň —");
await p.goto(A + "/ludia");
await p.click("tr:has-text('Vargová') a:has-text('Upraviť')");
ok("ponúka sa druhá jedáleň", (await p.locator('input[name="jedalne"]').count()) === 1);
await p.check('input[name="jedalne"]');
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
ok("zaškrtnutie ostalo", await p.locator('input[name="jedalne"]').first().isChecked());

console.log("— matica ukáže dva riadky ponúk —");
/* Denná uzávierka zamyká dni, ktoré prebehli. Skúška preto pracuje
   s nasledujúcim týždňom, ktorý je celý otvorený. */
const TYZ = await (async () => {
  await p.goto(A + "/tim");
  const teraz = new URL(await p.getAttribute('a:has-text("tento týždeň")', "href"), A)
    .searchParams.get("tyzden");
  const d = new Date(teraz + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
})();
await p.goto(A + "/tim?tyzden=" + TYZ);
const riadok = p.locator("table.matrix tbody tr:has-text('Vargová')");
ok("Vargová má v bunke dva riadky jedální aj krížik",
   (await riadok.locator("td").nth(0).locator(".opt-row").count()) === 3);
ok("ponúka aj čísla aj písmená",
   (await riadok.locator("td").nth(0).locator('input[type=radio]').count()) === 11);
const iny = p.locator("table.matrix tbody tr:has-text('Malý')");
ok("kto má jednu, má jeden riadok",
   (await iny.locator("td").nth(0).locator(".opt-row").count()) === 1);

console.log("— objednávka z druhej jedálne —");
const abm = await riadok.locator("td").nth(0).locator('input[type=radio]').nth(6).getAttribute("value");
await riadok.locator("td").nth(0).locator('input[type=radio]').nth(6).check();
await p.click("button:has-text('Uložiť')");
await p.waitForLoadState("networkidle");
ok("voľba z druhej jedálne sa uložila",
   await p.locator("table.matrix tbody tr:has-text('Vargová')").locator("td").nth(0)
     .locator(`input[value="${abm}"]`).isChecked());

console.log("— predák prideľuje vo svojom tíme —");
await p.evaluate(() => { const d = document.querySelector('form[action="/tim/jedalne"]')?.closest("details"); if (d) d.open = true; });
ok("panel pridelenia existuje", (await p.locator('form[action="/tim/jedalne"]').count()) === 1);
/* Ktoré políčko je tá druhá jedáleň, závisí od abecedného poradia — preto
   sa zaškrtne to, ktoré ešte zaškrtnuté nie je. */
for (const ch of await p.locator('form[action="/tim/jedalne"] tr:has-text("Malý") input[type=checkbox]').all())
  if (!(await ch.isChecked())) await ch.check();
await p.click("button:has-text('Uložiť pridelenie')");
await p.waitForLoadState("networkidle");
ok("pridelenie uložené", /Pridelenie uložené/.test(await p.content()));
ok("Malý má teraz dva riadky ponúk",
   (await p.locator("table.matrix tbody tr:has-text('Malý')").locator("td").nth(0)
      .locator(".opt-row").count()) === 3);

console.log("— použitú jedáleň nemožno odobrať —");
await p.evaluate(() => { const d = document.querySelector('form[action="/tim/jedalne"]')?.closest("details"); if (d) d.open = true; });
for (const ch of await p.locator('form[action="/tim/jedalne"] tr:has-text("Vargová") input[type=checkbox]').all())
  await ch.uncheck();
await p.click("button:has-text('Uložiť pridelenie')");
await p.waitForLoadState("networkidle");
ok("odobratie použitej jedálne sa odmietne s vysvetlením",
   (await p.content()).includes("už tento mesiac niekto má objednané"));
/* Len pondelková bunka — vo zvyšku riadku sú krížiky z hromadného odhlásenia. */
ok("objednávka ostala nedotknutá",
   (await p.locator("table.matrix tbody tr:has-text('Vargová')")
      .locator("td").nth(0).locator("input:checked").count()) === 1);
/* Pri jednej jedálni visí krížik na konci jej riadku, takže riadok je jeden. */
ok("ostala jej len tá jedáleň, z ktorej má objednané",
   (await p.locator("table.matrix tbody tr:has-text('Vargová')")
      .locator("td").nth(0).locator(".opt-row").count()) === 1);

await b.close();
console.log(chyby.length ? "CHYBY: " + chyby.join(" | ") : "— žiadne chyby v prehliadači —");
process.exit(zle ? 1 : 0);
