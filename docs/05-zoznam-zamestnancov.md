# Zoznam zamestnancov — čo potrebujeme

Podklad na naplnenie aplikácie na objednávanie obedov. Stačí **jedna tabuľka v Exceli**, jeden riadok na človeka.

---

## Stĺpce

| Stĺpec | Povinný | Poznámka |
|---|---|---|
| **Osobné číslo** | ✅ | jednoznačné, slúži aj ako prihlasovacie meno |
| **Priezvisko** | ✅ | |
| **Meno** | ✅ | |
| **Tím / stredisko** | ✅ | názov, pod ktorý človek patrí |
| **Predák** | ✅ | osobné číslo vedúceho daného tímu |
| **Zástupca predáka** | | osobné číslo, ak je určený |
| **Poskytovateľ stravy** | | ak sa už vie, kto komu varí |
| **E-mail** | | len ak ho človek má; väčšina ho mať nebude a je to v poriadku |
| **Telefón** | | hlavne pri predákoch — do zásoby pre SMS |
| **Stravuje sa** | | áno/nie, ak sa niekto stravovať nebude vôbec |

---

## Príklad

| Osobné číslo | Priezvisko | Meno | Tím | Predák | Zástupca | Poskytovateľ | E-mail | Telefón |
|---|---|---|---|---|---|---|---|---|
| 4009 | Kováč | Jozef | Údržba | 4009 | 4038 | U Jeleňa | j.kovac@… | 0903… |
| 4021 | Horváth | Peter | Údržba | 4009 | 4038 | U Jeleňa | | |
| 4038 | Baláž | Marián | Údržba | 4009 | 4038 | U Jeleňa | | 0905… |
| 4204 | Sedláková | Jana | Lisovňa | 4217 | | Sever | | |

Predák má vo svojom riadku **sám seba** v stĺpci *Predák* — je to členom svojho tímu a zároveň jeho vedúcim.

---

## Na čo si dať pozor

**Osobné číslo musí byť jednoznačné.** Bude to prihlasovacie meno a zároveň spojka na mzdový podklad. Ak sa niekde opakuje, treba to vyriešiť pred nahratím.

**Každý človek patrí práve do jedného tímu.** Kto nikam nepatrí, skončí v skupine „Bez zaradenia" a uvidí ho len správca.

**Predákov a zástupcov uvádzajte osobným číslom, nie menom.** Mená sa píšu rôzne a pri stovke ľudí sa v nich ľahko spraví nesúlad.

**E-mail nie je potrebný.** Aplikácia je navrhnutá tak, že väčšina stravníkov ho mať nebude — objednávky za nich zadáva predák a informácie sú na nástenke. Vyplňte ho tam, kde je.

**Telefón hlavne pri predákoch.** Zbierame ho do zásoby, aby sa neskôr dali zapnúť SMS bez toho, aby sa čísla zháňali dodatočne.

---

## Formát

XLSX alebo CSV, prvý riadok názvy stĺpcov. Poradie stĺpcov nie je dôležité, názvy áno. Diakritika v menách je v poriadku.
