/* Čítanie jedálneho lístka od dodávateľa — bez databázy aj bez prehliadača.
   Skúšobné súbory sa nedodávajú (sú od dodávateľov), tak sa vyrobia tu. */
import { rozober, precitaj } from "../src/listok.js";

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };

console.log("— tvar GASTROGALu (čísla) —");
const g = rozober(`
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

console.log("— tvar ABM (písmená) —");
const a = rozober(`
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
const bez = rozober(`
A.  Vyprážaný bravčový rezeň /120g, ryža
B.  Morčací paprikáš /120g, halušky
A.  Tradičný maďarský guláš /120g, knedľa
B.  Zapekané stehno /120g, pyré
`);
ok("prvý deň má dve jedlá", bez.get("0|0") && bez.get("0|1"));
ok("druhý deň sa začal po návrate na A", bez.get("1|0")?.startsWith("Tradičný maďarský"));

console.log("— čo sa medzi jedlá nesmie dostať —");
const s = rozober(`
Pondelok | 10.08.2026
1. Vyprážaný kurací rezeň, dusená ryža • 120g
Alergény: Jedlá môžu obsahovať alergény. 1. Obilniny obsahujúce lepok, 3. Vajcia a výrobky z nich.
`);
ok("zoznam alergénov sa nepočíta ako jedlo", s.size === 1);

console.log("— odmietnutia —");
ok("obrázok sa odmietne zrozumiteľne",
   precitaj("foto.jpg", "image/jpeg", Buffer.from("x")).dovod?.includes("čítať neviem"));
ok("PDF bez textu to povie",
   /textovú vrstvu|označené jedlá/.test(precitaj("x.pdf", "application/pdf", Buffer.from("%PDF-1.4")).dovod ?? ""));

process.exit(zle ? 1 : 0);
