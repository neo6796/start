# Otázky pre mzdové oddelenie

Pripravujeme aplikáciu na objednávanie obedov. Bude z nej chodiť **mesačný podklad na zrážky zo mzdy**, aby sa nemuselo nič prepisovať ručne.

Potrebujeme k tomu sedem odpovedí. Sú to nastavenia, nie natvrdo zapísané hodnoty — dajú sa kedykoľvek zmeniť, ale musíme vedieť, s čím začať.

---

### 1. Ako sa počíta príspevok zamestnávateľa?

- [ ] **percentom z ceny jedla** — akým? (Zákonník práce žiada minimálne 55 %)
- [ ] **pevnou sumou na obed** — akou?

### 2. Uplatňuje sa strop?

Zákon obmedzuje príspevok hornou hranicou naviazanou na stravné pri pracovnej ceste 5–12 hodín.

- [ ] áno, vo výške ……… €
- [ ] nie

### 3. Prispieva sa aj zo sociálneho fondu?

- [ ] áno, ……… € na obed
- [ ] nie

### 4. Ako sa zaokrúhľuje?

Pri percentuálnom výpočte vznikajú desatiny centa.

- [ ] na cent matematicky
- [ ] na cent nadol
- [ ] inak: ………

### 5. Čo s obedom, ktorý si zamestnanec neodhlásil a neprevzal?

Dodávateľ ho uvaril a vyfakturoval, takže ho niekto zaplatiť musí.

- [ ] účtovať zamestnancovi **v plnej cene bez príspevku** zamestnávateľa *(najbežnejšie)*
- [ ] účtovať štandardne, teda **s príspevkom**
- [ ] **neúčtovať**, znáša firma

### 6. Aký formát potrebuje mzdový softvér?

- názov programu: ………
- [ ] XLSX
- [ ] CSV — aký oddeľovač a kódovanie? ………
- [ ] iný: ………

Ak existuje vzorový súbor, ktorý sa dnes do mzdového programu načítava, **pošlite ho** — export nastavíme presne podľa neho.

Aké stĺpce musia byť v súbore a v akom poradí? Predbežne počítame s: osobné číslo · meno · stredisko · počet obedov · cena spolu · príspevok zamestnávateľa · sociálny fond · **zrážka zo mzdy**.

### 7. Dokedy v mesiaci musí byť podklad odovzdaný?

- [ ] do ……… dňa nasledujúceho mesiaca

Z toho vyplynie, kedy aplikácia mesiac uzavrie. Po uzávierke sa čísla zafixujú a prípadné opravy idú ako položka do ďalšieho mesiaca — aby sa už odovzdaný podklad spätne nemenil.

---

**Poznámka:** zákonné limity a hodnota stravného sa menia opatrením MPSVR aj niekoľkokrát ročne. Preto sú všetky hodnoty v aplikácii **nastavením s platnosťou od dátumu**, nie konštantou. Zmena sa spraví v administrácii a neprepíše už uzavreté mesiace.
