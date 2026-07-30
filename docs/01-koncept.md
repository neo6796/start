# Objednávanie obedov — koncept (v0.1)

Pracovný názov: **Obedár**
Rozsah: 50–100 stravníkov, 1–5 poskytovateľov stravy, interná firemná appka.
Stav: koncept. Nič sa nekóduje, kým nie je odsúhlasený tento dokument a následne klikací preview.

---

## 1. Roly a viditeľnosť

| Rola | Vidí | Môže |
|---|---|---|
| **Stravník** | seba | objednať/zmeniť do týždňového deadlinu, odhlásiť sa na deň do denného deadlinu, história a mesačný prehľad |
| **Predák** | seba + pridelených podriadených | to isté za seba; za podriadených podľa nastaveného oprávnenia (viď 1.1) |
| **Admin** | všetkých | plná konfigurácia, výnimky po deadline, exporty, audit |
| *(voliteľne)* **Výdaj / jedáleň** | denný zoznam | odškrtnutie prevzatia obeda |
| *(voliteľne)* **Dodávateľ** | len svoje súhrny | stiahnutie denného počtu porcií |

**Prideľovanie podriadených robí výhradne admin.**

### 1.1 Oprávnenie predáka — konfigurovateľné
Tri úrovne, admin nastavuje globálne aj individuálne per predák:
- `VIEW` — len vidí, kto nemá objednané (a upozorní ho)
- `ORDER` — môže objednávať a meniť za podriadeného (odporúčaný default)
- `ORDER+CANCEL` — plus odhlasovanie na deň (dovolenka, PN, služobka)

Každý zásah predáka je v audit logu ako „*Novák J. (predák) zmenil objednávku pre Kováč P.*" a podriadený o tom dostane notifikáciu. Bez tohto vznikajú spory.

### 1.2 Tím a zastupovanie
Tím = entita s prideleným predákom, nie priame pole `nadriadený` na osobe.
Dôvod: výmena predáka je jedna zmena, nie 15 zmien.
Tím má **hlavného predáka + voliteľného zástupcu** (dovolenka predáka je istota, nie výnimka).
Osoba patrí práve do jedného tímu. Osoba bez tímu = „Bez zaradenia", vidí ju len admin.

---

## 2. Prihlasovanie — posúdenie tvojho návrhu

**Tvoj návrh:** pole meno → drop-down pre admina a vedúcich → heslo/PIN.

**Neodporúčam**, z troch dôvodov:
1. **Bezpečnosť** — drop-down so zoznamom adminov a predákov zverejňuje na verejnej prihlasovacej stránke organizačnú štruktúru a rovno menuje privilegované účty. To je presne zoznam, ktorý útočník potrebuje.
2. **Zbytočný krok** — rola je vlastnosť účtu, nie voľba pri prihlásení. Systém po overení hesla sám vie, kto si.
3. **Chybovosť** — používatelia si vyberú zlú položku a hlásia „nedá sa prihlásiť".

Ak bol zámerom drop-downu „stravník si zvolí, pod koho patrí" — to je údaj, ktorý prideľuje admin (bod 1), nie voľba pri logine.

### 2.1 Odporúčané riešenie
Jedna obrazovka, dve polia:

```
            [ logo ]
   Osobné číslo alebo prihlasovacie meno
   [________________________]
   PIN
   [________________________]
   [ ☑ Zapamätať toto zariadenie (60 dní) ]
   [      Prihlásiť sa      ]
   Zabudnuté PIN? Kontaktuj správcu — kl. 123
```

- **Stravník:** osobné číslo + 6-miestny PIN (numerická klávesnica na mobile, funguje aj v rukaviciach).
- **Predák / admin:** to isté meno, ale **heslo min. 10 znakov** (nie PIN) + pre admina voliteľne 2FA (TOTP). Silnejšie oprávnenie = silnejší secret.
- **Prvé prihlásenie:** admin vydá dočasný PIN, appka vynúti zmenu.
- **Reset:** len cez admina (žiadny e-mail nie je potrebný — časť ľudí firemný e-mail nemá).
- **Ochrana:** 5 neúspešných pokusov → zámok na 15 minút, log pokusov. Pri 6-miestnom PIN nevyhnutné.
- **Viac rolí naraz** (predák je aj stravník): po prihlásení prepínač v hlavičke `Moje obedy | Môj tím | Správa`. Nie pred prihlásením.

### 2.2 Rozšírenia (neskôr, nie do MVP)
- **SSO cez Microsoft Entra ID / Google Workspace**, ak firma má účty pre všetkých → nulová správa hesiel. Odporúčam ako fázu 3, návrh systému na to musí byť pripravený.
- **Kiosk pri jedálni** (tablet) pre ľudí bez smartfónu: osobné číslo + PIN, automatický odhlas po 20 s nečinnosti. Alternatíva: objedná predák (bod 1.1).
- Čítačka firemných kariet (NFC) — len ak už existuje dochádzkový systém, z ktorého sa dá čítať.

---

## 3. Poskytovatelia stravy (catering)

Admin nastavuje **1 až 5** aktívnych poskytovateľov. Pre každého samostatne:

| Nastavenie | Hodnoty | Default |
|---|---|---|
| Názov, kontakt, e-mail na odosielanie objednávky | text | — |
| Počet jedál v ponuke | 1–10 | 3 |
| Číslovanie | `A,B,C` / `a,b,c` / `1,2,3` / `I,II,III` / `i,ii,iii` | `A,B,C` |
| Skladba jedla | `KOMPLET` (všetko v jednom) alebo `PO ČASTIACH` | KOMPLET |
| — ak PO ČASTIACH | polievka: nie/voliteľná/povinná; hlavné: povinné; dezert: nie/voliteľný/povinný | — |
| Denný deadline na odhlásenie | viď 4.2 | v deň obeda 07:30 |
| Kapacita/deň (voliteľné) | max. počet porcií, prípadne limit na jedlo | bez limitu |
| Dni, kedy varí | Po–Pia (možno vypnúť konkrétny deň) | Po–Pia |

**Číslovanie sa generuje automaticky z poradia** — admin len zvolí štýl. Názvy jedál sú voliteľné; ak chýbajú, zobrazí sa iba označenie („B"). Ak sú vyplnené, zobrazí sa `B — Vyprážaný syr, hranolky, tatárska`.

**Otvorená otázka:** vyberá si stravník poskytovateľa slobodne každý deň, alebo mu je pridelený (per osoba / per tím)? Viď bod 11.

---

## 4. Termíny a uzávierky

Všetky časy v zóne **Europe/Bratislava**, v databáze UTC. Deadline platí na sekundu (12:00:00).

### 4.1 Týždenná objednávka
- Menu na týždeň **W+1** sa otvára v **pondelok 00:00 týždňa W**.
- Uzatvára sa v **piatok 12:00 týždňa W** (admin mení deň aj čas).
- Po uzávierke je týždeň **zamknutý** — nedá sa meniť voľba jedla, dá sa už len **odhlásiť na deň** (bod 4.2).
- Admin môže voliteľne otvoriť aj dlhší horizont (napr. 4 týždne dopredu, ak je menu známe) — každý týždeň sa zamkne vo svojom termíne. Užitočné pred dovolenkami.
- **Doobjednanie po uzávierke:** default zakázané (dodávateľ už má počty). Per poskytovateľa sa dá povoliť „doobjednanie do <čas>" — treba dohodu s dodávateľom.

### 4.2 Denné odhlásenie
Pravidlo sa nastavuje **per poskytovateľ**, tvar:

```
odhlásenie na deň D je možné najneskôr do:
   [v deň obeda | predchádzajúci pracovný deň | 2 pracovné dni vopred]  o  [HH:MM]
```

Príklady:
- Poskytovateľ A: *v deň obeda 07:30* (default) → obed v stredu sa dá zrušiť do stredy 07:30.
- Poskytovateľ B: *predchádzajúci pracovný deň 14:00* → obed v stredu do utorka 14:00; **obed v pondelok do piatku 14:00** (preskakuje víkend aj sviatok).

Používateľovi sa nikdy nezobrazí len „07:30", ale konkrétny dátum a čas + odpočet („*ostáva 4 h 12 min*"). Nejednoznačnosť tu spôsobuje reklamácie.

### 4.3 Kalendár neobedových dní
- Slovenské štátne sviatky (predvyplnené, ročne aktualizované).
- Celozávodná dovolenka / odstávka — admin uzavrie rozsah dní.
- Jednorazové zatvorenie („dodávateľ nevarí 14. 8.") — admin, s automatickou notifikáciou dotknutým.

### 4.4 Výnimky po deadline
Admin (a len admin) môže zrušiť objednávku aj po termíne — povinne s dôvodom a s príznakom **„účtovať napriek odhláseniu"** (áno/nie), lebo dodávateľ už porciu uvaril. Bez tohto poľa sa účtovanie rozchádza s realitou.

---

## 5. Obrazovky

### 5.1 Stravník (mobile-first)
1. **Budúci týždeň** — hlavná obrazovka. 5 kariet Po–Pia, každá ukazuje voľbu alebo „neobjednané". Hore odpočet do uzávierky. Ťuk na deň → výber poskytovateľa a jedla → uložené (bez tlačidla „Potvrdiť", ukladá sa priebežne, s undo).
2. **Tento týždeň** — len na čítanie + tlačidlo *Odhlásiť sa* pri dňoch, kde ešte beží denný deadline.
3. **Kopírovať minulý týždeň** — jedno tlačidlo, doplní rovnaké voľby (ak dané jedlo v novom menu neexistuje, nechá deň prázdny a označí ho). Pri 100 ľuďoch to je rozdiel medzi „appka funguje" a „appka nefunguje".
4. **Môj prehľad** — mesiac, počet obedov, suma, čo mi ide zo mzdy.
5. **Profil** — zmena PIN, notifikácie, jazyk.

### 5.2 Predák — „Môj tím"
Matica **ľudia × dni** (riadky = podriadení, stĺpce Po–Pia), v bunke označenie jedla.
- zelená = objednané, sivá = neobjednané, prečiarknuté = odhlásené
- hore: *„3 ľudia nemajú objednané, uzávierka o 5 h"*
- hromadné akcie: kopírovať minulý týždeň celému tímu, hromadné odhlásenie na rozsah dní (dovolenka), tlač zoznamu

### 5.3 Admin
Poskytovatelia · Menu (týždenný editor, kopírovanie predchádzajúceho týždňa, neskôr import z XLSX/CSV) · Používatelia a tímy · Termíny a sviatky · Zostavy a exporty · Audit log · Notifikácie.

---

## 6. Výstupy a integrácie

- **Denný súhrn pre dodávateľa** — počty na jedlo (`A: 12, B: 7, C: 3`), automatický e-mail v momente uzávierky (PDF + XLSX). Toto appku ospravedlňuje.
- **Zoznam pre výdaj** — kto čo má, tlačiteľné, prípadne odškrtávanie prevzatia (fáza 3).
- **Mesačný podklad pre mzdy** — na osobu: počet obedov, cena, príspevok zamestnávateľa, zrážka zo mzdy. Export XLSX/CSV vo formáte, ktorý vezme mzdový softvér.
- **Zoznam pre predáka** — jeho tím, tlačiteľné.

---

## 7. Notifikácie

| Kedy | Komu | Obsah |
|---|---|---|
| Št 13:00 | kto nemá kompletne objednané | „Chýba ti objednávka na Po a Št. Uzávierka zajtra o 12:00." |
| Pia 09:00 | predákovi | zoznam členov tímu bez objednávky |
| Pia 10:00 | posledná výzva | ako vyššie |
| Pia 12:05 | všetkým | potvrdenie: čo mám objednané na budúci týždeň |
| pri zmene predákom | dotknutému stravníkovi | „Tvoju objednávku na stredu zmenil J. Novák" |
| pri uzavretí dňa adminom | dotknutým | „Vo štvrtok 14. 8. sa nevarí" |

Kanály: **v appke** (vždy), **e-mail** (kto má), **web push v PWA** (na iPhone funguje len po pridaní na plochu, iOS 16.4+). SMS neodporúčam — platené a pri 100 ľuďoch zbytočné.

---

## 8. Architektúra a hosting — možnosti

Záťaž je triviálna: ~100 používateľov, špička pár desiatok súčasne v piatok pred 12:00, jednotky tisíc requestov denne.

| # | Riešenie | Cena/mes. | Pre | Proti |
|---|---|---|---|---|
| 1 | **VPS v EÚ** (Hetzner / Websupport SK), Docker Compose: app + PostgreSQL + Caddy (HTTPS automaticky) + nočná záloha mimo servera | ~5–8 € | plná kontrola, dáta v EÚ, dostupné z domu aj z mobilu, žiadny vendor lock-in, prenositeľné on-prem | niekto musí raz za čas urobiť update OS |
| 2 | **Firemný server / VM / NAS** on-prem | 0 € navyše | dáta neopúšťajú firmu | treba sprístupniť zvonka (reverse proxy + certifikát alebo VPN); víkendové objednávanie z domu je požiadavka, takže VPN pre 100 ľudí je nepraktická; zálohy a HTTPS na pleciach IT |
| 3 | **PaaS** (Railway / Render / Fly.io, alebo Vercel + Neon) | 0–20 € | najrýchlejší štart, žiadna správa servera | treba strážiť EÚ región kvôli GDPR, pri raste ceny rastú, čiastočný lock-in |
| 4 | **Azure / AWS** | 20–60 € | dáva zmysel, ak firma už beží na Microsoft 365 → App Service + Entra ID SSO „zadarmo" | pre 100 ľudí prestrelené a zložité |

**Odporúčanie: možnosť 1.** Jeden VPS v EÚ, všetko v Dockeri, denné zálohy databázy mimo servera + týždenný test obnovy. Ak firma neskôr povie „chceme to u nás", ten istý `docker compose up` beží na ich VM. Celkové náklady vrátane domény pod **150 €/rok**.

### 8.1 Technológie (návrh, ladíme pred kódom)
- **Frontend + backend v jednom:** Next.js (React) + TypeScript, inštalovateľná **PWA** (ikona na ploche, offline zobrazenie „čo mám objednané").
- **Databáza:** PostgreSQL. Peniaze v centoch ako celé čísla, nikdy `float`.
- **Auth:** vlastné session cookies, hash PIN/hesiel cez argon2id, rate limiting. Pripravené na neskoršie SSO.
- **Plánované úlohy:** cron worker — notifikácie, zamykanie týždňa, odoslanie objednávky dodávateľovi.
- **E-mail:** firemné SMTP alebo Resend/Postmark.
- **Alternatíva:** Django alebo Laravel — administrácia „zadarmo" z frameworku, čo pri množstve admin nastavení ušetrí čas. Rozhodneme pred kódovaním.

Aplikácia musí byť **mobile-first**: veľké dotykové plochy (rukavice), vysoký kontrast (denné svetlo v hale), čitateľné písmo, funguje na 4-ročnom Androide.

---

## 9. Dátový model (hrubý náčrt)

```
Osoba        (osobné číslo, meno, tím, roly, hash PIN/hesla, aktívna, jazyk)
Tím          (názov, predák, zástupca)
Poskytovateľ (názov, číslovanie, skladba jedla, kapacita, pravidlo odhlásenia, e-mail)
MenuDňa      (poskytovateľ, dátum, položky[])
Položka      (poradie → označenie, názov, zložka: polievka|hlavné|dezert|komplet, cena, alergény)
Objednávka   (osoba, dátum, poskytovateľ, položky[], stav, vytvoril, zmenil, kedy)
                stav: OBJEDNANÉ | ODHLÁSENÉ | ODHLÁSENÉ_PO_TERMÍNE(účtované)
Nastavenia   (týždenná uzávierka, horizont, sviatky, uzavreté dni)
Audit        (kto, čo, kedy, stará → nová hodnota, IP)
```

Objednávka sa **nikdy nemaže**, len mení stav — inak sa spory „ja som sa odhlásil" nedajú rozhodnúť.

---

## 10. Logo a vizuál

Tri smery, vo fáze preview ich nakreslím ako SVG:

1. **Tanier-týždeň** — kruh rozdelený na 5 výsekov (Po–Pia), jeden vyplnený akcentom. Zrozumiteľné aj ako 32 px favicon aj ako 512 px PWA ikona.
2. **Obedár** — štylizovaný dvojposchodový obedár, držadlo tvorí fajku ✓.
3. **Vidlička-kalendár** — hroty vidličky prechádzajú do stĺpcov kalendárnej mriežky.

Farby: akcent **paprika/jantár** (jedlo, teplo, dobrá čitateľnosť) + **antracit** ako základ + krémové pozadie.
Sémantické farby držané oddelene od loga: zelená = objednané, sivá = neobjednané, červená = po termíne. Kontrast podľa WCAG AA.
Písmo: Inter (alebo systémové) — bezplatné, výborne čitateľné v malých veľkostiach.

Alternatívne názvy: *Obedár*, *Menu 5*, *Naobed*, *Obedy*.

---

## 11. Otvorené otázky (treba rozhodnúť pred kódovaním)

1. **Predák** — len vidí, alebo aj objednáva/odhlasuje za podriadených? *(návrh: konfigurovateľné, default „objednáva")*
2. **Poskytovateľ** — vyberá si ho stravník každý deň slobodne, alebo je pridelený osobe/tímu?
3. **Peniaze** — rieši appka ceny, príspevok zamestnávateľa a podklad na zrážky zo mzdy, alebo len počty jedál?
4. **Zmeny** — obedujú všetci v rovnakom čase, alebo treba riešiť ranná/poobedná/nočná (mení to denné deadliny)?
5. **Menu od dodávateľa** — v akej podobe chodí (papier, e-mail, PDF, Excel)? Určuje, či stačí ručné zadávanie, alebo treba import.
6. **E-mail** — majú všetci stravníci firemný e-mail? Ak nie, notifikácie sú len v appke/push.
7. **Hostia a návštevy** — treba objednávať obed pre návštevu?
8. **Jazyky** — stačí slovenčina, alebo treba aj CZ/UA/EN?
9. **Prevzatie obeda** — treba evidovať, kto si obed reálne vyzdvihol?
10. **Existujúci systém** — je odkiaľ preberať zoznam zamestnancov (dochádzka, personalistika)?

---

## 12. Fázy

| Fáza | Obsah |
|---|---|
| **0 — Koncept** | tento dokument, odsúhlasenie |
| **1 — Preview** | klikací prototyp (bez databázy): login, týždeň stravníka, matica predáka, admin nastavenia, 3 varianty loga |
| **2 — MVP** | prihlásenie a roly, týždenná objednávka + uzávierky, denné odhlásenie s pravidlami per poskytovateľ, konfigurácia poskytovateľov a menu, matica predáka, denný súhrn pre dodávateľa, audit, nasadenie |
| **3 — Rozšírenia** | podklad pre mzdy, push notifikácie, import menu, evidencia prevzatia, SSO, kiosk, zmeny, viacjazyčnosť |
