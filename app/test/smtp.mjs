/* Skúšobný SMTP server. Používa ho 08-posta (protokol) aj 11-uzavierka
   (celá cesta od uzavierky po správu v kuchyni) — písať ho dvakrát by
   znamenalo, že jedna kópia raz zaostane za druhou.

   Certifikáty vyrába ten shellový skript, ktorý skúšku spúšťa; sem sa
   posiela len cesta k nim. */

import net from "node:net";
import tls from "node:tls";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CERTY = process.env.CERTY;

/* ---------- skúšobný SMTP server ---------- */

export function server({ prihlasenieZlyha = false } = {}) {
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

export const pocuvaj = s => new Promise(h => s.listen(0, "127.0.0.1", () => h(s.address().port)));
