# Otázky pre mzdové oddelenie a účtovníčku

Pripravujeme aplikáciu na objednávanie obedov. Bude z nej chodiť **mesačný podklad na zrážky zo mzdy**, aby sa nemuselo nič prepisovať ručne.

Dokument má dve časti. **Prvá popisuje, ako to appka počíta dnes** — prosíme len potvrdiť alebo opraviť, nemusíte to vymýšľať. **Druhá sú veci, ktoré zatiaľ rozhodnuté nie sú** a bez odpovede sa podklad dokončiť nedá.

Všetko sú **nastavenia s platnosťou od dátumu**, nie natvrdo zapísané hodnoty. Dajú sa kedykoľvek zmeniť a zmena neprepíše už uzavreté mesiace.

---

# A. Takto to počítame — prosíme potvrdiť

### 1. Základné rozdelenie

Jedáleň nám dá **cenu bez DPH** a svoju sadzbu. Z **ceny bez DPH** sa potom počíta:

| | Predvolené |
|---|---|
| sadzba DPH dodávateľa | 19 % |
| **príspevok zamestnávateľa** | **55 %** *(zákonné minimum)* |
| **príspevok stravníka** | **35 %** |
| sadzba DPH k príspevku stravníka | **19 %** |
| doplatok zo **sociálneho fondu** | **nenastavuje sa — dopočíta sa ako zvyšok** |

Sociálny fond zámerne nie je vstup. Zadáva sa, koľko dáva zamestnávateľ a koľko stravník, a fond dorovná to, čo ostane — takže súčet vždy sedí na cenu z faktúry a nemôže vzniknúť rozdiel.

- [ ] súhlasí
- [ ] opraviť: ………

### 2. Ktorý z dvoch modelov zapneme?

Otázka vzniká len vtedy, ak budeme mať **viac jedální s rôznymi cenami**. Prepínač je jeden pre celú aplikáciu.

**Model A — štandardný.** Pevné percentá, fond je zvyšok:

```
zamestnávateľ 55 %   ·   stravník 35 %   ·   sociálny fond 10 %
```

Jednoduchý a predvídateľný. Má ale jednu vlastnosť: pri drahšom jedle rastie úmerne **aj to, čím prispieva sociálny fond**. Kto si vyberie drahší obed, dostane aj vyšší príspevok z fondu.

**Model B — ekonomický.** Vychádza z **cenovej hladiny základného poskytovateľa** a fond použije len do jej výšky. Zamestnávateľ dáva stále rovnakú nominálnu sumu, rozdiel dopláca stravník — jeho podiel sa pohybuje v pásme **35 až 45 %**.

Príklad pri základnej cene **5,00 €** *(t. j. `2,75 + 0,50 = 3,25 €` od firmy)*:

| cena bez DPH | 55 % | z fondu | **firma spolu** | stravník | podiel | +DPH | **platí stravník** |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5,00 *(základ)* | 2,75 | 0,50 | **3,25** | 1,75 | 35,0 % | 0,33 | **2,08** |
| 5,50 | 3,02 | 0,22 | **3,25** | 2,25 | 40,9 % | 0,43 | **2,68** |
| **5,91** | 3,25 | 0,00 | **3,25** | 2,66 | 45,0 % | 0,51 | **3,16** |
| 7,00 | 3,85 | — | **3,85** | 3,15 | 45,0 % | 0,60 | **3,75** |

Nad cenou 5,91 € už samotné zákonné minimum prekročí nominálnu hladinu, **fond sa nepoužije vôbec** a delenie je presne 55 / 45. Zmyslom je, aby sa drahšie jedlo nepreplácalo zo sociálneho fondu.

- [ ] **model A** — štandardný, 55 / 35 / zvyšok
- [ ] **model B** — ekonomický; základný poskytovateľ je ………, pásmo stravníka ……… až ……… %
- [ ] budeme mať aj tak len jednu jedáleň, takže je to jedno

### 3. Uplatňuje sa strop?

Zákon obmedzuje príspevok hornou hranicou naviazanou na stravné pri pracovnej ceste 5–12 hodín.

- [ ] áno, vo výške ……… €
- [ ] nie

### 4. Kde sa zaokrúhľuje?

DPH k príspevku stravníka vyrába štvrté desatinné miesto. Ak sa zaokrúhli na každom obede zvlášť, pri dvadsiatich obedoch sa nazbiera rozdiel oproti tomu, čo firma reálne zaplatila jedálni.

- [ ] počítať v plnej presnosti a zaokrúhliť až **mesačný súčet za osobu** *(odporúčame)*
- [ ] zaokrúhľovať **na každom obede** — matematicky / nadol *(nehodiace sa škrtnite)*
- [ ] inak: ………

---

# B. Toto rozhodnuté nie je

### 5. Čo s obedom, ktorý si zamestnanec neodhlásil a neprevzal?

Dodávateľ ho uvaril a vyfakturoval, takže ho niekto zaplatiť musí.

- [ ] účtovať zamestnancovi **v plnej cene bez príspevku** zamestnávateľa *(najbežnejšie)*
- [ ] účtovať štandardne, teda **s príspevkom**
- [ ] **neúčtovať**, znáša firma

### 6. Ak dodávateľ účtuje príplatok za dovoz na vzdialenejšiu prevádzku, kto ho platí?

Časť ľudí pracuje počas týždňa na viacerých prevádzkach a obed sa im vezie tam, kde v ten deň sú. Ak za to dodávateľ pýta príplatok, treba rozhodnúť:

- [ ] **zamestnávateľ** — zamestnanec je tam kvôli práci *(a je to len otázka nákladu, nie zrážky)*
- [ ] **zamestnanec** — pripočíta sa mu k cene obeda
- [ ] netýka sa nás, dodávateľ príplatok neúčtuje

Kým to nie je rozhodnuté, aplikácia počíta rovnakú cenu obeda na všetkých miestach.

### 7. Živnostníci

Obedy robíme aj pre ľudí, ktorí nie sú v pracovnom pomere. **Typ vzťahu je vlastnosť osoby, nie firmy** — ten istý brigádnik môže byť u nás v pracovnom pomere aj na živnosť, takže sa to nedá odvodiť od firmy.

Výpočet ceny je pre oboch rovnaký. Líši sa, čo z toho vyjde von: zamestnanec má **zrážku zo mzdy**, živnostník mzdu nemá, takže **dopláca**. Aplikácia pre nich pripraví samostatný výstup — kumulatív, koľko má kto doplatiť, a príspevok zamestnávateľa rozpísaný po firmách.

Poskytnutie zvýhodneného obedu živnostníkovi **nie je plnenie zo Zákonníka práce**, preto s ním počítame mimo bežného príspevku — zo špeciálneho fondu. Či je tá schéma správne postavená, posúdiť nevieme.

- **prispieva sa im vôbec?** …………
- **z čoho** — špeciálny fond, réžia, inak? …………
- **v akej výške** — rovnako ako zamestnancom, alebo inak? …………
- **ako sa to vyrovná** — preúčtovanie, faktúra, hotovosť, zrážka z odmeny? …………

### 8. Aký formát potrebuje mzdový softvér?

- názov programu: ………
- [ ] XLSX
- [ ] CSV — aký oddeľovač a kódovanie? ………
- [ ] iný: ………

Ak existuje vzorový súbor, ktorý sa dnes do mzdového programu načítava, **pošlite ho** — export nastavíme presne podľa neho.

Aké stĺpce musia byť v súbore a v akom poradí? Predbežne počítame s: osobné číslo · meno · firma · stredisko · počet obedov · cena spolu · príspevok zamestnávateľa · sociálny fond · **zrážka zo mzdy**.

> Podklad chodí **za každú firmu zvlášť**. Predák môže mať v tíme ľudí z viacerých spriaznených firiem — appka ich pri objednávaní nerozdeľuje, ale pri peniazoch áno.

### 9. Dokedy v mesiaci musí byť podklad odovzdaný?

- [ ] do ……… dňa nasledujúceho mesiaca

Z toho vyplynie, kedy aplikácia mesiac uzavrie. Po uzávierke sa čísla zafixujú a prípadné opravy idú ako položka do ďalšieho mesiaca — aby sa už odovzdaný podklad spätne nemenil.

---

**Poznámka:** zákonné limity a hodnota stravného sa menia opatrením MPSVR aj niekoľkokrát ročne. Preto sú všetky hodnoty v aplikácii nastavením s platnosťou od dátumu. Zmena sa spraví v administrácii a **neprepíše už uzavreté mesiace** — tie ostávajú presne v tej podobe, v akej boli odovzdané.
