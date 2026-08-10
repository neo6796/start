/* Dátumy sa dajú overiť bez databázy aj bez prehliadača:  node test/00-datumy.mjs */
import { pondelok, posun, dniTyzdna, tyzdenPopis, denMesiac, dlhy, oznacenie } from "../src/datum.js";

let zle = 0;
const ok = (t, v) => { if (!v) zle++; console.log((v ? "  ✓ " : "  ✗ ") + t); };
const je = (t, a, b) => ok(`${t}: ${a}${a === b ? "" : " (čakané " + b + ")"}`, a === b);

console.log("— pondelok týždňa —");
je("pondelok sám", pondelok("2026-08-10"), "2026-08-10");
je("streda", pondelok("2026-08-12"), "2026-08-10");
je("piatok", pondelok("2026-08-14"), "2026-08-10");
je("sobota ukazuje dopredu", pondelok("2026-08-15"), "2026-08-17");
je("nedeľa ukazuje dopredu", pondelok("2026-08-16"), "2026-08-17");
je("cez prelom roka", pondelok("2026-01-01"), "2025-12-29");

/* Práve preto sa počíta na poludnie v UTC: pri polnoci by deň zmeny času
   posunul dátum o jeden späť a piatkový obed by sa zaúčtoval na štvrtok. */
console.log("— zmena času —");
je("stred týždňa so zmenou času na jar", pondelok("2026-04-01"), "2026-03-30");
je("stred týždňa so zmenou času na jeseň", pondelok("2026-10-28"), "2026-10-26");
je("posun cez jarnú zmenu", posun("2026-03-28", 3), "2026-03-31");
je("posun cez jesennú zmenu", posun("2026-10-24", 3), "2026-10-27");

console.log("— týždeň —");
ok("päť pracovných dní", dniTyzdna("2026-08-10").length === 5);
je("posledný je piatok", dniTyzdna("2026-08-10")[4], "2026-08-14");
je("popis v jednom mesiaci", tyzdenPopis("2026-08-10"), "10. – 14. 8. 2026");
je("popis cez prelom mesiaca", tyzdenPopis("2026-08-31"), "31. 8. – 4. 9. 2026");
je("deň a mesiac", denMesiac("2026-08-04"), "4. 8.");
je("dlhý tvar", dlhy("2026-09-01"), "1. septembra 2026");

console.log("— označenia jedál —");
je("arabské", [0, 1, 4].map(i => oznacenie("arabic", i)).join(""), "125");
je("veľké písmená", [0, 1, 4].map(i => oznacenie("upper", i)).join(""), "ABE");
je("malé písmená", [0, 1, 4].map(i => oznacenie("lower", i)).join(""), "abe");
je("rímske", [0, 1, 4].map(i => oznacenie("roman", i)).join("·"), "I·II·V");

process.exit(zle ? 1 : 0);
