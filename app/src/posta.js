/* Odosielanie pošty. Bez balíčka — SMTP je na to, čo potrebujeme, dosť
   jednoduchý protokol a jedna závislosť navyše je jedno miesto navyše,
   ktoré treba udržiavať a ktoré sa dá pokaziť pri nasadení.

   Pravidlo, ktoré tu platí nadovšetko: PRI ZLYHANÍ PRIHLÁSENIA SA NESKÚŠA
   ZNOVA. V auguste stačili dva pokusy so zlým menom a ochrana mailového
   servera zablokovala IP celého servera na týždeň. Chybné heslo sa opakovaním
   nespraví správnym — jediné, čo sa opakovaním dosiahne, je blokácia. */

import net from "node:net";
import tls from "node:tls";
import { randomUUID } from "node:crypto";

const CAKANIE = 20_000;

function nastavenia() {
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    meno: process.env.SMTP_MENO,
    heslo: process.env.SMTP_HESLO,
    od: process.env.SMTP_OD ?? "obedy@ahafarma.sk",
    /* Menom, ktorým sa server predstavuje, sa dá zbytočne prísť o dôveryhodnosť.
       Predstaviť sa doménou, z ktorej odosielame, je to najmenej, čo sa dá. */
    ehlo: process.env.SMTP_EHLO ?? "obedy.ahafarma.sk"
  };
}

export function postaJeNastavena() {
  const n = nastavenia();
  return Boolean(n.host && n.meno && n.heslo);
}

/* ---------- skladanie správy ---------- */

/* Predmet s diakritikou musí ísť zakódovaný, inak z neho v niektorých
   klientoch ostanú otázniky (RFC 2047). */
const predmetKod = s =>
  /^[\x20-\x7E]*$/.test(s) ? s : "=?UTF-8?B?" + Buffer.from(s, "utf8").toString("base64") + "?=";

const zalomit = s => (s.match(/.{1,76}/g) ?? []).join("\r\n");

/* Bodka na začiatku riadku ukončuje telo správy — musí sa zdvojiť.
   Netýka sa nás pri base64, ale telo sa raz môže posielať aj priamo. */
const chranBodky = s => s.replace(/^\./gm, "..");

function sprava({ od, komu, kopia, predmet, text, prilohy = [] }) {
  const hranica = "obedar-" + randomUUID();
  const hlavicky = [
    `From: Obedár <${od}>`,
    `To: ${[].concat(komu).join(", ")}`,
    kopia?.length ? `Cc: ${[].concat(kopia).join(", ")}` : null,
    `Subject: ${predmetKod(predmet)}`,
    /* Date a Message-ID si niektoré servery dopĺňajú samy, iné nie a správa
       potom padá do spamu alebo sa zoradí zle. Radšej ich napíšeme sami. */
    `Date: ${new Date().toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${randomUUID()}@${od.split("@")[1]}>`,
    "MIME-Version: 1.0"
  ].filter(Boolean);

  if (!prilohy.length) {
    hlavicky.push('Content-Type: text/plain; charset="utf-8"',
                  "Content-Transfer-Encoding: base64");
    return hlavicky.join("\r\n") + "\r\n\r\n" +
           zalomit(Buffer.from(text, "utf8").toString("base64"));
  }

  hlavicky.push(`Content-Type: multipart/mixed; boundary="${hranica}"`);
  const casti = [
    `--${hranica}`,
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: base64",
    "",
    zalomit(Buffer.from(text, "utf8").toString("base64"))
  ];
  for (const p of prilohy) {
    casti.push(
      `--${hranica}`,
      `Content-Type: ${p.typ ?? "application/octet-stream"}; name="${p.nazov}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${p.nazov}"`,
      "",
      zalomit(Buffer.from(p.data).toString("base64")));
  }
  casti.push(`--${hranica}--`);
  return hlavicky.join("\r\n") + "\r\n\r\n" + casti.join("\r\n");
}

/* ---------- rozhovor so serverom ---------- */

class Chyba extends Error {
  constructor(sprava, kod, prihlasenie = false) {
    super(sprava);
    this.kod = kod;
    this.prihlasenie = prihlasenie;   // true = neskúšať znova
  }
}

function rozhovor(soket) {
  let zvysok = "";
  const cakajuci = [];

  soket.setEncoding("utf8");
  soket.on("data", d => {
    zvysok += d;
    let i;
    while ((i = zvysok.indexOf("\r\n")) >= 0) {
      const riadok = zvysok.slice(0, i);
      zvysok = zvysok.slice(i + 2);
      /* Viacriadková odpoveď má na štvrtom mieste pomlčku; hotová je až tá,
         čo tam má medzeru. */
      if (/^\d{3}-/.test(riadok)) continue;
      const c = cakajuci.shift();
      if (c) c(riadok);
    }
  });

  const odpoved = () => new Promise(hotovo => cakajuci.push(hotovo));

  return {
    odpoved,
    async prikaz(text, tajne = false) {
      soket.write(text + "\r\n");
      const r = await odpoved();
      const kod = Number(r.slice(0, 3));
      if (kod >= 400) {
        const co = tajne ? "(skryté)" : text.split(" ")[0];
        throw new Chyba(`server odmietol ${co}: ${r}`, kod, tajne);
      }
      return r;
    }
  };
}

function spoj(host, port) {
  return new Promise((hotovo, zle) => {
    const s = net.connect({ host, port });
    s.setTimeout(CAKANIE, () => { s.destroy(); zle(new Chyba("server neodpovedal včas", 0)); });
    s.once("connect", () => hotovo(s));
    s.once("error", zle);
  });
}

function nadTls(soket, host) {
  return new Promise((hotovo, zle) => {
    const t = tls.connect({ socket: soket, servername: host }, () => hotovo(t));
    t.setTimeout(CAKANIE, () => { t.destroy(); zle(new Chyba("TLS neodpovedalo včas", 0)); });
    t.once("error", zle);
  });
}

/* Pošle jednu správu. Vracia { ok, id } alebo vyhodí Chybu.
   Pri chybe s `prihlasenie: true` sa NESMIE volať znova s tým istým heslom. */
export async function posli({ komu, kopia, predmet, text, prilohy }) {
  const n = nastavenia();
  if (!postaJeNastavena())
    throw new Chyba("odosielanie pošty nie je nastavené (SMTP_HOST, SMTP_MENO, SMTP_HESLO)", 0);

  const prijemcovia = [...[].concat(komu ?? []), ...[].concat(kopia ?? [])].filter(Boolean);
  if (!prijemcovia.length) throw new Chyba("chýba príjemca", 0);

  let soket = await spoj(n.host, n.port);
  let r = rozhovor(soket);
  await r.odpoved();                                  // pozdrav servera

  await r.prikaz(`EHLO ${n.ehlo}`);
  await r.prikaz("STARTTLS");

  soket.removeAllListeners("data");
  soket = await nadTls(soket, n.host);
  r = rozhovor(soket);

  await r.prikaz(`EHLO ${n.ehlo}`);

  /* AUTH LOGIN — meno a heslo v base64, každé zvlášť. */
  await r.prikaz("AUTH LOGIN");
  await r.prikaz(Buffer.from(n.meno, "utf8").toString("base64"), true);
  await r.prikaz(Buffer.from(n.heslo, "utf8").toString("base64"), true);

  await r.prikaz(`MAIL FROM:<${n.od}>`);
  for (const p of prijemcovia) await r.prikaz(`RCPT TO:<${p}>`);
  await r.prikaz("DATA");

  const telo = sprava({ od: n.od, komu, kopia, predmet, text, prilohy });
  soket.write(chranBodky(telo) + "\r\n.\r\n");
  const potvrdenie = await r.odpoved();
  if (Number(potvrdenie.slice(0, 3)) >= 400)
    throw new Chyba(`server neprijal správu: ${potvrdenie}`, Number(potvrdenie.slice(0, 3)));

  try { await r.prikaz("QUIT"); } catch { /* na rozlúčke už nezáleží */ }
  soket.end();

  return { ok: true, odpoved: potvrdenie.trim() };
}
