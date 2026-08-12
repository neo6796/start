/* Čítanie jedálneho lístka od dodávateľa — bez databázy aj bez prehliadača.
   Skúšobné súbory sa nedodávajú (sú od dodávateľov), tak sa vyrobia tu. */
import { rozober, precitaj, zTextu } from "../src/listok.js";

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };

console.log("— tvar GASTROGALu (čísla) —");
const { jedla: g, tyzden: gTyzden } = rozober(`
Pondelok | 10.08.2026 Polievka zo sušeného hrachu • 0,3l (1)
1. Vyprážaný kurací rezeň, dusená ryža, šalát • 120g (1,3,7)
2. Bravčový perkelt, domáce halušky • 284/64g (1,3)
Utorok | 11.08.2026 Slepačí vývar • 0,3l (1)
1. Vyprážaný bravčový rezeň, varené zemiaky • 120g (1,3,7)
`);
ok("našiel pondelkové prvé jedlo", g.get("0|0")?.startsWith("Vyprážaný kurací rezeň"));
ok("našiel pondelkové druhé jedlo", g.get("0|1")?.startsWith("Bravčový perkelt"));
ok("utorok je oddelený", g.get("1|0")?.startsWith("Vyprážaný bravčový rezeň"));
ok("alergény na konci sa odrezali", !/\(1,3,7\)/.test(g.get("0|0") ?? ""));
ok("hlavička ďalšieho dňa sa do názvu nedostala", !/Utorok/.test(g.get("0|1") ?? ""));
ok("polievka nie je jedlo — nemá označenie", g.size === 3);
ok("týždeň sa určil z dátumov", gTyzden === "2026-08-10");

console.log("— tvar ABM (písmená) —");
const { jedla: a } = rozober(`
Pondelok  10.08.2026 Polievka: Rascová s vajíčkom
A.  Vyprážaný bravčový rezeň /120g, ryža, kompót (múka, vajcia)
B.  Morčací paprikáš /120g, halušky, uhorka
Utorok 11.08.2026
A.  Tradičný maďarský guláš /120g, domáca knedľa
`);
ok("písmená sa prevedú na poradie", a.get("0|0")?.startsWith("Vyprážaný bravčový rezeň"));
ok("B je druhé v poradí", a.get("0|1")?.startsWith("Morčací paprikáš"));
ok("ďalší deň sa oddelil", a.get("1|0")?.startsWith("Tradičný maďarský guláš"));

console.log("— dni sa odvodia aj bez ich názvov —");
/* Vo worde sa názvy dní často stratia. Vtedy platí poradie označení:
   keď sa vráti späť na A, začal ďalší deň. */
const { jedla: bez, tyzden: bezTyzden } = rozober(`
A.  Vyprážaný bravčový rezeň /120g, ryža
B.  Morčací paprikáš /120g, halušky
A.  Tradičný maďarský guláš /120g, knedľa
B.  Zapekané stehno /120g, pyré
`);
ok("prvý deň má dve jedlá", bez.get("0|0") && bez.get("0|1"));
ok("druhý deň sa začal po návrate na A", bez.get("1|0")?.startsWith("Tradičný maďarský"));
ok("bez dátumu sa týždeň netvári, že ho pozná", bezTyzden === null);

console.log("— deň sa berie z dátumu, nie z poradia —");
/* Vložiť sa dá aj kus lístka — jeden deň zo stredu týždňa. Bez dátumu by
   sa taký kus zaradil na pondelok a stredajšie menu by prepísalo pondelkové. */
const kus = rozober(`
Streda | 12.08.2026
1. Vyprážaný kurací rezeň, dusená ryža • 120g
2. Pečené výpečky, dusená kapusta • 150/250g
`);
ok("kus lístka sa zaradil na stredu", kus.jedla.get("2|0")?.startsWith("Vyprážaný kurací rezeň"));
ok("na pondelok sa nič nedalo", !kus.jedla.has("0|0"));
ok("týždeň sedí aj z jedného dňa", kus.tyzden === "2026-08-10");

/* Zo starého .doc súboru sa väčšina dátumov stratí a tie, čo prežijú, stoja
   ďaleko od jedál. Podľa nich by celý týždeň spadol na jeden deň, tak sa
   v takom prípade dátumy nesmú použiť — rozhodne poradie označení. */
const daleko = rozober(`Jedálny lístok 10.08.2026
${"Rôzne oznamy pre stravníkov. ".repeat(40)}
A.  Vyprážaný bravčový rezeň /120g, ryža
B.  Morčací paprikáš /120g, halušky
A.  Tradičný maďarský guláš /120g, knedľa
B.  Zapekané stehno /120g, pyré`);
ok("vzdialený dátum nezhrnie celý týždeň na jeden deň",
   daleko.jedla.get("1|0")?.startsWith("Tradičný maďarský"));
ok("aj tak vie, o ktorý týždeň ide", daleko.tyzden === "2026-08-10");

console.log("— čo sa medzi jedlá nesmie dostať —");
const { jedla: s } = rozober(`
Pondelok | 10.08.2026
1. Vyprážaný kurací rezeň, dusená ryža • 120g
Alergény: Jedlá môžu obsahovať alergény. 1. Obilniny obsahujúce lepok, 3. Vajcia a výrobky z nich.
`);
ok("zoznam alergénov sa nepočíta ako jedlo", s.size === 1);

console.log("— vložený text zo schránky —");
/* Takto vypadne lístok z prehliadača aj z Wordu: s hlavičkou, pätičkou,
   polievkami a hŕbou medzier. Nič z toho sa nesmie votrieť medzi jedlá. */
const vlozene = zTextu(`
JEDÁLNY LÍSTOK
Cena obedového menu s dovozom 6,30 EUR
Nahlasovania objednávok od 7:00 do 09:00 hod. Tel. kontakt: 0918/119 328
Pondelok | 10.08.2026
Polievka zo sušeného hrachu so zeleninou • 0,3l (1)
1. Vyprážaný kurací rezeň v panko strúhanke, dusená ryža, šalát • 120g (1,3,7)
2. Bravčový perkelt (bez smotany), domáce halušky, kyslá uhorka • 284/64g (1,3)
Utorok | 11.08.2026
Slepačí vývar so zeleninou a rezancami • 0,3l (1)
1. Vyprážaný bravčový černohorský rezeň, varené zemiaky, šalát • 120g (1,3,7)
`);
ok("vložený text sa prečítal", vlozene.podarilo && vlozene.najdene.size === 3);
ok("hlavička a cena sa medzi jedlá nedostali",
   !/JEDÁLNY|6,30|kontakt/.test([...vlozene.najdene.values()].join(" ")));
ok("telefónne číslo s lomkou nie je jedlo",
   ![...vlozene.najdene.values()].some(n => n.includes("119 328")));

/* Word necháva za názvom dlhé rady medzier a zoznam alergénov až na konci
   riadka — po vložení to ostáva tak, ako to bolo v dokumente. */
const abm = zTextu(`
Pondelok  10.08.2026
Polievka:  Rascová s vajíčkom a zeleninou                              (múka, vajcia)
A.  Vyprážaný bravčový rezeň /120g, ryža, kompót                       (múka, vajcia, mlieko)
B.  Morčací paprikáš /120g, halušky, uhorka                            (múka, vajcia, mlieko)
Utorok  11.08.2026
A.  Tradičný maďarský guláš /120g, domáca knedľa                       (múka, vajcia, mlieko)
`);
ok("dlhé medzery z Wordu neprekážajú", abm.podarilo && abm.najdene.size === 3);
ok("názov sa neťahá cez celý riadok medzier",
   abm.najdene.get("0|0") === "Vyprážaný bravčový rezeň /120g, ryža, kompót");

ok("vložený text vie povedať, na ktorý je týždeň", vlozene.tyzden === "2026-08-10");
ok("aj z Wordu sa týždeň prečíta", abm.tyzden === "2026-08-10");
/* Nezmyselný dátum (31. februára) sa nesmie stať týždňom. */
ok("neplatný dátum sa preskočí",
   zTextu("Pondelok 31.02.2026\n1. Vyprážaný rezeň, ryža • 120g").tyzden === null);

ok("prázdne políčko to povie po slovensky", zTextu("  ").dovod === "políčko bolo prázdne");
ok("text bez jedál to povie zrozumiteľne",
   zTextu("Dobrý deň, posielam lístok na budúci týždeň.").dovod?.includes("1. alebo A."));

console.log("— polievka —");
/* Polievka nemá označenie, tak medzi jedlá nepatrí — ale stravníka zaujíma.
   Každý dodávateľ ju píše inak a ani jeden ju vždy nenazve „polievka". */
const pol = rozober(`
Pondelok | 10.08.2026
Polievka zo sušeného hrachu so zeleninou • 0,3l (1)
1. Vyprážaný kurací rezeň, dusená ryža • 120g (1,3,7)
Utorok | 11.08.2026
Slepačí vývar so zeleninou a rezancami • 0,3l (1)
1. Vyprážaný bravčový rezeň, varené zemiaky • 120g (1,3,7)
Streda | 12.08.2026
Staročeská kulajda (zemiaky, šampiňóny, vajcia, kôpor) • 0,3l (1,3,7)
1. Pečené výpečky, dusená kapusta • 150/250g (1)
`);
ok("polievka sa našla, aj keď sa tak nevolá",
   pol.polievky.get(1) === "Slepačí vývar so zeleninou a rezancami • 0,3l");
ok("slovo Polievka na začiatku sa neopakuje",
   pol.polievky.get(0) === "zo sušeného hrachu so zeleninou • 0,3l");
ok("zloženie v zátvorke ostáva, alergény idú preč",
   pol.polievky.get(2) === "Staročeská kulajda (zemiaky, šampiňóny, vajcia, kôpor) • 0,3l");
ok("medzi jedlá sa polievka nedostala", pol.jedla.size === 3 && !pol.jedla.get("0|0").includes("hrachu"));

const polA = rozober(`
Pondelok  10.08.2026
Polievka:  Rascová s vajíčkom a zeleninou                    (múka, vajcia)
A.  Vyprážaný bravčový rezeň /120g, ryža, kompót             (múka, vajcia, mlieko)
Utorok  11.08.2026
Polievka:  Richtárska                                        (múka)
A.  Tradičný maďarský guláš /120g, domáca knedľa             (múka, vajcia, mlieko)
`);
ok("tvar s dvojbodkou sa prečíta", polA.polievky.get(0) === "Rascová s vajíčkom a zeleninou");
ok("aj jednoslovná", polA.polievky.get(1) === "Richtárska");

ok("bez polievky sa nič nevymyslí", rozober(`
Pondelok | 10.08.2026
1. Vyprážaný kurací rezeň, dusená ryža • 120g
`).polievky.size === 0);

console.log("— odmietnutia —");
ok("obrázok sa odmietne zrozumiteľne",
   precitaj("foto.jpg", "image/jpeg", Buffer.from("x")).dovod?.includes("čítať neviem"));
ok("PDF bez textu to povie",
   /textovú vrstvu|označené jedlá/.test(precitaj("x.pdf", "application/pdf", Buffer.from("%PDF-1.4")).dovod ?? ""));

process.exit(zle ? 1 : 0);
