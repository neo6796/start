# Stav projektu — Obedár

Stav k 5. 8. 2026. Toto je vstupná stránka; podrobnosti sú v očíslovaných dokumentoch.

---

## Hotové a overené

| | |
|---|---|
| **Koncept** | `01-koncept.md`, v0.9 — 50 rozhodnutí, 15 kapitol |
| **Vstupné súbory** | `08-vstupne-subory.md` — hotové zadanie na prevod dochádzky, odovzdateľné tak ako je |
| **Model rozúčtovania** | **odsúhlasený 5. 8.** — ekonomický predvolene pri každej jedálni, overený výpočtom (`01-koncept.md` 6.2) |
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

### Od mzdového oddelenia a účtovníčky — `04-otazky-pre-mzdara.md`

**Väčšina potvrdená 5. 8.** — 55/35/zvyšok, DPH 19 %, ekonomický model predvolene pri každej jedálni, zaokrúhlenie až na mesačnom súčte, neodhlásený obed v plnej cene, podklad do 5.–6. dňa, univerzálny export za každú firmu.

Zostali **dve veci**:

- [ ] **strop** naviazaný na stravné 5–12 h — jedna suma a dátum, odkedy platí
- [ ] **DPH z odmeny pre živnostníkov** — odpočíta si ju firma, alebo je nákladom? Plus ako sa tá položka na faktúre volá

### Zoznam zamestnancov — hotový

**Menoslov je pripravený:** 33 ľudí v tvare *osobné číslo · priezvisko · meno*, overený proti špecifikácii. Do repozitára sa neukladá — sú to skutočné osobné údaje.

Firma, typ vzťahu, tím, predák a prevádzka sa **zadajú v appke** z rozbaľovacích zoznamov, nie v Exceli. Prefixy z dochádzky (`1` Adiumentum, `2` PD, `3` živnostníci) sa na nič nepoužijú — `3` nie je firma, ale typ vzťahu.

### Od dodávateľov — `06-otazky-pre-dodavatela.md`

**Jeden vyplnený hárok za každého dodávateľa:**

- [ ] kontakty a e-mail na objednávky
- [ ] počet jedál, skladba, v ktoré dni varia, denná kapacita
- [ ] **v akej podobe chodí menu + vzorka** a v ktorý deň býva hotové
- [ ] termín na odhlásenie, či prijmú doobjednávku v deň obeda
- [ ] **kam vozia, o koľkej a od koľkých porcií** (miesta výdaja)
- [ ] ceny **bez DPH** a sadzba zvlášť, fakturácia, kedy sa mení cenník
- [ ] **či fakturujú živnostníkom priamo**, alebo všetko nám a my to preúčtujeme *(nastavenie, zvládneme oboje — len to musíme vedieť)*
- [ ] do akého času vedia potvrdiť prijatie objednávky

---

## Čo má spraviť Erik

- [ ] **poslať odkaz na preview predákom** a pozbierať pripomienky
- [ ] vybrať **tím na pilot** — 5–6 ľudí, jedna prevádzka, jeden dodávateľ *(kapitola 14 konceptu; nie nadšenca, ale svedomitého vlažného predáka)*
- [ ] určiť, **ktorí dodávatelia to reálne budú** a ako sa volajú
- [ ] určiť **zoznam prevádzok**, kam sa vozí
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

Zoznam ľudí je hotový a rozúčtovanie odsúhlasené. Zo mzdového oddelenia chýbajú dve čísla, ktoré sa dopĺňajú v nastaveniach kedykoľvek — appku nezdržia.

**Hárok pre dodávateľov sa preto oplatí rozposlať hneď**, aj keď sa appka ešte len píše. Je jediná vec na kritickej ceste.
