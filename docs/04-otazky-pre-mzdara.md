# Rozúčtovanie obedov — potvrdené nastavenia a dve otvorené otázky

Aplikácia na objednávanie obedov bude posielať **mesačný podklad na zrážky zo mzdy**, aby sa nemuselo nič prepisovať ručne.

Väčšina nastavení je **odsúhlasená 5. 8. 2026**. Tento dokument ich zapisuje, aby bolo o rok jasné, podľa čoho sa appka nastavovala — a na konci sú **dve veci, ktoré ešte treba doplniť**.

Všetko sú nastavenia **s platnosťou od dátumu**. Zmena sa spraví v administrácii a **neprepíše už uzavreté mesiace**.

---

# Časť A — potvrdené

## 1. Základné rozdelenie ✅

Jedáleň dá **cenu bez DPH** a svoju sadzbu. Z ceny **bez DPH** sa počíta:

| | |
|---|---|
| sadzba DPH dodávateľa | 19 % |
| **príspevok zamestnávateľa** | **55 %** *(zákonné minimum)* |
| **príspevok stravníka** | **35 %**, v ekonomickom modeli pásmo 35–45 % |
| sadzba DPH k príspevku stravníka | **19 %** |
| **sociálny fond** | **nenastavuje sa — dopočíta sa ako zvyšok**, bez DPH |

Sociálny fond zámerne nie je vstup. Zadáva sa, koľko dáva zamestnávateľ a koľko stravník; fond dorovná zvyšok. Súčet tak vždy sedí na cenu z faktúry a nemôže vzniknúť rozdiel.

## 2. Model rozúčtovania ✅ — ekonomický, predvolene pri každej jedálni

Zapína sa **pri každom poskytovateľovi zvlášť**, nie globálne. Predvolene je zapnutý.

Ekonomický model drží príspevok firmy na cenovej hladine **najlacnejšej jedálne**; rozdiel dopláca stravník v pásme 35–45 %. Zmyslom je, **aby sa drahšie jedlo nepreplácalo zo sociálneho fondu.**

Príklad pri základnej cene **5,00 €** *(firma dáva `2,75 + 0,50 = 3,25 €`)*:

| cena bez DPH | 55 % | z fondu | **firma spolu** | stravník | podiel | +DPH | **platí stravník** |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5,00 *(základ)* | 2,75 | 0,50 | **3,25** | 1,75 | 35,0 % | 0,33 | **2,08** |
| 5,50 | 3,02 | 0,22 | **3,25** | 2,25 | 40,9 % | 0,43 | **2,68** |
| **5,91** | 3,25 | 0,00 | **3,25** | 2,66 | 45,0 % | 0,51 | **3,16** |
| 7,00 | 3,85 | — | **3,85** | 3,15 | 45,0 % | 0,60 | **3,75** |

Nad cenou 5,91 € už samotné zákonné minimum prekročí nominálnu hladinu, fond sa nepoužije vôbec a delenie je presne 55 / 45.

> **Pri najlacnejšej jedálni je ekonomický model totožný so štandardným** (55 / 35 / 10). Preto je bezpečné mať ho zapnutý všade: kde nemá čo obmedzovať, neobmedzuje nič.

## 3. Zaokrúhľovanie ✅ — až mesačný súčet

Počíta sa **na obede v plnej presnosti** a zaokrúhľuje sa až **mesačný súčet za osobu**. Pri dvadsiatich obedoch by sa inak nazbieral rozdiel oproti tomu, čo firma zaplatila jedálni.

## 4. Neodhlásený obed ✅ — plná cena

Obed, ktorý si zamestnanec neodhlásil a neprevzal, sa účtuje **v plnej cene — bez príspevku zamestnávateľa a bez sociálneho fondu.**

Nie je to trestanie. Príspevok je viazaný na **odpracovanú zmenu**, takže v deň neprítomnosti nemá z čoho vzniknúť.

Aplikácia to sama neúčtuje. Pri uzávierke sa dá načítať dochádzka a tie dni sa **označia na rozhodnutie** — prítomnosť nie je to isté ako prevzatie a podľa indície sa strhávať zo mzdy nemá.

## 5. Živnostníci ✅ — schéma

| | Zamestnanec | Živnostník |
|---|---|---|
| Kto platí jedálni | **firma** | **on sám**, v plnej cene |
| Ako firma prispieva | príspevok + sociálny fond | **nepriamo** — o tú sumu si zvýši faktúru voči firme |
| Ako sa to vyrovná | zrážka zo mzdy | nič, zaplatil si sám |
| Je v mzdovom podklade | áno | **nie, vôbec** |

**Určujúce pravidlo: firmu má obed stáť rovnako, nech je stravník zamestnanec alebo živnostník.** Suma na faktúre sa preto dopočíta spätne od nákladu firmy, nie od ceny obeda — či je živnostník platiteľom DPH, nemá hýbať tým, koľko firma dáva.

*Typ vzťahu je vlastnosť osoby, nie firmy.* Ten istý brigádnik môže byť u nás v pracovnom pomere aj na živnosť; živnostník pritom patrí pod niektorú konkrétnu firmu.

## 6. Výstup a termín ✅

**Podklad odchádza do 5.–6. dňa** nasledujúceho mesiaca, **jeden súbor za každú firmu**, XLSX aj CSV. Živnostníci v ňom nie sú — pre nich je samostatný prehľad.

Stĺpce: osobné číslo · meno · firma · stredisko/tím · počet obedov · cena spolu · príspevok zamestnávateľa · sociálny fond · **zrážka zo mzdy**.

Keďže každá firma má vlastný mzdový softvér, export je **univerzálny a dokumentovaný**, nie šitý na jeden program. Ak niektorý súbor neprijme, doladí sa preň predvoľba.

> Mzdová uzávierka **nečaká na faktúru od jedálne.** Appka pozná presný počet porcií, lebo ho sama odoslala. Keď faktúra príde neskôr a niečo nesedí, rozdiel ide ako opravná položka do najbližšieho otvoreného mesiaca — už odovzdaný podklad sa spätne nemení.

---

# Časť B — čo ešte potrebujeme

Dve veci. Obe sú krátke.

## 7. Strop — jedno číslo a dátum

Zákon obmedzuje príspevok zamestnávateľa hornou hranicou naviazanou na **stravné pri pracovnej ceste 5–12 hodín**. Tá suma sa mení opatrením MPSVR aj niekoľkokrát ročne, takže ju appka drží ako nastavenie s platnosťou od dátumu.

Pri cenách obeda okolo 5–7 € vychádza 55 % na 2,75 až 3,85 €, čo je pravdepodobne pod hranicou — **strop teda zrejme vôbec nezasiahne.** Napriek tomu ho chceme mať zadaný: ceny rastú a hranica sa mení nezávisle od nich. Keď zasiahne, aplikácia to **napíše** — nikdy neoreže ticho.

- **suma:** ……… €
- **platí od:** ………

## 8. Živnostníci — DPH z tej odmeny

Suma, o ktorú si živnostník zvýši faktúru, sa počíta tak, aby firmu obed stál presne toľko ako u zamestnanca. Aby to appka vedela dopočítať, potrebuje vedieť jedno:

**Odpočíta si firma DPH z tejto položky, alebo je pre ňu nákladom?**

- [ ] **odpočíta** — ide o službu prijatú k podnikaniu *(predvolené)*
- [ ] **je nákladom** — appka sumu na faktúre poníži tak, aby aj s DPH vyšla na rovnaký náklad

A ešte: **ako sa tá položka na faktúre pomenuje?** ………

*(Aplikácia to slovo len vytlačí — ale malo by byť u všetkých rovnaké.)*

---

**Poznámka:** zákonné limity a hodnota stravného sa menia opatrením MPSVR aj niekoľkokrát ročne. Preto sú všetky hodnoty v aplikácii nastavením s platnosťou od dátumu. Zmena **neprepíše už uzavreté mesiace** — tie ostávajú presne v tej podobe, v akej boli odovzdané.
