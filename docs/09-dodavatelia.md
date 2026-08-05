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
| **E-mail** | majú, len nie je na menu | `gastroabm@gastroabm.sk` |
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

Z toho vyšlo rozdelenie na **dve správy s dvoma významami** (koncept 4.1a):

| | Kedy | Záväzná |
|---|---|---|
| **Týždenná predpoveď** — *„očakávame približne toto"* | piatok po uzávierke | **nie** |
| **Denná objednávka** — *„toto platí na dnes"* | ráno, pred ich hranicou | **áno** |

Pôvodne mala v piatok ísť objednávka a ráno k nej **korekcia** — *„pôvodne 47, storná 3, doobjednávky 2 → 46"*. Korekcia ale znamená, že prvé číslo bolo nesprávne. Pri tomto rozdelení nie je nesprávne nič: predpoveď sa nemýli, lebo nič nesľubuje, a záväzné číslo je vždy len jedno a konečné. **Fakturačná kontrola porovnáva len tie záväzné.**

**Týždenná uzávierka pre stravníka ostáva** (piatok 12:00). Ranné okno nie je jeho právo, ale nástroj predáka — na choroby, návraty a neohlásené príchody. Keby si mohol každý rozhodovať ráno, predákova práca by sa zmenila z jednej týždennej dávky na každodenné naháňanie.

Denný deadline v appke bude **8:00** — polhodina rezervy pred ich 8:30 na odoslanie, prípadné zlyhanie a na to, aby sa dalo zavolať.

### E-mail majú obaja — ale ráno je lepšia SMS

GASTROGAL ho nemá na menu, ale má ho. Odosielanie objednávok teda ide tak, ako koncept počítal.

Napriek tomu pribúda **SMS ako druhý kanál pre rannú objednávku** (rozhodnutie 20). Dôvod je prevádzkový, nie technický: **o 7:30 je kuchár pri sporáku, nie pri počítači.** Mail si otvorí neskôr, SMS mu pípne hneď — a je to presne tá správa, ktorú si podľa oboch menu aj tak nechávajú volať telefónom.

SMS nesie len hlavičku:

```
OBEDY 6.8.: A 12, B 8, C 4, spolu 24. Vrable 18, Mlynany 6.
```

**Detail, rozpis po miestach a odkaz na potvrdenie ostávajú v e-maili** — SMS sa nedá potvrdiť ani doložiť. Náklad je rádovo 2 € mesačne.

---

## Čo ešte treba zistiť

Zvyšok hárku `06-otazky-pre-dodavatela.md` platí. Podstatné je:

- [ ] **je polievka v cene?** Obe menu ju uvádzajú zvlášť, ale cena je jedna — treba potvrdiť
- [ ] **kam sú ochotní voziť** a od koľkých porcií *(ABM sídli v Tesárskych Mlyňanoch, čo je jedna z prevádzok)*
- [ ] **do kedy sa dá odhlásiť** — pravdepodobne tá istá ranná hranica, ale treba to počuť
- [ ] **kedy sa mení cenník**
- [ ] **fakturujú živnostníkom priamo**, alebo všetko nám?
- [ ] **dokedy po mesiaci býva faktúra u nás**
- [ ] **potvrdia prijatie objednávky** a do akého času
- [ ] **chcú aj rannú SMS s počtami?** Na aké číslo, a chcú aj nezáväznú týždennú predpoveď?

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
