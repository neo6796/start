/* Export mzdového podkladu — jeden súbor za firmu (koncept 6.3).

   Univerzálny, nie šitý na mieru: každá firma má vlastný mzdový softvér,
   takže prispôsobiť sa jednému by ostatným nepomohlo. Stĺpce majú
   zrozumiteľné názvy a pevné poradie, aby sa dali namapovať kdekoľvek.

   ── Prečo dva tvary ───────────────────────────────────────────────────────
   XLSX je pre človeka: sumy sú v ňom čísla, nie text, takže sa v ňom dá
   počítať a kontrolovať. CSV je pre stroj — na import do mzdového softvéru.

   Z toho plynie jediný rozdiel medzi nimi: **hlavičku má len XLSX.** Koncept
   ju žiada pri každom exporte (obdobie, kedy a kto), ale CSV s tromi riadkami
   textu nad tabuľkou je CSV, ktoré import odmietne — a import je jediné, na
   čo CSV je. Údaje z hlavičky preto pri CSV nesie názov súboru; nezmiznú,
   len sú tam, kde neprekážajú.

   ── Živnostníci ───────────────────────────────────────────────────────────
   V mzdovom podklade nie sú ani ako riadok s nulou (6.2a). Nefiltrujú sa tu
   dodatočne — filtruje sa hneď pri výbere, aby sa na to nedalo zabudnúť. */

import { jeden, zapis } from "./db.js";
import { dnes, prvyVMesiaci, mesiacPopis } from "./datum.js";
import { podklad } from "./mesiac.js";
import { zosit } from "./zosit.js";

/* Stĺpce v poradí z konceptu. `cislo` znamená, že v zošite to má byť číslo
   a v CSV suma s desatinnou čiarkou — nie text s eurom. */
const STLPCE = [
  ["Osobné číslo", c => c.kod ?? "",                    "text"],
  ["Priezvisko",   c => c.priezvisko,                   "text"],
  ["Meno",         c => c.meno,                         "text"],
  ["Firma",        c => c.firma ?? "",                  "text"],
  ["Stredisko",    c => c.prevadzka ?? c.tim ?? "",     "text"],
  ["Obedov",       c => c.s.poctov,                     "pocet"],
  ["Cena spolu bez DPH", c => c.s.cena,                 "cislo"],
  ["Príspevok zamestnávateľa", c => c.s.zl,             "cislo"],
  ["Sociálny fond", c => c.s.fond,                      "cislo"],
  ["Zrážka zo mzdy", c => c.s.plati,                    "cislo"]
];

/* Kód mzdy je ten istý človek videný mzdovým softvérom. Keď ho firma
   používa, patrí do exportu ako prvý stĺpec — inak by sa riadky museli
   párovať ručne. Pridáva sa len keď ho niekto naozaj má vyplnený; prázdny
   stĺpec by v každom podklade len zavadzal. */
function stlpce(ludia) {
  return ludia.some(c => c.kodMzdy)
    ? [["Kód pre mzdy", c => c.kodMzdy ?? "", "text"], ...STLPCE]
    : STLPCE;
}

/* Suma je vnútri v centoch (celé číslo). Do exportu ide ako euro s dvomi
   desatinnými miestami — a delí sa až tu, na jednom mieste. */
const naEura = centy => centy / 100;

/* ---------- CSV ---------- */

/* Bodkočiarka ako oddeľovač a desatinná čiarka: v slovenskom Exceli je to
   jediná kombinácia, ktorá sa otvorí rovno do stĺpcov. BOM je tam z toho
   istého dôvodu — bez neho Excel prečíta UTF-8 ako windows-1250 a diakritika
   sa rozsype. Riadky sa končia CRLF, ako to čaká väčšina importov. */
export function csv(hlavicka, riadky, oddelovac = ";") {
  /* Úvodzovky len tam, kde treba: suma „5,46" pri bodkočiarkovom oddeľovači
     nič nerozbíja a niektoré importy berú každú hodnotu v úvodzovkách ako
     text — teda ako sumu, s ktorou sa už nedá počítať. */
  const bunka = v => {
    const t = String(v ?? "");
    return t.includes(oddelovac) || /["\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const telo = [hlavicka, ...riadky]
    .map(r => r.map(bunka).join(oddelovac)).join("\r\n") + "\r\n";
  return Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(telo, "utf8")]);
}

/* ---------- názov súboru ---------- */

/* Bez diakritiky a bez medzier: názov súboru putuje cez e-mail, Windows aj
   cudzie mzdové systémy a v každom z nich sa dá pokaziť inak. */
export function bezDiakritiky(t) {
  return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function nazovSuboru({ mesiac, firma, skratka, uzavrete, pripona }) {
  return ["mzdy", mesiac.slice(0, 7), bezDiakritiky(skratka || firma || "bez-firmy"),
          uzavrete ? null : "odhad"].filter(Boolean).join("-") + "." + pripona;
}

/* ---------- obsluha ---------- */

export async function mzdy(k) {
  const prvy = prvyVMesiaci(k.url.searchParams.get("mesiac") || dnes());
  const firmaId = Number(k.url.searchParams.get("firma")) || null;
  const tvar = k.url.searchParams.get("tvar") === "csv" ? "csv" : "xlsx";
  const spat = t => k.inam(k.odp,
    `/mesiac?mesiac=${prvy.slice(0, 7)}&chyba=` + encodeURIComponent(t));

  /* Bez firmy sa neexportuje. Nie je to obmedzenie navyše: mzdový podklad
     je vždy za jednu firmu, lebo firma je to, čo delí peniaze — jeden súbor
     za všetkých by nevedel použiť ani jeden mzdový softvér. */
  if (!firmaId) return spat("Vyberte firmu — mzdový podklad sa exportuje za jednu firmu.");
  const f = await jeden("SELECT id, nazov, skratka FROM firma WHERE id = $1", [firmaId]);
  if (!f) return spat("Taká firma tu nie je.");

  const { ludia } = await podklad(prvy, { firmaId });
  const zamestnanci = ludia.filter(c => c.vztah !== "zivnostnik");
  if (!zamestnanci.length)
    return spat(`${f.nazov} nemá v mesiaci ${mesiacPopis(prvy)} žiadneho zamestnanca s obedom.`);

  const stav = await jeden("SELECT mzdy_uzavrete, mzdy_kedy FROM mesiac_stav WHERE mesiac = $1", [prvy]);
  const uzavrete = Boolean(stav?.mzdy_uzavrete);

  const s = stlpce(zamestnanci);
  const hlavicka = s.map(([p]) => p);
  const hodnota = ([, ako, druh], c) => {
    const v = ako(c);
    return druh === "cislo" ? naEura(v) : v;
  };

  const nazov = nazovSuboru({
    mesiac: prvy, firma: f.nazov, skratka: f.skratka,
    uzavrete, pripona: tvar
  });

  let data, typ;
  if (tvar === "csv") {
    /* V CSV ide suma ako text s desatinnou čiarkou — číslo s bodkou by sa
       v slovenskom Exceli prečítalo ako dátum alebo ako text. */
    const riadky = zamestnanci.map(c => s.map(st =>
      st[2] === "cislo" ? naEura(st[1](c)).toFixed(2).replace(".", ",") : st[1](c)));
    data = csv(hlavicka, riadky);
    typ = "text/csv; charset=utf-8";
  } else {
    /* Hlavička nad tabuľkou: obdobie, kedy a kto — a hlavne, či sú čísla
       zafixované, alebo je to odhad z bežiaceho mesiaca. V CSV to nie je,
       preto sa dole do súboru dostane aj to isté cez názov. */
    const uvod = [
      [`Mzdový podklad — ${f.nazov}`],
      ["Obdobie", mesiacPopis(prvy)],
      ["Stav", uzavrete ? "uzavreté" : "odhad — mesiac nie je uzavretý"],
      ["Vygenerované", new Date().toISOString().slice(0, 16).replace("T", " ")],
      ["Vygeneroval", `${k.osoba.priezvisko} ${k.osoba.meno}`],
      []
    ];

    /* Súčtový riadok je kontrolný súčet mzdového podkladu (6.3) — mzdárka
       podľa neho overí, že sa jej nič nestratilo. V CSV nie je: tam by z neho
       bol riadok človeka bez mena. */
    const spolu = s.map((st, i) => {
      if (i === 0) return `Spolu — ${zamestnanci.length}`;
      if (st[2] === "text") return "";
      /* Sčítava sa v centoch a delí až raz na konci: 5,46 + 3,00 v pohyblivej
         rádovej čiarke nie je 8,46 a v súčtovom riadku by to bolo vidieť. */
      const sucet = zamestnanci.reduce((a, c) => a + st[1](c), 0);
      return st[2] === "cislo" ? naEura(sucet) : sucet;
    });

    const riadky = [...uvod, hlavicka,
                    ...zamestnanci.map(c => s.map(st => hodnota(st, c))), spolu];
    data = zosit(`Mzdy ${prvy.slice(0, 7)}`, riadky, {
      tucne: [0, uvod.length, riadky.length - 1],
      peniaze: s.map(([, , druh], i) => druh === "cislo" ? i : -1).filter(i => i >= 0)
    });
    typ = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  /* Osobné údaje — pri sťahovaní zoznamu ľudí sa má vedieť, kto ho vzal
     a za aké obdobie (6.3, „Pravidlá pre všetky exporty"). */
  await zapis(k.osoba.id, "export.mzdy",
              { mesiac: prvy, firma: f.nazov, tvar, riadkov: zamestnanci.length, uzavrete });

  k.odp.writeHead(200, {
    "content-type": typ,
    "content-length": data.length,
    "content-disposition": `attachment; filename="${nazov}"`,
    "cache-control": "private, no-store",
    "x-content-type-options": "nosniff"
  });
  k.odp.end(data);
}
