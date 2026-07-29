# Zadanie — Interné objednávanie mlieka (Aha farma)

Interný nástroj, cez ktorý si zamestnanci/zákazníci objednávajú mlieko
a komunikácia (potvrdenia, pripomienky, doručenie) prebieha cez **WhatsApp**.

---

## 1. Celkový priebeh (životný cyklus objednávky)

```mermaid
flowchart TD
    A[Zákazník objedná v appke] -->|do uzávierky| B[Uzávierka objednávok<br>napr. štvrtok 12:00]
    A2[Pripomienka cez WhatsApp<br>deň pred uzávierkou] -.-> A
    B --> C[Potvrdenie objednávky / jej časti<br>+ deň očakávaného doručenia<br>cez WhatsApp]
    C --> D[Deň D: kuriér privezie tovar]
    D --> E[Tovar vloží do spoločného<br>chladeného príjmového boxu]
    E --> F[Notifikácia cez WhatsApp:<br>„Tovar je v boxe, príď si poň"]
```

### Krok za krokom

1. **Objednávka** — zákazník si v appke (web/PWA na mobile) vyberie produkty
   a množstvá, zadá meno a WhatsApp číslo, odošle objednávku.
2. **Uzávierka (deadline)** — objednávky sa prijímajú len do stanoveného času
   (napr. **štvrtok 12:00**). Po uzávierke appka objednávky na daný týždeň
   nepríjme. Deň pred uzávierkou príde **WhatsApp pripomienka** tým, ktorí si
   ešte neobjednali.
3. **Potvrdenie po uzávierke** — po uzávierke sa objednávky spracujú a zákazník
   dostane cez WhatsApp **potvrdenie objednávky alebo jej časti**:
   - potvrdené položky (čo z objednaného reálne príde),
   - prípadne nedostupné položky (čo nepríde / príde inokedy),
   - **deň očakávaného doručenia (deň D)**.
4. **Deň D — doručenie** — kuriér privezie tovar a vloží ho do **spoločného
   chladeného príjmového boxu** vo firme.
5. **Notifikácia o doručení** — po vložení do boxu odíde zákazníkom WhatsApp
   notifikácia, že tovar je v boxe a môžu si ho vyzdvihnúť.

---

## 2. Roly

| Rola | Čo robí |
|------|---------|
| **Zákazník / zamestnanec** | Objednáva v appke, dostáva WhatsApp notifikácie (potvrdenie, pripomienka, doručenie). |
| **Nákupca / admin** | Vidí súhrn objednávok za týždeň (nákupný zoznam), po uzávierke potvrdzuje objednávky/ich časti a nastavuje deň doručenia. Dostáva upozornenie o každej novej objednávke. |
| **Kuriér / príjem** | V deň D privezie tovar do chladeného boxu a potvrdí doručenie (tlačidlo/odkaz), čím sa odošlú notifikácie zákazníkom. |

---

## 3. Stavy objednávky

| Stav | Význam | Notifikácia |
|------|--------|-------------|
| `received` | Objednávka prijatá (pred uzávierkou) | ✅ „Objednávka prijatá" (WhatsApp) |
| `confirmed` | Po uzávierke potvrdená celá / časť + deň D | ✅ „Potvrdené: … Doručenie: streda 14.8." |
| `partially_confirmed` | Časť položiek nedostupná | ✅ s rozpisom čo príde / nepríde |
| `delivered` | Tovar v chladenom boxe | 📦 „Tovar je v boxe, príď si poň" |
| `closed` | Vyzdvihnuté / týždeň uzavretý | – |

---

## 4. WhatsApp notifikácie (Twilio)

| Kedy | Komu | Obsah |
|------|------|-------|
| Hneď po objednaní | zákazník | potvrdenie prijatia objednávky + rekapitulácia položiek a sumy |
| Hneď po objednaní | nákupca (voliteľné) | „Nová objednávka od X (N ks)" |
| Deň pred uzávierkou | tí, čo si neobjednali | pripomienka s odkazom na appku |
| Po uzávierke | každý objednávajúci | potvrdenie objednávky / jej časti + **deň očakávaného doručenia** |
| V deň D po naskladnení | každý s doručenou objednávkou | „📦 Tovar je v chladenom boxe" |

Technicky: **Twilio WhatsApp API**; bez nakonfigurovaných kľúčov beží appka
v DEV režime (správy sa logujú do konzoly). Pre produkciu treba schválené
šablóny správ (Meta) — správy iniciované firmou musia byť template-y.

---

## 5. Appka (frontend)

- **Webová appka / PWA** — beží v prehliadači, dá sa pridať na plochu telefónu
  (iPhone / Android / Huawei bez Google služieb), funguje offline (service worker).
- Branding **Aha farma** (logo, červená #E80020).
- Záložky:
  - **Objednať** — katalóg podľa kategórií, množstvá, ceny, suma, poznámka,
    pásik s uzávierkou (otvorené/zatvorené).
  - **Súhrn pre nákupcu** — agregovaný nákupný zoznam za týždeň (kusy + sumy)
    a jednotlivé objednávky.
  - *(nové)* **Spracovanie po uzávierke** — nákupca potvrdí objednávky / časti
    a zadá deň doručenia; kuriér/príjem potvrdí naskladnenie do boxu.

## 6. Backend

- **Node.js + Express**, REST API, JSON úložisko (`backend/data/db.json`),
  pripravené na výmenu za SQLite/Postgres.
- Uzávierka a plánovač pripomienok — konfigurovateľné cez env premenné
  (deň, čas, časová zóna `Europe/Bratislava`).
- Nasadenie: **Docker + Caddy (auto-HTTPS)** alebo **Windows Server natívne**
  (Node + Caddy ako služby cez NSSM) — viď `README.md` a `DEPLOY-WINDOWS.md`.

---

## 7. Stav implementácie

### ✅ Hotové
- Objednávanie v appke (katalóg, množstvá, poznámka), PWA + branding Aha farma
- WhatsApp potvrdenie prijatia objednávky + upozornenie nákupcovi (Twilio / DEV režim)
- Uzávierka (štvrtok 12:00, konfigurovateľná) — blokovanie po deadline
- Automatická pripomienka deň pred uzávierkou (max 1× týždenne, odolné voči reštartu)
- Súhrn pre nákupcu (nákupný zoznam za týždeň)
- Nasadenie: Docker + Caddy HTTPS, návod a skripty pre Windows Server
- Klikateľné demo (artifact) s ukážkovými položkami a cenami

- ✅ **Potvrdenie objednávky / jej časti po uzávierke** — záložka *Spracovanie*
  (voliteľný `ADMIN_PIN`): nedostupné položky, deň doručenia (predvolený piatok,
  dá sa zmeniť), hromadné WhatsApp potvrdenia.
- ✅ **Stavy objednávky** `received → confirmed / partially_confirmed /
  unavailable → delivered` (so štítkami v UI).
- ✅ **Kuriér / deň D** — bezpečný odkaz `/kurier?t=<token>` bez prihlásenia
  + záložné tlačidlo v Spracovaní; hromadná notifikácia „📦 tovar je v boxe";
  idempotentné.

### 🔨 Možné budúce rozšírenia
- Potvrdenie vyzdvihnutia z boxu *(zámerne vynechané — niet ako evidovať)*.
- História objednávok zákazníka, mesačné vyúčtovanie na osobu.

---

## 8. Rozhodnutia (zodpovedané otázky)

| Otázka | Rozhodnutie |
|--------|-------------|
| Kto potvrdzuje po uzávierke | Jedna osoba — nákupca v záložke *Spracovanie* (voliteľný PIN). |
| Deň doručenia | Predvolený **piatok**, nákupca ho môže pri potvrdení zmeniť. |
| Ako potvrdí kuriér | **Bezpečný odkaz** `/kurier?t=<token>` (primárne) + tlačidlo v admin záložke (záloha). |
| Evidencia vyzdvihnutia | Nie — niet ako evidovať, kto si tovar z boxu zobral. |
