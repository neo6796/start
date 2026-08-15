/* Obedár — HTTP server.

   Server vykresľuje HTML, žiadny rámec, žiadny zostavovací krok (11-etapa2-plan).
   Pred appkou stojí Caddy, ktorý rieši HTTPS; sem prichádza obyčajné HTTP. */

import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";
import { createHash } from "node:crypto";

import { migruj, bazen, jeden } from "./db.js";
import { podlaTokenu, zrus, prihlas, csrf, upratRelacie } from "./relacia.js";
import { holaStranka, esc } from "./html.js";
import * as stranky from "./stranky.js";
import * as ciselniky from "./ciselniky.js";
import * as ludia from "./ludia.js";
import * as matica from "./matica.js";
import * as menu from "./menu.js";
import * as uzavierkaObr from "./uzavierka.js";
import * as objednavka from "./objednavka.js";
import * as heslo from "./heslo.js";
import * as timy from "./timy.js";
import * as spatne from "./spatne.js";
import * as nastavenia from "./nastavenia.js";
import { jeMultipart, citaj } from "./multipart.js";

const tu = dirname(fileURLToPath(import.meta.url));
const VEREJNE = join(tu, "..", "public");
const PORT = Number(process.env.PORT ?? 3000);
const PRODUKCIA = process.env.NODE_ENV === "production";
const VERZIA = process.env.VERZIA ?? "vyvoj";
const COOKIE = "obedar";
const LIMIT_TELA = 1024 * 1024;

/* ---------- odpovede ---------- */

function posli(odp, kod, telo, hlavicky = {}) {
  const d = Buffer.isBuffer(telo) ? telo : Buffer.from(telo ?? "", "utf8");
  odp.writeHead(kod, {
    "content-length": d.length,
    "x-content-type-options": "nosniff",
    "referrer-policy": "same-origin",
    ...hlavicky
  });
  odp.end(d);
}

const html = (odp, kod, telo) => posli(odp, kod, telo, { "content-type": "text/html; charset=utf-8" });
const json = (odp, kod, telo) => posli(odp, kod, JSON.stringify(telo), { "content-type": "application/json; charset=utf-8" });
const inam = (odp, kam) => posli(odp, 303, "", { location: kam });

function chybovaStranka(odp, kod, nadpis, text) {
  html(odp, kod, holaStranka({
    titulok: nadpis, verzia: VERZIA,
    obsah: `<section class="wrap"><div class="screen-head"><h2>${esc(nadpis)}</h2></div>
            <div class="card"><p>${esc(text)}</p>
            <p style="margin-top:14px"><a class="btn" href="/">Späť na začiatok</a></p></div></section>`
  }));
}

/* ---------- vstup ---------- */

function cookies(ziad) {
  const von = {};
  for (const kus of (ziad.headers.cookie ?? "").split(";")) {
    const i = kus.indexOf("=");
    if (i > 0) von[kus.slice(0, i).trim()] = decodeURIComponent(kus.slice(i + 1).trim());
  }
  return von;
}

/* Zaškrtávacie políčka posielajú to isté meno viackrát. Object.fromEntries by
   z nich nechal posledné a hromadné priradenie by ticho zmenilo jedného človeka
   namiesto tridsiatich — preto sa opakované mená zbierajú do poľa. */
function parametre(sp) {
  const von = {};
  for (const kluc of new Set(sp.keys())) {
    const v = sp.getAll(kluc);
    von[kluc] = v.length > 1 ? v : v[0];
  }
  return von;
}

function telo(ziad) {
  return new Promise((hotovo, zle) => {
    let d = "", n = 0;
    ziad.on("data", k => {
      n += k.length;
      if (n > LIMIT_TELA) { zle(new Error("telo je pridlhé")); ziad.destroy(); return; }
      d += k;
    });
    ziad.on("end", () => hotovo(parametre(new URLSearchParams(d))));
    ziad.on("error", zle);
  });
}

/* Za Caddym je vzdialená adresa vždy adresa Caddyho. */
function adresa(ziad) {
  const f = ziad.headers["x-forwarded-for"];
  return (f ? String(f).split(",")[0] : ziad.socket.remoteAddress ?? "").trim();
}

/* ---------- statické súbory ---------- */

const TYPY = { ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
               ".js": "text/javascript; charset=utf-8", ".png": "image/png",
               ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };

function staticky(odp, cesta) {
  const cist = normalize(cesta).replace(/^(\.\.[/\\])+/, "");
  const subor = join(VEREJNE, cist);
  if (!subor.startsWith(VEREJNE) || !existsSync(subor) || !statSync(subor).isFile()) {
    return chybovaStranka(odp, 404, "Nenašlo sa", "Taký súbor tu nie je.");
  }
  const pripona = subor.slice(subor.lastIndexOf("."));
  const d = readFileSync(subor);
  const znacka = '"' + createHash("sha256").update(d).digest("base64url").slice(0, 16) + '"';
  posli(odp, 200, d, {
    "content-type": TYPY[pripona] ?? "application/octet-stream",
    "cache-control": "public, max-age=300",
    etag: znacka
  });
}

/* ---------- smerovanie ---------- */

/* [metóda, cesta, obsluha, rola]. Rola: null = aj neprihlásený,
   "kto" = ktokoľvek prihlásený, "predak", "admin". */
const CESTY = [
  ["GET",  "/zdravie",     zdravie,                 null],
  ["GET",  "/prihlasenie", stranky.prihlasenieForm, null],
  ["POST", "/prihlasenie", prihlasenieOdoslanie,    null],
  ["POST", "/odhlasenie",  odhlasenie,              "kto"],
  ["GET",  "/",            rozcestie,               "kto"],
  ["GET",  "/moje",        matica.moje,             "kto"],
  ["GET",  "/heslo",       heslo.zobraz,            "kto"],
  ["POST", "/heslo",       heslo.uloz,              "kto"],
  ["GET",  "/tim",         matica.tim,              "predak"],
  ["POST", "/tim",         matica.uloz,             "predak"],
  ["POST", "/tim/nepritomnost", matica.nepritomnost, "predak"],
  ["POST", "/tim/jedalne",      matica.jedalne_uloz, "predak"],
  ["GET",  "/uzavierka",           uzavierkaObr.zobraz,   "admin"],
  ["POST", "/uzavierka/uzavriet",  uzavierkaObr.uzavriet, "admin"],
  ["POST", "/uzavierka/otvorit",   uzavierkaObr.otvorit,  "admin"],
  ["POST", "/uzavierka/oprava",    uzavierkaObr.oprava,   "admin"],

  /* Potvrdenie prijatia otvára kuchár z e-mailu — bez prihlásenia.
     Tajomstvom je jednorazový token v odkaze, nie relácia. */
  ["GET",  "/potvrdenie",  objednavka.potvrdenieZobraz, null],
  ["POST", "/potvrdenie",  objednavka.potvrdenieUloz,   null],

  ["GET",  "/menu",         menu.zobraz,  "predak"],
  ["POST", "/menu",         menu.uloz,    "admin"],
  ["POST", "/menu/text",    menu.zText,   "admin"],
  ["GET",  "/menu/priloha", menu.priloha, "kto"],

  ["GET",  "/ciselniky",        ciselniky.zoznam, "admin"],
  ["POST", "/ciselniky/pridat", ciselniky.pridat, "admin"],
  ["POST", "/ciselniky/stav",   ciselniky.stav,   "admin"],
  ["POST", "/ciselniky/zmazat", ciselniky.zmazat, "admin"],
  ["GET",  "/ciselnik",         ciselniky.detail, "admin"],
  ["POST", "/ciselnik",         ciselniky.uloz,   "admin"],

  ["GET",  "/timy",            timy.zoznam,    "admin"],
  ["POST", "/timy/pridat",     timy.pridat,    "admin"],
  ["POST", "/timy/uloz",       timy.uloz,      "admin"],
  ["POST", "/timy/stav",       timy.stav,      "admin"],
  ["POST", "/timy/zmazat",     timy.zmazat,    "admin"],

  ["GET",  "/ludia",           ludia.zoznam,   "admin"],
  ["POST", "/ludia/import",    ludia.importuj, "admin"],
  ["POST", "/ludia/hromadne",  ludia.hromadne, "admin"],
  ["GET",  "/osoba",           ludia.detail,   "admin"],
  ["POST", "/osoba",           ludia.uloz,     "admin"],
  ["POST", "/osoba/heslo",     ludia.nasHeslo, "admin"],
  ["POST", "/osoba/zmazat",    ludia.zmazat,   "admin"],

  ["GET",  "/spatne",          spatne.obrazovka, "admin"],
  ["POST", "/spatne/uloz",     spatne.uloz,      "admin"],

  ["GET",  "/nastavenia",      nastavenia.zobraz, "admin"],
  ["POST", "/nastavenia",      nastavenia.uloz,   "admin"]
];

function smie(osoba, rola) {
  if (rola === null) return true;
  if (!osoba) return false;
  if (rola === "kto") return true;
  if (rola === "predak") return osoba.je_predak || osoba.je_admin;
  if (rola === "admin") return osoba.je_admin;
  return false;
}

async function zdravie(k) {
  try {
    await jeden("SELECT 1 AS x");
    json(k.odp, 200, { stav: "ok", verzia: VERZIA });
  } catch (e) {
    json(k.odp, 503, { stav: "databaza-nedostupna", chyba: e.message });
  }
}

function rozcestie(k) {
  inam(k.odp, k.osoba.je_predak || k.osoba.je_admin ? "/tim" : "/moje");
}

function cookieHlavicka(token, dni) {
  const casti = [`${COOKIE}=${token}`, "Path=/", "HttpOnly", "SameSite=Lax",
                 `Max-Age=${dni * 24 * 3600}`];
  if (PRODUKCIA) casti.push("Secure");
  return casti.join("; ");
}

async function prihlasenieOdoslanie(k) {
  const d = k.data;
  const v = await prihlas(d.kod ?? "", d.heslo ?? "", adresa(k.ziad));
  if (v.chyba) {
    return html(k.odp, 401, stranky.prihlasenieHtml({ chyba: v.chyba, kod: d.kod, verzia: VERZIA }));
  }
  posli(k.odp, 303, "", { location: "/", "set-cookie": cookieHlavicka(v.token, 30) });
}

async function odhlasenie(k) {
  await zrus(k.token);
  posli(k.odp, 303, "", { location: "/prihlasenie", "set-cookie": cookieHlavicka("", 0) });
}

/* ---------- server ---------- */

const server = http.createServer(async (ziad, odp) => {
  const url = new URL(ziad.url, "http://obedar");
  const cesta = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (cesta.startsWith("/static/")) return staticky(odp, cesta.slice(8));

    const token = cookies(ziad)[COOKIE] ?? null;
    const osoba = await podlaTokenu(token);

    const zhoda = CESTY.filter(c => c[1] === cesta);
    if (!zhoda.length) return chybovaStranka(odp, 404, "Nenašlo sa", "Taká stránka tu nie je.");

    const riadok = zhoda.find(c => c[0] === ziad.method);
    if (!riadok) return chybovaStranka(odp, 405, "Nepodporené", "Táto stránka sa takto volať nedá.");

    const [, , obsluha, rola] = riadok;
    if (!smie(osoba, rola)) {
      if (!osoba) return inam(odp, "/prihlasenie");
      return chybovaStranka(odp, 403, "Nemáte prístup", "Na túto obrazovku vaša rola nestačí.");
    }

    /* Formulárové dáta číta smerovač, nie obsluha — inak by sa na kontrolu
       známky ľahko zabudlo práve tam, kde sa niečo mení. */
    let data = null, subory = null;
    const znamka = token ? csrf(token) : null;
    if (ziad.method === "POST") {
      /* Formulár s prílohou príde inak než obyčajný. Rozhoduje o tom hlavička,
         nie cesta — inak by sa na to pri pridaní ďalšieho formulára zabudlo. */
      if (jeMultipart(ziad)) ({ polia: data, subory } = await citaj(ziad));
      else data = await telo(ziad);
      if (osoba && data.znamka !== znamka) {
        return chybovaStranka(odp, 403, "Formulár sa neprijal",
          "Stránka bola otvorená pridlho alebo prišla odinakiaľ. Otvorte ju znova a skúste to ešte raz.");
      }
    }

    await obsluha({ ziad, odp, osoba, token, url, data, subory, verzia: VERZIA,
                    csrf: znamka, html, json, inam, telo });
  } catch (e) {
    console.error("chyba pri", ziad.method, cesta, "—", e);
    if (!odp.headersSent) {
      chybovaStranka(odp, 500, "Niečo sa pokazilo",
        "Chybu sme si zapísali. Skúste to prosím znova; ak sa to bude opakovať, ozvite sa správcovi.");
    } else {
      odp.end();
    }
  }
});

/* ---------- štart a ukončenie ---------- */

async function start() {
  await migruj();
  const n = await upratRelacie();
  if (n) console.log(`upratané staré relácie: ${n}`);
  server.listen(PORT, () => console.log(`Obedár ${VERZIA} počúva na ${PORT}`));
}

/* Docker posiela SIGTERM; bez tohto by rozrobené požiadavky spadli. */
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    console.log("končím…");
    server.close(async () => { await bazen.end(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}

start().catch(e => { console.error("štart zlyhal:", e); process.exit(1); });
