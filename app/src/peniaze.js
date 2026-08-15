/* Rozúčtovanie ceny obeda (koncept 6.2).

   Toto je jediná časť appky, kde chyba stojí peniaze — preto je oddelená od
   obrazoviek, počíta sa v celých číslach a je obalená skúškami priamo z
   tabuliek v koncepte.

   ── Jednotka ──────────────────────────────────────────────────────────────
   Vnútri sa počíta v **stotinách centa** (10⁻⁴ €) ako celé čísla. Nie v
   eurách a nie v `float`: 0,1 + 0,2 nie je v pohyblivej rádovej čiarke 0,3 a
   pri sumách, podľa ktorých sa niekomu strháva zo mzdy, to nie je kuriozita,
   ale chyba. Tá jednotka nie je vymyslená — ceny sú v databáze `numeric(8,4)`,
   teda presne na štyri desatinné miesta.

   ── Kde sa zaokrúhľuje ────────────────────────────────────────────────────
   Na obede sa počíta v plnej presnosti, **zaokrúhľuje sa až mesačný súčet za
   osobu** (rozhodnutie v 6.2). A zaokrúhľuje jediná funkcia — `naCenty()`.
   Pri stavbe preview sa ukázalo, že `Math.round(v*100)/100` a `v.toFixed(2)`
   sa na hranici polcenta rozídu; keď sa jedna použije na výpočet a druhá na
   zobrazenie, rozpis na doklade nesedí so súčtovým riadkom o cent.

   ── Prečo zvyšok, a nie tri zaokrúhlenia ─────────────────────────────────
   Podpoložky sa dopočítavajú ako zvyšok súčtu, nie zaokrúhľujú zvlášť. Inak
   by sa pri dvadsiatich obedoch nazbieral rozdiel oproti tomu, čo firma
   naozaj zaplatila jedálni — a nikto by nevedel, kde vznikol. */

/* Stotina centa. Cena 5,29 € je 52900. */
export const JEDNOTKA = 10000;

/* Jediné miesto, kde sa zaokrúhľuje. Zo stotín centa na celé centy, pol
   nahor. Sumy sú nezáporné; keby raz neboli, nech to padne hneď a nie ticho. */
export function naCenty(stotiny) {
  if (!Number.isFinite(stotiny)) throw new Error("naCenty: nie je číslo");
  return Math.round(stotiny / 100);
}

/* Z databázy (`numeric` ako text alebo číslo) do vnútornej jednotky. */
export function zEur(v) {
  if (v === null || v === undefined || v === "") return 0;
  return Math.round(Number(v) * JEDNOTKA);
}

/* Z centov na text pre obrazovku aj pre export. Tá istá funkcia na oboje —
   aby sa doklad a súčet pod ním nemohli rozísť. */
export function eur(centy) {
  const z = centy < 0 ? "−" : "";
  const a = Math.abs(centy);
  return `${z}${Math.floor(a / 100)},${String(a % 100).padStart(2, "0")} €`;
}

/* Percento z hodnoty, v tej istej jednotke. Percentá chodia ako 55 alebo
   43,5 — preto sa násobí a delí, nie posúva. */
const cast = (hodnota, pct) => Math.round((hodnota * pct) / 100);

/* ---------- nastavenia ---------- */

/* Predvolené hodnoty sú tie z konceptu 6.2. Appka ich číta z tabuľky
   `nastavenie` s platnosťou od dátumu; keď tam nič nie je, platia tieto —
   nie preto, aby sa nemuseli zadať, ale aby výpočet nikdy nespadol na tom,
   že niekto nedoplnil číslo, ktoré sa aj tak nemenilo. */
export const PREDVOLENE = {
  zamestnavatel_pct: 55,      // zákonné minimum
  stravnik_od_pct: 35,        // spodná hranica pásma
  stravnik_do_pct: 45,        // horná hranica pásma
  dph_stravnik_pct: 19,       // DPH k podielu stravníka
  stravne_5_12: 8.30,         // € — opatrenie MPSVR SR č. 211/2024 Z. z.
  strop_zapnuty: true
};

/* Ochrana, ktorá musí zabrať pri ukladaní nastavenia, nie až pri uzávierke:
   keby príspevok a horná hranica stravníka spolu presiahli 100 %, sociálny
   fond by vyšiel záporný a model by prestal dávať zmysel. */
export function nastavenieSedi(n) {
  if (n.stravnik_od_pct > n.stravnik_do_pct)
    return "Spodná hranica pásma stravníka je vyššia než horná.";
  if (n.zamestnavatel_pct + n.stravnik_do_pct > 100)
    return `Príspevok zamestnávateľa (${n.zamestnavatel_pct} %) a horná hranica ` +
           `stravníka (${n.stravnik_do_pct} %) dávajú spolu viac než 100 % — ` +
           "sociálny fond by vyšiel záporný.";
  return null;
}

/* ---------- rozúčtovanie jedného obeda ---------- */

/* Vracia sumy v stotinách centa. Zaokrúhľuje sa až mesačný súčet, takže tu
   sa nič nezaokrúhľuje na centy — len sa drží celočíselná jednotka.

   `cena`     cena bez DPH
   `zaklad`   cenová hladina základného poskytovateľa (len pre model „eko")
   `model`    "std" alebo "eko"
   `narok`    má človek v ten deň nárok na príspevok? (koncept 6.2b a 6.4)
   `n`        nastavenia (percentá, stravné, strop)

   Výsledok:
   `zl`        príspevok zamestnávateľa — náklad firmy
   `fond`      doplatok zo sociálneho fondu — druhý náklad firmy
   `stravnik`  podiel stravníka bez DPH
   `dph`       DPH k podielu stravníka
   `plati`     čo reálne platí stravník = stravnik + dph
   `orezane`   o koľko strop orezal príspevok (0 = nezasiahol)  */
export function obed({ cena, zaklad = null, model = "eko", narok = true, n = PREDVOLENE }) {
  const nast = { ...PREDVOLENE, ...n };

  /* Bez nároku ide obed v plnej cene (6.4). Nie je to trest — príspevok je
     viazaný na odpracovanú zmenu, takže v deň, keď človek v práci nebol, nemá
     z čoho vzniknúť. Fond sa z toho istého dôvodu nepoužije. */
  if (!narok) {
    const dph = cast(cena, nast.dph_stravnik_pct);
    return { zl: 0, fond: 0, stravnik: cena, dph, plati: cena + dph, orezane: 0 };
  }

  /* Zákonné minimum, vždy. */
  let zl = cast(cena, nast.zamestnavatel_pct);

  /* Zákonný strop je 55 % zo stravného pri pracovnej ceste 5–12 h. Percento
     je na oboch stranách rovnaké, takže sa vykráti: strop zasiahne až vtedy,
     keď cena obeda bez DPH prekročí celé stravné. Pri dnešných cenách je to
     ďaleko — ale ceny rastú a stravné sa mení nezávisle od nich. */
  let orezane = 0;
  if (nast.strop_zapnuty) {
    const strop = cast(zEur(nast.stravne_5_12), nast.zamestnavatel_pct);
    if (zl > strop) { orezane = zl - strop; zl = strop; }
  }

  const dolna = cast(cena, nast.stravnik_od_pct);
  const horna = cast(cena, nast.stravnik_do_pct);

  let stravnik;
  if (model === "eko" && zaklad) {
    /* Ekonomický model (6.2). Firma dáva nominálnu sumu odvodenú od cenovej
       hladiny základného poskytovateľa — nie percento z toho, čo si kto
       vybral. Tým sa luxus neprepláca zo sociálneho fondu.

       Strop je „55 % zo základnej ceny + fond pri nej". Fond pri základnej
       cene je zvyšok po zamestnávateľovi a spodnej hranici stravníka, takže
       sa to celé zjednoduší: firma nesie všetko nad spodným podielom
       stravníka zo základnej ceny. */
    const nesieFirma = cast(zaklad, 100 - nast.stravnik_od_pct);
    stravnik = Math.min(Math.max(cena - nesieFirma, dolna), horna);
  } else {
    stravnik = dolna;
  }

  /* Fond je zvyšok, nikdy záporný. Poradie je podstatné: najprv sa doťahuje
     stravník, až potom sa siaha na fond. */
  const fond = Math.max(cena - zl - stravnik, 0);

  /* A stravník je zvyšok po ňom — v oboch smeroch, nie len keď chýba.
     Pri cene, kde 55 % aj 45 % padnú presne na pol jednotky (napr. 6,1750 €),
     sa obe zaokrúhlia nahor a súčet by cenu o stotinu centa prekročil. Firma
     by tak jedálni zaplatila menej, než od koho vybrala. Dorovnáva sa na
     stravníkovi, nie na príspevku: ten je zákonné minimum a pod 55 % klesnúť
     nesmie ani o stotinu. */
  stravnik = cena - zl - fond;

  /* DPH sa pripočítava len k podielu stravníka; sociálny fond sa počíta bez
     DPH z ceny bez DPH. */
  const dph = cast(stravnik, nast.dph_stravnik_pct);
  return { zl, fond, stravnik, dph, plati: stravnik + dph, orezane };
}

/* ---------- mesiac za jedného človeka ---------- */

/* Sčíta obedy v plnej presnosti a zaokrúhli až tu — raz, na konci.
   Podpoložky sa dopočítavajú ako zvyšok súčtu, aby sedeli na cent:
   čo firma zaplatí jedálni, musí byť presne to, čo sa rozdelí. */
export function mesiac(obedy) {
  const s = { zl: 0, fond: 0, stravnik: 0, dph: 0, cena: 0, orezane: 0 };
  for (const o of obedy) {
    s.zl += o.zl; s.fond += o.fond; s.stravnik += o.stravnik;
    s.dph += o.dph; s.orezane += o.orezane;
    s.cena += o.zl + o.fond + o.stravnik;
  }

  /* Najväčšia položka sa dopočíta ako zvyšok. Keby sa zaokrúhlili všetky tri
     zvlášť, ich súčet by sa od ceny líšil až o cent a nikto by nevedel, kde
     ten cent vznikol. */
  const cena = naCenty(s.cena);
  const stravnik = naCenty(s.stravnik);
  const fond = naCenty(s.fond);
  return {
    poctov: obedy.length,
    cena,
    zl: cena - stravnik - fond,       // zvyšok — súčet vždy sedí na cenu
    fond,
    stravnik,
    dph: naCenty(s.dph),
    plati: stravnik + naCenty(s.dph),
    orezane: naCenty(s.orezane)
  };
}
