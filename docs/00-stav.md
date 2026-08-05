# Stav projektu — Obedár

Stav k 5. 8. 2026. Toto je vstupná stránka; podrobnosti sú v očíslovaných dokumentoch.

---

## Hotové a overené

| | |
|---|---|
| **Koncept** | `01-koncept.md`, v0.9 — 26 rozhodnutí, 14 kapitol |
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

### Od mzdového oddelenia — `04-otazky-pre-mzdara.md`

Osem otázok. Bez nich sa nedá dokončiť mzdový podklad:

- [ ] model príspevku zamestnávateľa (percento alebo pevná suma) a jeho výška
- [ ] strop, sociálny fond, zaokrúhľovanie
- [ ] **čo s obedom, ktorý si nikto neodhlásil a neprevzal**
- [ ] kto platí prípadný príplatok za dovoz na vzdialenejšiu prevádzku
- [ ] formát pre mzdový softvér **+ vzorový súbor, ktorý sa dnes načítava**
- [ ] dokedy v mesiaci musí byť podklad odovzdaný

### Zoznam zamestnancov — `05-zoznam-zamestnancov.md`

- [ ] XLSX alebo CSV: osobné číslo · priezvisko · meno · tím · predák · zástupca · poskytovateľ · **prevádzka** · e-mail · telefón

### Od dodávateľov — `06-otazky-pre-dodavatela.md`

**Jeden vyplnený hárok za každého dodávateľa:**

- [ ] kontakty a e-mail na objednávky
- [ ] počet jedál, skladba, v ktoré dni varia, denná kapacita
- [ ] **v akej podobe chodí menu + vzorka** a v ktorý deň býva hotové
- [ ] termín na odhlásenie, či prijmú doobjednávku v deň obeda
- [ ] **kam vozia, o koľkej a od koľkých porcií** (miesta výdaja)
- [ ] ceny, fakturácia, kedy sa mení cenník
- [ ] do akého času vedia potvrdiť prijatie objednávky

---

## Čo má spraviť Erik

- [ ] **poslať odkaz na preview predákom** a pozbierať pripomienky
- [ ] určiť, **ktorí dodávatelia to reálne budú** a ako sa volajú
- [ ] určiť **zoznam prevádzok**, kam sa vozí
- [ ] overiť, že heslo k `obedy@ahafarma.sk` je **náhodne generované**, nie vymyslené — port je otvorený voči internetu a schránka dostáva pokusy o uhádnutie

---

## Čo mám spraviť ja

- [ ] **Etapa 2 — samotná aplikácia**
- [ ] pri nej dve veci, ktoré odhalil test pošty: generovať `Message-ID` a `Date`, predstavovať sa rozumným menom v `EHLO`
- [ ] *(voliteľne)* „Pridať na plochu" pre preview, aby sa otestovala PWA na telefónoch predákov

---

## Čo blokuje čo

**Stavať appku môžem hneď** — koncept aj preview sú hotové a odsúhlasené.

**Spustiť ju naostro nie**, kým nie sú:
1. čísla od mzdára *(inak sa nedá spraviť mzdový podklad)*
2. zoznam zamestnancov *(inak sa appka nemá čím naplniť)*
3. údaje aspoň od jedného dodávateľa *(inak nie je čo objednávať)*

Tie tri veci trvajú najdlhšie, lebo nezávisia od nás. **Oplatí sa ich rozposlať hneď**, aj keď sa appka ešte len píše.
