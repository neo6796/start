# 🍽️ Obedy — objednávkový systém

Webová aplikácia na objednávanie obedov, ich **rozúčtovanie** a **mesačný export / report**.
Zvládne viacero stredísk aj viacerých catering partnerov, termíny uzávierok, odhlasovanie
na dobu neprítomnosti, príznak chybnej objednávky/dodávky a import/export historických dát.

Postavené **bez akýchkoľvek externých závislostí** — čisto na štandardnej knižnici Node.js
(`node:http`, vstavané `node:sqlite`, `node:crypto`). Netreba `npm install`.

---

## Rýchly štart

```bash
node src/server.js       # spustí server na http://localhost:3000
# alebo:  npm start
```

Pri prvom spustení sa vytvorí databáza `data/obedy.db` a naplní demo dátami.

**Predvolené prihlásenia (demo):**

| Rola      | Login                          | Heslo      |
|-----------|--------------------------------|------------|
| Admin     | `admin`                        | `admin123` |
| Stravníci | `jnovak`, `mkovac`, `phorvath` | `heslo123` |

> Heslo admina nastavíte cez `ADMIN_PASSWORD=... node src/server.js` (platí len pri prvom seede).

### Konfigurácia (premenné prostredia)

| Premenná         | Význam                        | Predvolené          |
|------------------|-------------------------------|---------------------|
| `PORT`           | port servera                  | `3000`              |
| `HOST`           | adresa                        | `0.0.0.0`           |
| `DATA_DIR`       | priečinok pre DB a secret     | `./data`            |
| `DB_PATH`        | cesta k SQLite súboru         | `DATA_DIR/obedy.db` |
| `SESSION_SECRET` | tajný kľúč na podpis sedení   | generuje sa         |
| `ADMIN_PASSWORD` | heslo admina pri prvom seede  | `admin123`          |

---

## Funkcie

### Administrátor / back office
- **Stravníci** — pridávanie/editácia, meno, heslo, rola, priradenie na **stredisko**, (de)aktivácia.
- **Strediská** a **catering partneri** — správa, možnosť viacerých ponúk od viacerých partnerov naraz.
- **Menu** — nahrávanie a editácia jedál na konkrétny deň a partnera, cena, (de)aktivácia položky.
- **Termíny uzávierky** — dokedy sa treba zahlásiť/odhlásiť (napr. „1 deň vopred do 10:00"),
  globálne aj s možnosťou výnimky pre konkrétny dátum.
- **Prehľad objednávok** — jednotlivo aj **agregovane** (podľa stravníka, strediska, dňa, partnera),
  za **deň / týždeň / mesiac / rok** i pre ľubovoľné historické obdobie.
- **Príznak chybnej objednávky / dodávky** — s poznámkou; chybné sa nezaúčtujú.
- **Hromadné objednanie** — admin nahlási obed viacerým stravníkom naraz (napr. za celé stredisko).
- **Rozúčtovanie** — sumár obedov a súm na účtovanie za obdobie, po stravníkoch a strediskách.
- **Export** objednávok aj rozúčtovania do **CSV** (Excel-friendly, s BOM a diakritikou).
- **Import** historických objednávok z CSV s ľubovoľnou periodicitou.

### Účastník / stravník
- Výber z menu na najbližšie dni, s cenou a termínom uzávierky.
- **Bez možnosti spätnej zmeny** po objednaní; zrušiť sa dá len do uzávierky.
- Prehľad vlastných objednávok (história).
- **Odhlásenie na obdobie neprítomnosti** — objednávky v danom rozsahu (ktoré ešte nie sú po
  uzávierke) sa automaticky zrušia.

---

## Architektúra

```
src/
  config.js   – konfigurácia, cesty, session secret
  db.js       – SQLite schéma + nastavenia
  auth.js     – hashovanie hesiel (scrypt) + podpísané session tokeny (HMAC)
  util.js     – dátumové rozsahy, uzávierky, CSV import/export
  seed.js     – prvotné demo dáta
  server.js   – HTTP server + REST API + servírovanie frontendu
public/
  index.html, styles.css, app.js   – jednostránková aplikácia (SPA, vanilla JS)
data/
  obedy.db    – SQLite databáza (mimo gitu)
```

- **Autentifikácia:** heslá hashované cez `scrypt`; prihlásenie drží HttpOnly cookie s HMAC-podpísaným
  tokenom (platnosť 12 h). Žiadne heslá ani tokeny sa nelogujú.
- **Dáta:** jeden SQLite súbor (WAL režim). Ľahká záloha — stačí skopírovať `data/obedy.db`.

---

## Na čom to beží a ako (odpovede na otázky zo zadania)

**Na čom pobeží:** stačí server (alebo malý VPS/kontajner) s **Node.js 22.5+**. Aplikácia je jeden
proces, ktorý zároveň servíruje web aj API. Odporúčané nasadenie za reverznou proxy (nginx/Caddy)
s HTTPS; proces držať cez `systemd` alebo v Docker kontajneri. Databáza je súborová (SQLite),
netreba samostatný DB server. Pre desiatky až nižšie stovky stravníkov je toto plne postačujúce;
pri raste sa dá migrovať na PostgreSQL bez zmeny UI.

**Ako si to pozrú klienti/zamestnanci:** cez **webový prehliadač** — žiadna inštalácia. Rozhranie je
**responzívne**, funguje rovnako na počítači, tablete aj mobile. Dá sa pridať na plochu telefónu ako
webová skratka.

**Z akého zariadenia sa prihlásia:** z ľubovoľného zariadenia s prehliadačom (Windows/Mac/Linux,
iOS/Android). Prihlásenie menom a heslom, ktoré prideľuje admin.

**Môžu nahlásiť obedy hromadne viacerí:** áno — **admin** má hromadné objednanie (jedno menu naraz
viacerým stravníkom, napr. za celé stredisko), s prehľadom, komu sa objednávka nevytvorila a prečo.
Bežný stravník objednáva za seba.

---

## Formát CSV pre import

Oddeľovač `;` alebo `,`. Hlavička (poradie stĺpcov je ľubovoľné):

```
datum;login;partner;menu;nazov;cena;chybna
2025-03-10;jnovak;Gastro Plus;Menu A;Guláš;5.90;nie
```

Neznámi stravníci (podľa `login`) sa preskočia a vypíšu ako chyby. Partneri a položky menu, ktoré
ešte neexistujú, sa pri importe automaticky doplnia.

---

## REST API (skrátene)

| Metóda | Cesta | Popis |
|--------|-------|-------|
| POST | `/api/login`, `/api/logout` | prihlásenie / odhlásenie |
| GET | `/api/me` | prihlásený používateľ |
| GET/POST/PATCH | `/api/users` | stravníci (admin) |
| GET/POST/PATCH | `/api/centers`, `/api/caterers` | strediská, partneri (admin) |
| GET/POST/PATCH/DELETE | `/api/menu` | menu (admin) |
| GET | `/api/menu/available` | menu s termínmi a mojím stavom (stravník) |
| POST/DELETE | `/api/orders` | objednať / zrušiť (do uzávierky) |
| POST | `/api/orders/bulk` | hromadné objednanie (admin) |
| GET | `/api/orders` | prehľad/agregácia (admin) |
| PATCH | `/api/orders/:id/faulty` | príznak chybnej (admin) |
| GET/POST/DELETE | `/api/absences` | odhlásenia na neprítomnosť |
| GET | `/api/report/billing` | rozúčtovanie |
| GET | `/api/export/orders.csv`, `/api/export/billing.csv` | export |
| POST | `/api/import/orders` | import CSV (admin) |
| GET/PUT | `/api/settings` | termíny uzávierky (admin) |

---

## Čo ešte odporúčam dorobiť pre plne produkčný systém

Aplikácia pokrýva celé jadro. Pre nasadenie „naostro" zvážiť:

- **HTTPS + reverzná proxy** a nastavenie cookie `Secure` (pridať flag, keď beží za TLS).
- **E-mail / push notifikácie** – pripomienka pred uzávierkou, potvrdenie objednávky.
- **Zmena vlastného hesla** stravníkom a reset hesla (teraz mení admin).
- **Sviatky a nepracovné dni** – automaticky vynechať z ponuky.
- **Audit log** a rola „vedúci strediska" (obmedzený admin len na svoje stredisko).
- **Zálohovanie DB** (cron kópia `data/obedy.db`) a pri väčšej záťaži prechod na PostgreSQL.
- **Fakturačné exporty** priamo do formátu účtovného softvéru.
