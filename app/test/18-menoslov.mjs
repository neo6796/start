/* Čítanie menoslovu — bez databázy aj bez prehliadača:
     node test/18-menoslov.mjs

   Mená sú vymyslené. Skutočný menoslov do repozitára nepatrí — je verejný —
   ale **tvar** je presne ten, v akom menoslov chodí. Na tvare tu záleží, nie
   na tom, kto v ňom je. */
import { rozober, rozoberHlavicku } from "../src/ludia.js";

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };
const je = (t, a, b) => ok(`${t}: ${JSON.stringify(a)}${a === b ? "" : " (čakané " + JSON.stringify(b) + ")"}`, a === b);

console.log("— hlavička skupiny —");
/* Menoslov delí ľudí nadpismi „firma;prevádzka". Mreža na začiatku je
   nepovinná — kto ho píše v Exceli, ju tam nedá. */
je("bez mreže, bodkočiarka", rozoberHlavicku("--- Kolotoč;dielňa ---")?.firma, "Kolotoč");
je("prevádzka za bodkočiarkou", rozoberHlavicku("--- Kolotoč;dielňa ---")?.prevadzka, "dielňa");
je("s mrežou a čiarkou", rozoberHlavicku("# --- Kolotoč, dielňa ---")?.prevadzka, "dielňa");
je("názov s medzerou a číslom", rozoberHlavicku("--- Kolotoč 01;sklad ---")?.firma, "Kolotoč 01");
je("samotná firma", rozoberHlavicku("--- Kolotoč ---")?.prevadzka, null);
/* Bez pomlčiek by sa za hlavičku vyhlásil každý človek — má tiež bodkočiarky. */
ok("riadok človeka nie je hlavička", rozoberHlavicku("0001;Nováková;Elena;Ž") === null);
ok("prázdny riadok nie je hlavička", rozoberHlavicku("") === null);

console.log("— druh pomeru na konci riadku —");
/* Toto je tvar, v ktorom menoslov naozaj chodí. Keby sa skratka nerozoznala,
   zlepila by sa s krstným menom na „Elena Ž" a takto by sa aj uložila. */
const a = rozober("0001;Nováková;Elena;Ž");
je("meno ostane samo", a.meno, "Elena");
je("a vzťah sa prečíta", a.vztah, "zivnostnik");
je("TPP je pracovný pomer", rozober("0002;Bruk;Igor;TPP").vztah, "pp");
je("aj cez tabulátory", rozober("0003\tHruška\tPavol\tŽ").meno, "Pavol");
je("veľkosť písmen nevadí", rozober("0004;Sýkorová;Iva;ž").vztah, "zivnostnik");

console.log("— prevádzka pri človeku —");
/* V jednej firme sedia ľudia vo viacerých prevádzkach. Rozdeľovať ich na
   skupiny len kvôli tomu by z menoslovu spravilo samé nadpisy. */
const b2 = rozober("1001;Nováková;Elena;Z;dielňa");
je("meno ostane samo aj s piatym políčkom", b2.meno, "Elena");
je("vzťah sa prečíta", b2.vztah, "zivnostnik");
je("a prevádzka tiež", b2.prevadzka, "dielňa");
je("P je pracovný pomer", rozober("1002;Bruk;Igor;P;sklad").vztah, "pp");
je("dvojité meno pred pomerom ostane celé",
   rozober("1003;Baláž;Ján Peter;Z;sklad").meno, "Ján Peter");
je("bez prevádzky ostane prázdna", rozober("1004;Sýkorová;Iva;Z").prevadzka, null);

console.log("— ostatné tvary ostali —");
je("tri polia bez pomeru", rozober("0055;Malý;Ján").meno, "Ján");
je("a vzťah je vtedy prázdny", rozober("0055;Malý;Ján").vztah, null);
je("pomer hneď za číslom", rozober("0006;Ž;Kováč;Emil").priezvisko, "Kováč");
je("aj tam sa meno nezlepí", rozober("0006;Ž;Kováč;Emil").meno, "Emil");
je("bez osobného čísla", rozober(";Bezčísla;Jozef").kod, null);
je("dvojité krstné meno ostane celé", rozober("0007;Baláž;Ján Peter").meno, "Ján Peter");
ok("poznámka sa preskočí", rozober("# toto je poznámka") === null);
ok("prázdny riadok sa preskočí", rozober("   ") === null);
/* Tri slová oddelené medzerou sú platný riadok — tak chodí menoslov z
   textového súboru. Chyba je až vtedy, keď z riadku nevznikne meno. */
je("tri slová cez medzery sú človek", rozober("0055 Malý Ján").meno, "Ján");
ok("jedno slovo je chyba", rozober("nezmysel")?.chyba !== undefined);
ok("nezmyselné osobné číslo je chyba", rozober("čís/lo;Malý;Ján")?.chyba !== undefined);

process.exit(zle ? 1 : 0);
