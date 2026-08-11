/* Odosielanie pošty proti vlastnému skúšobnému SMTP serveru.
   Beží bez databázy aj bez prehliadača:  ./test/posta.sh

   Zmysel: overiť protokol skôr, než sa appka pustí na skutočný mailový
   server. Zlé heslo tam v auguste stálo týždňovú blokáciu IP. */

import { server, pocuvaj } from "./smtp.mjs";

if (!process.env.CERTY) {
  console.error("Spúšťa sa cez ./test/posta.sh — ten vyrobí certifikáty pre skúšobný server.");
  process.exit(2);
}

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };

/* ---------- skúšky ---------- */

async function sPortom(volby, telo) {
  const { s, prijate } = server(volby);
  const port = await pocuvaj(s);
  process.env.SMTP_HOST = "localhost";
  process.env.SMTP_PORT = String(port);
  process.env.SMTP_MENO = "obedy";
  process.env.SMTP_HESLO = "tajne";
  process.env.SMTP_OD = "obedy@ahafarma.sk";
  const { posli } = await import("../src/posta.js?" + port);
  try { return await telo(posli, prijate); } finally { s.close(); }
}

console.log("— odoslanie —");
await sPortom({}, async (posli, prijate) => {
  const v = await posli({
    komu: "objednavky@gastrogal.sk",
    predmet: "Objednávka obedov na piatok 14. augusta",
    text: "Dobrý deň,\n\nposielame objednávku.\n\nS pozdravom\nObedár"
  });
  ok("server správu prijal", v.ok);

  const z = prijate.find(x => x.data);
  const hlavicky = z.data.split("\n\n")[0];
  ok("predstavuje sa doménou, nie localhostom",
     z.prikazy.some(p => /^EHLO obedy\.ahafarma\.sk$/i.test(p)));
  ok("STARTTLS prebehlo", z.prikazy.some(p => p.toUpperCase() === "STARTTLS"));
  ok("hlavička From je vyplnená", /^From: Obedár <obedy@ahafarma\.sk>$/m.test(hlavicky));
  ok("Date je vlastný", /^Date: \w{3}, \d{1,2} \w{3} \d{4}/m.test(hlavicky));
  ok("Message-ID je vlastný", /^Message-ID: <[0-9a-f-]{36}@ahafarma\.sk>$/m.test(hlavicky));

  /* Predmet s diakritikou musí ísť zakódovaný, inak z neho ostanú otázniky. */
  const predmet = hlavicky.match(/^Subject: (.+)$/m)[1];
  ok("predmet s diakritikou je zakódovaný", predmet.startsWith("=?UTF-8?B?"));
  ok("a dá sa prečítať späť",
     Buffer.from(predmet.slice(10, -2), "base64").toString("utf8")
       === "Objednávka obedov na piatok 14. augusta");

  const telo = z.data.split("\n\n").slice(1).join("\n\n").replace(/\n/g, "");
  ok("telo sa dekóduje na to, čo sme poslali",
     Buffer.from(telo, "base64").toString("utf8").includes("posielame objednávku"));
});

console.log("— príloha —");
await sPortom({}, async (posli, prijate) => {
  await posli({
    komu: "kuchyna@example.sk", predmet: "Menu", text: "V prílohe.",
    prilohy: [{ nazov: "menu.pdf", typ: "application/pdf", data: Buffer.from("%PDF-1.4 skusobny") }]
  });
  const z = prijate.find(x => x.data);
  ok("správa je viacdielna", /Content-Type: multipart\/mixed/.test(z.data));
  ok("príloha má názov", /filename="menu\.pdf"/.test(z.data));
  ok("príloha sa dekóduje", z.data.includes(Buffer.from("%PDF-1.4 skusobny").toString("base64")));
});

console.log("— zlé heslo —");
await sPortom({ prihlasenieZlyha: true }, async (posli, prijate) => {
  let chyba = null;
  try { await posli({ komu: "x@y.sk", predmet: "x", text: "x" }); } catch (e) { chyba = e; }
  ok("odoslanie zlyhá", chyba !== null);
  ok("kód od servera je 535", chyba?.kod === 535);
  /* Toto je to podstatné: appka musí vedieť, že opakovať sa nesmie. */
  ok("označí sa ako zlyhanie prihlásenia", chyba?.prihlasenie === true);
  ok("heslo sa do hlášky nedostane", !String(chyba?.message).includes("tajne"));
  const z = prijate.at(-1);
  ok("po odmietnutí sa už neposiela nič ďalšie",
     !z.prikazy.some(p => p.toUpperCase().startsWith("MAIL FROM")));
});

console.log(zle ? `\n${zle} kontrol zlyhalo` : "\nvšetko prešlo");
process.exit(zle ? 1 : 0);
