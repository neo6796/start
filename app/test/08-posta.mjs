/* Odosielanie pošty proti vlastnému skúšobnému SMTP serveru.
   Beží bez databázy aj bez prehliadača:  ./test/posta.sh

   Zmysel: overiť protokol skôr, než sa appka pustí na skutočný mailový
   server. Zlé heslo tam v auguste stálo týždňovú blokáciu IP. */

import net from "node:net";
import tls from "node:tls";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CERTY = process.env.CERTY;
if (!CERTY) {
  console.error("Spúšťa sa cez ./test/posta.sh — ten vyrobí certifikáty pre skúšobný server.");
  process.exit(2);
}

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };

/* ---------- skúšobný SMTP server ---------- */

function server({ prihlasenieZlyha = false } = {}) {
  const prijate = [];
  const s = net.createServer(soket => {
    let telo = null, riadky = [];
    const posli = t => soket.write(t + "\r\n");
    const zaznam = { prikazy: [], data: "" };
    prijate.push(zaznam);

    posli("220 skusobny.server ESMTP");
    let zvysok = "";
    soket.setEncoding("utf8");
    soket.on("data", d => {
      zvysok += d;
      let i;
      while ((i = zvysok.indexOf("\r\n")) >= 0) {
        const r = zvysok.slice(0, i);
        zvysok = zvysok.slice(i + 2);
        if (telo !== null) {
          if (r === ".") { zaznam.data = telo; telo = null; posli("250 2.0.0 Ok: queued as ABC123"); }
          else telo += r + "\n";
          continue;
        }
        zaznam.prikazy.push(r);
        const u = r.toUpperCase();
        if (u.startsWith("EHLO")) posli("250-skusobny.server\r\n250-STARTTLS\r\n250 AUTH LOGIN");
        else if (u === "STARTTLS") {
          posli("220 2.0.0 Ready to start TLS");
          const t = new tls.TLSSocket(soket, {
            isServer: true,
            key: readFileSync(join(CERTY, "server.key")),
            cert: readFileSync(join(CERTY, "server.crt"))
          });
          soket.removeAllListeners("data");
          nadviaz(t, zaznam);
          return;
        }
        else if (u === "AUTH LOGIN") posli("334 VXNlcm5hbWU6");
        else if (u.startsWith("MAIL FROM") || u.startsWith("RCPT TO")) posli("250 2.1.0 Ok");
        else if (u === "DATA") { telo = ""; posli("354 End data with <CR><LF>.<CR><LF>"); }
        else if (u === "QUIT") { posli("221 Bye"); soket.end(); }
        else posli("250 2.0.0 Ok");
      }
    });

    /* Po STARTTLS pokračuje ten istý rozhovor, len šifrovane. */
    function nadviaz(t, zaznam) {
      let zvysok = "", telo = null, kolkoAuth = 0;
      const posli = x => t.write(x + "\r\n");
      t.setEncoding("utf8");
      t.on("data", d => {
        zvysok += d;
        let i;
        while ((i = zvysok.indexOf("\r\n")) >= 0) {
          const r = zvysok.slice(0, i);
          zvysok = zvysok.slice(i + 2);
          if (telo !== null) {
            if (r === ".") { zaznam.data = telo; telo = null; posli("250 2.0.0 Ok: queued as ABC123"); }
            else telo += r + "\n";
            continue;
          }
          zaznam.prikazy.push(r);
          const u = r.toUpperCase();
          if (u.startsWith("EHLO")) posli("250-skusobny.server\r\n250 AUTH LOGIN");
          else if (u === "AUTH LOGIN") { kolkoAuth = 1; posli("334 VXNlcm5hbWU6"); }
          else if (kolkoAuth === 1) { kolkoAuth = 2; posli("334 UGFzc3dvcmQ6"); }
          else if (kolkoAuth === 2) {
            kolkoAuth = 0;
            posli(prihlasenieZlyha ? "535 5.7.8 Authentication credentials invalid" : "235 2.7.0 Accepted");
          }
          else if (u.startsWith("MAIL FROM") || u.startsWith("RCPT TO")) posli("250 2.1.0 Ok");
          else if (u === "DATA") { telo = ""; posli("354 End data"); }
          else if (u === "QUIT") { posli("221 Bye"); t.end(); }
          else posli("250 2.0.0 Ok");
        }
      });
      t.on("error", () => {});
    }
    soket.on("error", () => {});
  });
  return { s, prijate };
}

const pocuvaj = s => new Promise(h => s.listen(0, "127.0.0.1", () => h(s.address().port)));

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
