/* Rozúčtovanie — dá sa overiť bez databázy aj bez prehliadača:
     node test/14-peniaze.mjs

   Čísla nie sú vymyslené: sú to tabuľky z konceptu 6.2, ktoré si Erik
   odsúhlasil. Keď sa niekedy zmení vzorec, musí sa zmeniť aj koncept — alebo
   to nie je oprava, ale chyba. */
import { obed, mesiac, naCenty, zEur, eur, nastavenieSedi, PREDVOLENE } from "../src/peniaze.js";

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };
const je = (t, a, b) => ok(`${t}: ${a}${a === b ? "" : " (čakané " + b + ")"}`, a === b);
/* Do centov, aby sa dalo porovnávať s tabuľkou v koncepte. */
const c = x => naCenty(x);

console.log("— zaokrúhľovanie —");
je("pol centa nahor", naCenty(50), 1);
je("tesne pod pol centa nadol", naCenty(49), 0);
je("celý cent", naCenty(100), 1);
je("z eur do vnútornej jednotky", zEur("5.29"), 52900);
/* Toto je ten prípad, na ktorom sa `Math.round(v*100)/100` a `toFixed(2)`
   rozchádzali — číslo, ktoré v dvojkovej sústave nemá presný tvar. */
je("hranica polcenta na 1,005", naCenty(zEur(1.005)), 101);
je("tvar pre obrazovku", eur(208), "2,08 €");
je("aj s nulou", eur(500), "5,00 €");

console.log("— ekonomický model, tabuľka z konceptu 6.2 —");
/* Základná cena 5,00 €, teda firma nesie všetko nad 35 % z nej: 3,25 €. */
const Z = zEur(5.00);
const eko = cena => obed({ cena: zEur(cena), zaklad: Z, model: "eko" });

for (const [cena, zamestnavatel, stravnikPct, plati] of [
  [5.00, 325, 35.0, 208],
  [5.50, 325, 40.9, 268],
  [5.75, 325, 43.5, 298],
  [6.50, 358, 45.0, 348],
  [7.00, 385, 45.0, 375]
]) {
  const o = eko(cena);
  je(`${cena.toFixed(2)} → zamestnávateľ`, c(o.zl + o.fond), zamestnavatel);
  je(`${cena.toFixed(2)} → podiel stravníka`,
     Math.round(o.stravnik / zEur(cena) * 1000) / 10, stravnikPct);
  je(`${cena.toFixed(2)} → platí s DPH`, c(o.plati), plati);
}

console.log("— zlom pri 5,91 € —");
/* Do tejto ceny fond dopĺňa a príspevok firmy drží presne na strope. Nad ňou
   už samotné zákonné minimum strop prekročí a fond sa nepoužije vôbec. */
const zlom = eko(5.91);
je("fond je presne nula", zlom.fond, 0);
je("zamestnávateľ je stále na strope", c(zlom.zl + zlom.fond), 325);
ok("stravník je presne na hornej hranici pásma",
   zlom.stravnik === Math.round(zEur(5.91) * 45 / 100));
ok("tesne pod zlomom fond ešte dopĺňa", eko(5.90).fond > 0);
ok("tesne nad zlomom už nie", eko(5.92).fond === 0);

console.log("— nad zlomom nesie zdraženie stravník —");
for (const cena of [6.00, 6.50, 7.00, 8.00, 8.30]) {
  const o = eko(cena);
  ok(`${cena.toFixed(2)} → delenie je presne 55/45`,
     o.fond === 0 &&
     o.zl === Math.round(zEur(cena) * 55 / 100) &&
     o.stravnik === Math.round(zEur(cena) * 45 / 100));
}

console.log("— štandardný model —");
const std = obed({ cena: zEur(5.00), model: "std" });
je("zamestnávateľ 55 %", c(std.zl), 275);
je("stravník 35 %", c(std.stravnik), 175);
je("fond je zvyšok, teda 10 %", c(std.fond), 50);

console.log("— pri najlacnejšom poskytovateľovi sú modely totožné —");
/* Tvrdenie z konceptu: ekonomický model je zovšeobecnením štandardného, nie
   jeho protikladom. Ak sa hladina odvodzuje od vlastnej ceny, musia vyjsť
   rovnako — inak sa nedá zapnúť predvolene pri každej novej jedálni. */
for (const cena of [4.20, 5.00, 6.30, 7.20]) {
  const a = obed({ cena: zEur(cena), model: "std" });
  const b = obed({ cena: zEur(cena), zaklad: zEur(cena), model: "eko" });
  ok(`${cena.toFixed(2)} → rovnaké rozdelenie`,
     a.zl === b.zl && a.fond === b.fond && a.stravnik === b.stravnik);
}

console.log("— súčet vždy dá cenu —");
/* Toto je to, čo nesmie prasknúť nikdy: čo firma zaplatí jedálni, musí byť
   presne to, čo sa medzi troch rozdelí. Skúša sa to na širokom rozsahu cien,
   nie na troch vybraných. */
let sedi = 0, vsetkych = 0;
for (let h = 100; h <= 200000; h += 137) {           // 0,01 € až 20 € po ~1,4 centa
  const o = obed({ cena: h, zaklad: Z, model: "eko" });
  vsetkych++;
  if (o.zl + o.fond + o.stravnik === h) sedi++;
  if (o.fond < 0 || o.stravnik < 0 || o.zl < 0) { sedi = -1; break; }
}
je("rozdelenie sedí na cenu pri každej cene", sedi, vsetkych);

console.log("— bez nároku ide obed v plnej cene (6.4) —");
const bez = obed({ cena: zEur(6.30), zaklad: Z, narok: false });
je("firma neprispieva", bez.zl + bez.fond, 0);
je("stravník nesie celú cenu", bez.stravnik, zEur(6.30));
ok("aj s DPH", bez.plati > bez.stravnik);

console.log("— zákonný strop —");
/* Pri dnešnom stravnom 8,30 € nezasiahne — cena by musela presiahnuť 8,30 €
   bez DPH, teda 9,88 € s DPH. Najdrahšia jedáleň má 7,20 €. */
ok("pri 7,20 € nezasiahne", obed({ cena: zEur(7.20), zaklad: Z }).orezane === 0);
ok("pri 8,30 € ešte nie", obed({ cena: zEur(8.30), zaklad: Z }).orezane === 0);
const orez = obed({ cena: zEur(12.00), zaklad: Z });
ok("pri 12 € už áno", orez.orezane > 0);
je("príspevok sa zastaví na 55 % zo stravného", c(orez.zl), c(zEur(8.30) * 55 / 100));
je("a súčet aj tak dá cenu", orez.zl + orez.fond + orez.stravnik, zEur(12.00));
ok("vypnutý strop neoreže nič",
   obed({ cena: zEur(12.00), zaklad: Z, n: { strop_zapnuty: false } }).orezane === 0);

console.log("— mesiac sa zaokrúhli raz —");
/* Dvadsať obedov po 5,91 €: keby sa zaokrúhľovala každá položka zvlášť,
   nazbieral by sa rozdiel oproti tomu, čo firma zaplatila jedálni. */
const dvadsat = Array.from({ length: 20 }, () => eko(5.91));
const m = mesiac(dvadsat);
je("počet obedov", m.poctov, 20);
je("podpoložky sa sčítajú presne na cenu", m.zl + m.fond + m.stravnik, m.cena);
je("cena za mesiac", m.cena, c(zEur(5.91) * 20));
ok("nič sa nestratilo ani nepribudlo", m.stravnik > 0 && m.zl > 0);

const mix = mesiac([eko(6.30), eko(7.20), eko(5.00), obed({ cena: zEur(6.30), narok: false })]);
je("aj v zmiešanom mesiaci súčet sedí", mix.zl + mix.fond + mix.stravnik, mix.cena);

console.log("— nastavenie, ktoré by rozbilo model —");
ok("55 + 45 prejde", nastavenieSedi(PREDVOLENE) === null);
ok("55 + 50 sa odmietne",
   /viac než 100/.test(nastavenieSedi({ ...PREDVOLENE, stravnik_do_pct: 50 }) ?? ""));
ok("prehodené pásmo sa odmietne",
   /vyššia než horná/.test(nastavenieSedi({ ...PREDVOLENE, stravnik_od_pct: 50 }) ?? ""));

process.exit(zle ? 1 : 0);
