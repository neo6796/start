# Vstupné súbory pre Obedár

Tento dokument je **zadanie pre toho, kto pripraví prevod** z dochádzkového systému. Je napísaný tak, aby stačil sám o sebe — netreba k nemu poznať appku.

Aplikácia zámerne **nečíta natívny export dochádzkomera**. Číta dva jednoduché súbory v pevne dohodnutom tvare. Prevod z čohokoľvek do nich je samostatná úloha mimo appky; keď sa dochádzkový systém o tri roky vymení, prepíše sa prevodník a appka ostane nedotknutá.

---

## Spoločné pravidlá pre oba súbory

| | |
|---|---|
| Formát | CSV — obyčajný text |
| Kódovanie | **UTF-8** *(diakritika musí prežiť: Ď, Ĺ, Ô, Ž)* |
| Oddeľovač | **bodkočiarka** `;` |
| Prvý riadok | **hlavička** s presne uvedenými názvami stĺpcov, malými písmenami, bez diakritiky |
| Koniec riadka | LF aj CRLF |
| Poradie riadkov | ľubovoľné |

**Osobné číslo je štvormiestny kód** z dochádzky (`PersonalAccessCode`) — nie poradové číslo v rámci firmy. To sa medzi firmami opakuje a spájanie cez neho by dvom rôznym ľuďom zlúčilo obedy aj zrážky.

> ⚠️ **Najčastejšia chyba: Excel zožerie vedúcu nulu.** Kód `0042` sa pri uložení do CSV zmení na `42` a prestane sedieť. Stĺpec musí byť **textový**, nie číselný. Overiť sa to dá otvorením CSV v poznámkovom bloku — nie v Exceli, ten to zobrazí „správne" aj keď správne nie je.

---

## Súbor 1 — menoslov

Zoznam ľudí. Nahráva sa raz na začiatku a potom podľa potreby, keď pribudnú noví.

```
osobne_cislo;priezvisko;meno
1042;Kováč;Peter
1043;Novák;Mária
2008;Horváth;Ján
```

| Stĺpec | Obsah | Povinný |
|---|---|---|
| `osobne_cislo` | štvormiestny kód, ako text | áno |
| `priezvisko` | | áno |
| `meno` | | áno |

**Nič viac.** Firma, tím, predák, prevádzka ani poskytovateľ do súboru nepatria — nastavujú sa v aplikácii výberom zo zoznamu. Keby chodili textom, *Vráble · Vrable · závod Vráble* by vyrobili tri rôzne prevádzky a rozbité súčty by sa ukázali až o dva mesiace pri uzávierke.

> **Prvý menoslov je pripravený** — 33 ľudí, prefixy `1` (7), `2` (2), `3` (24). Súbor sa v tomto repozitári **neuchováva**: sú v ňom mená a osobné čísla skutočných ľudí a tie patria do databázy aplikácie, nie do správy verzií. Dokumentácia opisuje, ako sa s údajmi zaobchádza; samotné údaje v nej nemajú čo hľadať.

### Rozdelenie mena

V dochádzke býva meno **v jednom poli** ako `Kováč Peter`. Rozdelenie je na prevodníku a má jednu pascu: *Kováč Peter Pavol* aj *Kováč Novák Peter* vyzerajú rovnako, ale nie sú.

Pravidlo: **keď to nie je jednoznačné, nehádať.** Celý reťazec sa dá do `priezvisko` a `meno` sa nechá prázdne. Človek to v appke opraví za pár sekúnd; zle rozdelené meno si nikto nevšimne a ostane tam roky.

### Kontroly, ktoré appka spraví

| Nález | Čo urobí |
|---|---|
| kód, ktorý ešte nepozná | **návrh** na pridanie — čaká na potvrdenie |
| iné priezvisko pri známom kóde | návrh na prepísanie mena, história ostáva na kóde |
| kód v súbore chýba, v appke je | **nikdy neruší** — ponúkne ukončenie platnosti |
| ten istý kód dvakrát v súbore | **chyba**, súbor sa neprijme |
| kód, ktorý nemá štyri číslice | **chyba** — pravdepodobne odrezaná vedúca nula |

---

## Súbor 2 — prítomnosť na pracovisku

Kto bol v ktorý deň v práci. Nahráva sa **pri mesačnej uzávierke** a slúži na dve veci: triedenie a hľadanie obedov v dňoch, keď človek v práci nebol.

```
osobne_cislo;datum;hodiny
1042;2026-08-03;8.5
1042;2026-08-04;0
1042;2026-08-05;7,75
1043;2026-08-03;8
```

| Stĺpec | Obsah | Povinný |
|---|---|---|
| `osobne_cislo` | štvormiestny kód, ako text | áno |
| `datum` | **`RRRR-MM-DD`**, teda `2026-08-03` | áno |
| `hodiny` | odpracované hodiny; `0` = v práci nebol | áno |
| `poznamka` | voľný text, napr. *služobná cesta* | nie |

**Jeden riadok = jeden človek a jeden deň.**

### Na čom to najčastejšie stroskotá

**Dátum musí byť `RRRR-MM-DD`.** Nie `3.8.2026`, nie `08/03/2026`. Slovenský Excel píše `3.8.2026` a americký to prečíta ako 8. marca. ISO tvar sa nedá pochopiť dvomi spôsobmi a navyše sa správne triedi.

**Desatinná bodka aj čiarka sú v poriadku** — `8.5` aj `8,5`. Oddeľovač je bodkočiarka, takže sa to nebije.

**Dni bez práce tam musia byť, s hodnotou `0`.** Toto je najdôležitejšie pravidlo celého súboru. Appka **chýbajúci riadok nepovažuje za neprítomnosť**, ale za *neznámy údaj* — a neznámy deň nechá bez príznaku.

Je to zámerné: keby chýbajúci riadok znamenal „nebol v práci", stačila by medzera v súbore na to, aby niekomu prišla plná cena za obed, na ktorý mal nárok. **Radšej nezistiť nič, než zistiť nesprávne.**

Dôsledok pre prevodník: ak vynechá nuly, funkcia bude tichá — neohlási nič, lebo nič nevie. Appka po nahratí vypíše, koľko dní ostalo bez údaja, takže sa to dá zbadať.

### Ostatné pravidlá

| Situácia | Správanie |
|---|---|
| víkendy a sviatky v súbore | prijmú sa a **ignorujú** — appka má vlastný kalendár pracovných dní |
| ten istý človek a deň dvakrát | **chyba**, súbor sa neprijme *(nie „platí posledný")* |
| neznáme osobné číslo | vypíše sa, riadok sa preskočí — **prítomnosť nikdy nezakladá ľudí** |
| obdobie súboru | odvodí sa z najmenšieho a najväčšieho dátumu; musí padnúť do spracovávaného mesiaca |
| záporné hodiny | chyba |

### Čo appka urobí po nahratí

Najprv ukáže, **čo sa stane** — a až pod tým je tlačidlo:

```
doplní sa                              184 dní
prepíše sa (z predchádzajúceho importu)  12 dní
v rozpore s ručným zadaním                3 dni  → nechám tak
bez údaja (chýbajúci riadok)             27 dní
neznáme osobné číslo                      2 riadky
```

**Ručne opravený deň sa importom neprepíše.** Kto zistil, že Kováč bol na školení a kartu nepípol, nemá o to prísť tým, že sa súbor nahrá druhýkrát. Rozdiel sa vypíše a dá sa prevziať — ale vedome, po jednom alebo naraz.

---

## Ako si to overiť pred odovzdaním

1. Otvoriť CSV v **poznámkovom bloku**, nie v Exceli. Vedúce nuly musia byť vidieť.
2. Diakritika musí byť čitateľná. Ak sú tam `Ä?`, `KovÃ¡Ä`, kódovanie nie je UTF-8.
3. Dátumy musia začínať rokom.
4. Spočítať riadky: *počet ľudí × počet dní obdobia*. Ak je ich výrazne menej, chýbajú nuly.
5. Skontrolovať, či sa žiadna dvojica *osobné číslo + dátum* neopakuje.
