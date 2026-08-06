# Stav projektu — Obedár

Stav k 5. 8. 2026. Toto je vstupná stránka; podrobnosti sú v očíslovaných dokumentoch.

---

## Hotové a overené

| | |
|---|---|
| **Koncept** | `01-koncept.md`, v0.9 — 50 rozhodnutí, 15 kapitol |
| **Vstupné súbory** | `08-vstupne-subory.md` — hotové zadanie na prevod dochádzky, odovzdateľné tak ako je |
| **Model rozúčtovania** | **uzavretý 5. 8.** — ekonomický predvolene, vrátane stropu a schémy pre živnostníkov (`01-koncept.md` 6.2) |
| **Dodávatelia** | `09-dodavatelia.md` — GASTROGAL 6,30 € s dovozom, ABM 7,20 €, obaja objednávky ráno |
| **Preview** | klikací prototyp, 11 obrazoviek, beží na **https://obedy.ahafarma.sk** |
| **Server** | Hetzner, Debian 13, `46.225.236.143`, zabezpečený (root aj heslá zablokované) |
| **Docker + Caddy** | HTTPS automaticky od Let's Encrypt |
| **Odosielanie pošty** | firemný server `mail.pdvrable.sk:587`, meno `obedy` |
| **SPF · DKIM · DMARC** | všetky tri **PASS**, overené skutočnou správou z aplikačného servera |
| **Prijímanie odpovedí** | tá istá schránka `obedy@ahafarma.sk` |

Nič z toho nie je „malo by fungovať" — všetko je vyskúšané celou cestou.

---

## Čaká sa na iných

### Od IT technika

- [ ] **prístup k schránke `obedy@ahafarma.sk` pre druhého človeka** (alebo presmerovanie na dve adresy) — odpovede dodávateľov musí niekto čítať aj počas dovolenky
- [ ] **prístup na NAS pre zálohy** — datované snímky, 30 denných + 12 mesačných, ~20 GB, NAS si ťahá zo servera *(`02-zadanie-pre-it.md`)*
- [ ] *(nie je urgentné)* vymeniť DKIM kľúč za 2048-bitový pri najbližšom zásahu do pošty

### ~~Od mzdového oddelenia a účtovníčky~~ — hotové

**Vybavené 5. 8., nič nechýba.** 55/35/zvyšok · DPH 19 % · ekonomický model predvolene pri každej jedálni · zaokrúhlenie až na mesačnom súčte · neodhlásený obed v plnej cene · podklad do 5.–6. dňa · univerzálny export za každú firmu · **stravné 8,30 € od 1. 9. 2024** → strop 4,57 € (nezasiahne) · položka na faktúre živnostníka = **stabilizačný príplatok**.

### Zoznam zamestnancov — hotový

**Menoslov je pripravený:** 33 ľudí v tvare *osobné číslo · priezvisko · meno*, overený proti špecifikácii. Do repozitára sa neukladá — sú to skutočné osobné údaje.

Firma, typ vzťahu, tím, predák a prevádzka sa **zadajú v appke** z rozbaľovacích zoznamov, nie v Exceli. Prefixy z dochádzky (`1` Adiumentum, `2` PD, `3` živnostníci) sa na nič nepoužijú — `3` nie je firma, ale typ vzťahu.

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

- [ ] **poslať odkaz na preview predákom** a pozbierať pripomienky
- [ ] vybrať **tím na pilot** — 5–6 ľudí, jedna prevádzka, jeden dodávateľ *(kapitola 14 konceptu; nie nadšenca, ale svedomitého vlažného predáka)*
- [ ] určiť **zoznam prevádzok**, kam sa vozí
- [ ] **založiť účet u SMS brány** a hlavne dať registrovať odosielateľa `OBEDAR` — trvá to dni, netreba to nechať na posledný týždeň *(koncept 8, „Cez koho posielať SMS")*
- [ ] dať niekomu spraviť **prevod dochádzky** do dohodnutého tvaru — zadanie je hotové v `08-vstupne-subory.md`, dá sa odovzdať tak ako je
- [ ] overiť, že heslo k `obedy@ahafarma.sk` je **náhodne generované**, nie vymyslené — port je otvorený voči internetu a schránka dostáva pokusy o uhádnutie

---

## Čo mám spraviť ja

- [ ] **Etapa 2 — samotná aplikácia**
- [ ] pri nej dve veci, ktoré odhalil test pošty: generovať `Message-ID` a `Date`, predstavovať sa rozumným menom v `EHLO`
- [ ] *(voliteľne)* „Pridať na plochu" pre preview, aby sa otestovala PWA na telefónoch predákov

---

## Čo blokuje čo

**Stavať appku môžem hneď** — koncept aj preview sú hotové a odsúhlasené.

**Spustiť ju naostro** už blokuje len jedno: **údaje aspoň od jedného dodávateľa.** Bez nich nie je čo objednávať.

Zoznam ľudí je hotový, rozúčtovanie uzavreté vrátane stropu aj schémy pre živnostníkov, ceny oboch jedální známe. Zo mzdového oddelenia už nechýba nič.

**Hárok pre dodávateľov sa preto oplatí rozposlať hneď**, aj keď sa appka ešte len píše. Je jediná vec na kritickej ceste.
