# Dodávatelia — čo už vieme

Zapísané z **jedálnych lístkov na týždeň 3.–7. 8. 2026**, ktoré prišli od oboch jedální. Nahrádza časť hárku `06-otazky-pre-dodavatela.md` — to, čo z menu vyčítať ide, sa už pýtať netreba.

---

## Prehľad

| | **GASTROGAL** | **GASTRO ABM** |
|---|---|---|
| **Cena** | **6,30 €** s DPH, **vrátane dovozu** | **7,20 €** s DPH |
| cena bez DPH *(pri 19 %)* | 5,29 € | 6,05 € |
| **Objednávky** | telefonicky **7:00–9:00** | telefonicky **denne do 8:30** |
| Telefón | 0918 119 328 · 0911 328 119 | 0907 650 755 · 037/633 42 32 |
| **E-mail** | **na menu nie je** ⚠️ | `gastroabm@gastroabm.sk` |
| Počet jedál | **5** + polievka | **5** + polievka |
| **Značenie jedál** | **čísla `1`–`5`** | **písmená `A`–`E`** |
| Značenie alergénov | **čísla** `(1,3,7)` | **slová** `(múka, vajcia, mlieko)` |
| Menu chodí | PDF, na celý týždeň dopredu | PDF, na celý týždeň dopredu |
| Prevádzka | — | Hlavná 125, Tesárske Mlyňany |
| Kontaktná osoba | — | Alena Belenčíková |

Obe menu majú **polievku uvedenú zvlášť** a zjavne v cene, jedlá s gramážou a vyhradenú zmenu jedálneho lístka.

---

## Čo tým je vyriešené

**Značenie jedál je naozaj per poskytovateľ.** Jedna jedáleň čísluje `1`–`5`, druhá `A`–`E`. Nastavenie štýlu značenia (3.1) nebolo teoretizovanie — bez neho by sa jedno z tých dvoch menu do appky zadávalo nesprávne. To isté platí pre alergény: čísla verzus slová.

**Menu sa nebude prepisovať, bude sa prikladať.** Obe chodia ako úhľadné PDF na celý týždeň. Prepisovať 5 jedál × 5 dní × 2 dodávatelia je 50 položiek týždenne — a pri prepisovaní by sa navyše stratili **alergény a gramáže**, ktoré na tých PDF sú a majú tam byť zo zákona. Predvolený režim je teda *priložiť PDF* (3.3, rozhodnutie 18) a do appky ísť len s označením `1`–`5` / `A`–`E`.

**Príplatok za dovoz sa naozaj nerieši** — GASTROGAL má dovoz priamo v cene. Potvrdzuje rozhodnutie 35.

**Menu je známe dopredu na celý týždeň**, takže objednávacie okno Po–Pia ostáva v plnom rozsahu (rozhodnutie 14).

---

## Čo tým je vyriešené inak, než sa čakalo

### Obe jedálne berú objednávky ráno v deň obeda

Nie deň vopred, nie týždeň vopred — **ráno do 9:00, respektíve do 8:30.**

To je oveľa voľnejšie, než s čím koncept počítal, a mení váhu dvoch vecí:

| | Bolo v koncepte | Ako to bude v skutočnosti |
|---|---|---|
| **Týždenná objednávka** | hlavný výstup, odchádza v piatok | **náš vnútorný plán** — dodávateľ ho takto nepotrebuje |
| **Denný súhrn** | doplnok | **hlavný výstup**, odchádza ráno pred 8:30 |

Nič sa nezahadzuje, len sa prehodí dôraz. Týždenná uzávierka má naďalej zmysel — bez nej by nebolo z čoho tlačiť zberné hárky a nikto by dopredu nevedel, koľko sa varí. Ale **záväzné číslo je to ranné.**

Praktický dôsledok, ktorý sa ráta: **doobjednanie v deň obeda (4.3) nie je výnimka, ale bežný režim.** U oboch dodávateľov sa dá. Denný deadline v appke bude teda 8:00, nie 11:00 — s rezervou pred tým ich 8:30.

### ⚠️ GASTROGAL nemá na menu e-mail

Celý mechanizmus odosielania objednávok stojí na e-maile a na potvrdení prijatia. **Ak GASTROGAL berie objednávky len telefonicky, u nich to nefunguje.**

Nie je to zlé, ale musí sa to vedieť dopredu, lebo sú len dve možnosti:
1. **majú e-mail, len nie je na menu** → všetko ide ako v koncepte,
2. **naozaj len telefón** → appka pre nich vygeneruje **denný súhrn na obrazovku a na tlač**, človek ho nadiktuje a v appke odklikne *„nahlásené telefonicky o 7:42"*. Potvrdenie prijatia potom nahradí ten záznam.

Druhá možnosť je funkčná, len sa nesmie zistiť až pri spustení. **Je to prvá otázka na nich.**

---

## Čo ešte treba zistiť

Zvyšok hárku `06-otazky-pre-dodavatela.md` platí. Podstatné je:

- [ ] **GASTROGAL: e-mail na objednávky** — existuje? *(najdôležitejšie)*
- [ ] **je polievka v cene?** Obe menu ju uvádzajú zvlášť, ale cena je jedna — treba potvrdiť
- [ ] **kam sú ochotní voziť** a od koľkých porcií *(ABM sídli v Tesárskych Mlyňanoch, čo je jedna z prevádzok)*
- [ ] **do kedy sa dá odhlásiť** — pravdepodobne tá istá ranná hranica, ale treba to počuť
- [ ] **kedy sa mení cenník**
- [ ] **fakturujú živnostníkom priamo**, alebo všetko nám?
- [ ] **dokedy po mesiaci býva faktúra u nás**
- [ ] **potvrdia prijatie objednávky** a do akého času

---

## Ako to vyjde na peniazoch

Pri **ekonomickom modeli** so základnou hladinou od lacnejšej jedálne (GASTROGAL, 5,29 € bez DPH):

```
strop = 65 % z 5,29 € = 3,44 €      ← toľko firma dáva na každý obed
```

| | cena bez DPH | 55 % | z fondu | **firma spolu** | stravník | podiel | **platí stravník** |
|---|---:|---:|---:|---:|---:|---:|---:|
| **GASTROGAL** | 5,29 | 2,91 | 0,53 | **3,44** | 1,85 | 35,0 % | **2,21 €** |
| **GASTRO ABM** | 6,05 | 3,33 | 0,11 | **3,44** | 2,61 | 43,1 % | **3,11 €** |

**Firmu stojí obed rovnako v oboch jedálňach — 3,44 € bez DPH.** Rozdiel v cene nesie ten, kto si drahšie jedlo vybral. Presne to bolo zámerom.

Pre porovnanie, keby bol pri ABM zapnutý **štandardný** model: firma by dala 3,93 € a stravník by platil 2,52 €. Ekonomický model teda firme ušetrí **0,49 € na každom obede z ABM** a stravníka stojí o **0,59 €** viac.

> Čísla platia pri DPH 19 % a pásme stravníka 35–45 %. Podiel 43,1 % sa do pásma ešte zmestil, ale nie s veľkou rezervou: **pri cene nad 6,26 € bez DPH (7,45 € s DPH)** narazí stravník na horných 45 % a od tej hranice už príspevok firmy rastie nad strop — fond sa nepoužije vôbec a delenie je presne 55 / 45. **ABM je od tej hranice 25 centov.** Pri najbližšom zdražení sa to oplatí prepočítať.
