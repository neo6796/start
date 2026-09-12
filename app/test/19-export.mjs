/* Tvar exportov — bez databázy aj bez prehliadača:
     node test/19-export.mjs

   Export sa neotvára u nás, ale v cudzom Exceli a v cudzom mzdovom softvéri.
   Chyba v jeho tvare sa tu neprejaví ničím — súbor sa stiahne, vyzerá dobre
   a rozsype sa až na druhej strane. Preto sa skúša práve tvar: BOM,
   oddeľovač, desatinná čiarka a to, že čísla ostanú číslami. */
import { csv, bezDiakritiky, nazovSuboru } from "../src/export.js";
import { zosit } from "../src/zosit.js";
import zlib from "node:zlib";

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };
const je = (t, a, b) => ok(`${t}: ${JSON.stringify(a)}${a === b ? "" : " (čakané " + JSON.stringify(b) + ")"}`, a === b);

console.log("— CSV pre mzdový softvér —");
const d = csv(["Osobné číslo", "Meno", "Zrážka zo mzdy"],
              [["4021", "Solár Erik", "12,34"], ["0007", "Baláž Ján Peter", "5,00"]]);

/* Bez BOM prečíta slovenský Excel UTF-8 ako windows-1250 a z „Solár" spraví
   „SolÃ¡r". Je to tri bajty, ktoré rozhodujú o použiteľnosti celého súboru. */
ok("začína sa BOM", d[0] === 0xEF && d[1] === 0xBB && d[2] === 0xBF);
const text = d.slice(3).toString("utf8");
ok("oddeľovač je bodkočiarka", text.split("\r\n")[0].split(";").length === 3);
ok("riadky sa končia CRLF", text.includes("\r\n"));
ok("diakritika ostala", text.includes("Solár"));
/* Suma v úvodzovkách je pre časť importov text — teda číslo, s ktorým sa už
   nedá počítať. Pri bodkočiarkovom oddeľovači ich netreba. */
ok("suma s desatinnou čiarkou nie je v úvodzovkách", text.includes(";12,34"));
ok("hodnota s bodkočiarkou sa uzavrie do úvodzoviek",
   csv(["a"], [["x;y"]]).toString("utf8").includes('"x;y"'));
ok("úvodzovka vo vnútri sa zdvojí",
   csv(["a"], [['on povedal "ahoj"']]).toString("utf8").includes('""ahoj""'));

console.log("— názov súboru —");
/* Názov putuje cez e-mail, Windows aj cudzí mzdový systém. V každom z nich
   sa dá pokaziť inak, tak v ňom nie je diakritika ani medzera. */
je("skratka firmy má prednosť pred názvom",
   nazovSuboru({ mesiac: "2026-08-01", firma: "Cronus s.r.o.", skratka: "CRO",
                 uzavrete: true, pripona: "csv" }), "mzdy-2026-08-CRO.csv");
je("bez skratky sa použije názov bez diakritiky",
   nazovSuboru({ mesiac: "2026-08-01", firma: "Poľnohospodárske družstvo",
                 uzavrete: true, pripona: "xlsx" }),
   "mzdy-2026-08-Polnohospodarske-druzstvo.xlsx");
/* Kým mesiac nie je uzavretý, sú čísla odhad — a to sa musí dať poznať aj
   na súbore, ktorý medzitým odišiel e-mailom. */
je("neuzavretý mesiac je v názve označený",
   nazovSuboru({ mesiac: "2026-08-01", firma: "HBE", skratka: "HBE",
                 uzavrete: false, pripona: "csv" }), "mzdy-2026-08-HBE-odhad.csv");
je("mäkčene a dĺžne idú preč", bezDiakritiky("Ľudovít Štúr"), "Ludovit-Stur");

console.log("— zošit —");
/* XLSX je zip. Keby sa pokazil, Excel povie len „súbor je poškodený" —
   preto sa tu rozbalí a pozrie sa dovnútra. */
const z = zosit("Mzdy", [["Podklad"], [], ["Meno", "Obedov", "Suma"],
                         ["Solár Erik", 12, 5.46], ["Spolu", 12, 5.46]],
                { tucne: [0, 2, 4], peniaze: [2] });
ok("je to zip", z.slice(0, 2).toString() === "PK");
const casti = new Map();
for (let i = 0; i + 4 < z.length;) {
  if (z.readUInt32LE(i) !== 0x04034b50) break;
  const dlzkaMena = z.readUInt16LE(i + 26), extra = z.readUInt16LE(i + 28);
  const meno = z.slice(i + 30, i + 30 + dlzkaMena).toString();
  const zac = i + 30 + dlzkaMena + extra, dlzka = z.readUInt32LE(i + 18);
  casti.set(meno, zlib.inflateRawSync(z.slice(zac, zac + dlzka)).toString("utf8"));
  i = zac + dlzka;
}
ok("obsahuje hárok", casti.has("xl/worksheets/sheet1.xml"));
const harok = casti.get("xl/worksheets/sheet1.xml") ?? "";
/* Číslo v úvodzovkách by v Exceli bolo text — a v texte sa nepočíta. */
ok("číslo je číslo, nie text", /<c r="B4"[^>]*><v>12<\/v><\/c>/.test(harok));
ok("suma má formát na dve desatinné miesta", /<c r="C4" s="2"><v>5.46<\/v><\/c>/.test(harok));
ok("súčtový riadok je tučný aj so sumou", /<c r="C5" s="3"><v>5.46<\/v><\/c>/.test(harok));
ok("hlavička tabuľky je tučná", /<c r="A3" t="inlineStr" s="1">/.test(harok));
/* Prázdny riadok medzi hlavičkou a tabuľkou musí ostať prázdnym riadkom.
   Keby sa vynechal, celá tabuľka by sa posunula o riadok vyššie a odkazy na
   bunky by prestali sedieť s tým, čo je nad nimi napísané. */
je("prázdny riadok ostal prázdny", harok.match(/<row r="2">.*?<\/row>/)?.[0], '<row r="2"></row>');
ok("a riadky pod ním sedia", /<c r="A4"/.test(harok) && /<c r="A5"/.test(harok));

process.exit(zle ? 1 : 0);
