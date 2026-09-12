# Stav projektu — Obedár

Stav k 12. 9. 2026. Toto je vstupná stránka; podrobnosti sú v očíslovaných dokumentoch.

---

## Hotové a overené

| | |
|---|---|
| **Koncept** | `01-koncept.md`, v0.9 — 53 rozhodnutí, 15 kapitol |
| **Vstupné súbory** | `08-vstupne-subory.md` — hotové zadanie na prevod dochádzky, odovzdateľné tak ako je |
| **Model rozúčtovania** | **uzavretý 5. 8.** — ekonomický predvolene, vrátane stropu a schémy pre živnostníkov (`01-koncept.md` 6.2) |
| **Dodávatelia** | `09-dodavatelia.md` — GASTROGAL 6,30 € s dovozom, ABM 7,20 €, obaja objednávky ráno |
| **Preview** | klikací prototyp na `obedy.ahafarma.sk/preview/`. **Ďalej sa nerozvíja** — appka vie viac než on, ukazovať predákom sa má appka. Ostáva stáť ako záznam o tom, čo sa odsúhlasilo |
| **Aplikácia** | kroky 1 – 5 druhej etapy — prihlásenie a roly, číselníky, import menoslovu, menu a matica predáka, uzávierka týždňa s odoslaním objednávky, spätný zápis. Beží na **https://obedy.ahafarma.sk** (`11-etapa2-plan.md`) |
| **Server** | Hetzner, Debian 13, `46.225.236.143`, zabezpečený (root aj heslá zablokované) |
| **Docker + Caddy** | HTTPS automaticky od Let's Encrypt |
| **Odosielanie pošty** | firemný server `mail.pdvrable.sk:587`, meno `obedy` |
| **SPF · DKIM · DMARC** | všetky tri **PASS**, overené skutočnou správou z aplikačného servera |
| **DKIM kľúč** | **2048-bitový** od 7. 8., záznam správne rozdelený na viac reťazcov — overené výpočtom z DNS |
| **Prijímanie odpovedí** | tá istá schránka `obedy@ahafarma.sk` |

Nič z toho nie je „malo by fungovať" — všetko je vyskúšané celou cestou.

---

## Čaká sa na iných

### Od IT technika

- [ ] **prístup k schránke `obedy@ahafarma.sk` pre druhého človeka** (alebo presmerovanie na dve adresy) — odpovede dodávateľov musí niekto čítať aj počas dovolenky
- [ ] **prístup na NAS pre zálohy** — datované snímky, 30 denných + 12 mesačných, ~20 GB, NAS si ťahá zo servera *(`02-zadanie-pre-it.md`)*
- [ ] **odblokovať IP `46.225.236.143` a dať ju na bielu listinu** — pri teste odosielania ju ochrana proti hádaniu hesla zablokovala *(`02-zadanie-pre-it.md`)*

### ~~Od mzdového oddelenia a účtovníčky~~ — hotové

**Vybavené 5. 8., nič nechýba.** 55/35/zvyšok · DPH 19 % · ekonomický model predvolene pri každej jedálni · zaokrúhlenie až na mesačnom súčte · neodhlásený obed v plnej cene · podklad do 5.–6. dňa · univerzálny export za každú firmu · **stravné 8,30 € od 1. 9. 2024** → strop 4,57 € (nezasiahne) · položka na faktúre živnostníka = **stabilizačný príplatok**.

### Zoznam zamestnancov — hotový

**Menoslov je pripravený:** ľudia v tvare *osobné číslo · priezvisko · meno · vzťah · prevádzka*, rozdelení hlavičkami `--- FIRMA;PREVÁDZKA ---`. Do repozitára sa neukladá — sú to skutočné osobné údaje.

Firma sa píše **skratkou** (`PDV`, `CRO`, `AD1`, `HBE`), prevádzka tiež (`OFF`, `AGR`, `FAR`, `STA`); vzťah je `P` (pracovný pomer) alebo `Z` (živnostník). Tím a predák sa zadajú v appke — z menoslovu sa nedajú odvodiť. Prefixy z dochádzky (`1` Adiumentum, `2` PD, `3` živnostníci) sa na nič nepoužijú — `3` nie je firma, ale typ vzťahu.

> **Osobné čísla v pilote sú dočasné.** Čísla `1001`, `1002`, … v skúšobnej databáze si vymyslel Erik na skúšku — **nie sú to dochádzkové kódy** a nesmú sa za ne vydávať (kód z dochádzky je jediné, čím sa človek prihlasuje a čím sa páruje prevod dochádzky). Skúšobná databáza je jednorazová: pri ostrom spustení sa zakladá **načisto**, so skutočnými kódmi. Nič z pilotných údajov sa nepreberá.

### Od dodávateľov — jediná vec na kritickej ceste

**Časť už vieme z jedálnych lístkov** (`09-dodavatelia.md`): ceny, časy objednávok, počty jedál, značenie. Zvyšok je v hárku `06-otazky-pre-dodavatela.md`:

- [ ] **e-mail na objednávky** a telefón na rannú SMS
- [ ] **je polievka v cene?**
- [ ] **kam vozia, o koľkej a od koľkých porcií** (miesta výdaja)
- [ ] termín na odhlásenie a do akého času potvrdia prijatie objednávky
- [ ] ceny **bez DPH** a sadzba zvlášť, kedy sa mení cenník, dokedy po mesiaci býva faktúra
- [ ] **či fakturujú živnostníkom priamo**, alebo všetko nám a my to preúčtujeme
- [ ] chcú aj nezáväznú týždennú predpoveď?

---

## Čo má spraviť Erik

- [ ] **nasadiť appku na server** — `cd ~/obedar-app/deploy && ./deploy.sh`, potom založiť správcu (príkaz vypíše sám skript)
- [ ] **naplniť skúšobnú databázu** — v tomto poradí, inak import ľudí neprejde:
      1. `docker compose exec -T app node src/nastroj.js zaklad` — firmy so skratkami, prevádzky, obe jedálne
      2. v **Číselníkoch** skontrolovať názvy firiem *(kto `zaklad` spustil pred 12. 9., má tam ešte staré krátke názvy — premenovať, nie zakladať druhé)*
      3. **vložiť menoslov** na `/ludia` — appka firmu ani prevádzku sama nezaloží, neznámu skratku iba nahlási
      4. priradiť **tímy** a **jedálne** — bez jedálne si človek neobjedná a bez tímu ho nikto neuvidí v matici
- [ ] **vypýtať e-mail na objednávky** aspoň od jednej jedálne — jediná vec, ktorá blokuje pilot
- [ ] vybrať **tím na pilot** — 5–6 ľudí, jedna prevádzka, jeden dodávateľ *(kapitola 14 konceptu; nie nadšenca, ale svedomitého vlažného predáka)*
- [ ] **založiť účet u SMS brány** a hlavne dať registrovať odosielateľa `OBEDAR` — trvá to dni, netreba to nechať na posledný týždeň *(koncept 8, „Cez koho posielať SMS")*
- [ ] dať niekomu spraviť **prevod dochádzky** do dohodnutého tvaru — zadanie je hotové v `08-vstupne-subory.md`, dá sa odovzdať tak ako je
- [ ] overiť, že heslo k `obedy@ahafarma.sk` je **náhodne generované**, nie vymyslené — port je otvorený voči internetu a schránka dostáva pokusy o uhádnutie

---

## Čo mám spraviť ja

- [x] ~~Etapa 2, krok 1 — kostra: prihlásenie, roly, migrácie, `/zdravie`~~
- [x] ~~Etapa 2, krok 2 — číselníky a ľudia vrátane importu menoslovu~~
- [x] ~~Etapa 2, krok 3 — menu a matica predáka~~ (jadro appky)
- [x] ~~Etapa 2, krok 4 — uzávierka týždňa a odoslanie objednávky~~
- [x] ~~Etapa 2, krok 5 — spätný zápis (dopísanie augusta)~~
- [ ] **Etapa 2, krok 6 — mesačná uzávierka a mzdový podklad** — rozúčtovanie, nastavenia s platnosťou od dátumu, mesačný podklad a porovnanie s papierom sú hotové; ostáva **export pre mzdy**, súhrny za prevádzku a dodávateľa a **dva zámky mesiaca** (mzdy, faktúry)
- [ ] krok 7: zálohy a upozornenia
- [ ] pri nej dve veci, ktoré odhalil test pošty: generovať `Message-ID` a `Date`, predstavovať sa rozumným menom v `EHLO`
- [ ] **prístup zo second PC** — vyrobiť kľúč na Windows a pridať ho z Macu (`03-nastavenie-webglobe.md`, krok 5b)
- [ ] **`test.obedy.ahafarma.sk`** — jeden `A` záznam + `TEST_DOMENA` v `.env`; potom je testovacia kópia dostupná z prehliadača odkiaľkoľvek a SSH na ňu netreba
- [ ] *(voliteľne)* „Pridať na plochu" pre preview, aby sa otestovala PWA na telefónoch predákov

---

## Čo blokuje čo

**Stavať appku môžem hneď** — koncept aj preview sú hotové a odsúhlasené.

**Spustiť pilot** blokuje presne jedna vec: **e-mailová adresa aspoň jednej jedálne na objednávky.** Nič iné.

Ostatné údaje od dodávateľov sú **nastavenia** — menia sa v administrácii s platnosťou od dátumu a uzavreté mesiace neprepíšu. Nemusia byť správne hneď, len nesmú byť prázdne:

| Údaj | Prečo nezdrží pilot |
|---|---|
| **miesta výdaja a minimá** | pilot je jeden tím na jednej prevádzke — appka sa na miesto nepýta nikde |
| **termín na odhlásenie** | nastaví sa **prísnejšie, než treba** (7:30) a keď povedia inak, posunie sa. Chyba tým smerom nikoho nepoškodí; opačná by niekomu vyrobila plnú cenu za obed, ktorý si myslel, že zrušil |
| **potvrdenie prijatia** | predvolená hodina stačí |
| **fakturácia živnostníkom** | v pilote sa nemusí týkať nikoho |
| **cenník, termín faktúry** | doplní sa pred prvou uzávierkou, teda o mesiac |

Zoznam ľudí je hotový, rozúčtovanie uzavreté vrátane stropu aj schémy pre živnostníkov, ceny oboch jedální známe. Zo mzdového oddelenia už nechýba nič.

**Hárok pre dodávateľov sa preto oplatí rozposlať hneď**, aj keď sa appka ešte len píše. Je jediná vec na kritickej ceste.
