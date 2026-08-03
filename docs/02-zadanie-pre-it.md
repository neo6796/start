# Zadanie pre IT — príprava domény a pošty

Pre aplikáciu na objednávanie obedov (*Obedár*). Jedna strana, štyri kroky.
Presné hodnoty záznamov vygeneruje panel Webglobe pri zakladaní služby — nižšie je uvedené, **ktoré** záznamy treba a kam patria.

---

## 0. Predpoklad — objednaný VPS

Aplikácia potrebuje **VPS s root prístupom**, nie zdieľaný webhosting (nepobeží na ňom Node ani PostgreSQL).

Odporúčané parametre pre ~100 používateľov:

| | |
|---|---|
| CPU / RAM | 2 vCPU, 4 GB |
| Disk | 40–80 GB SSD |
| Systém | Debian 13 alebo Ubuntu 26.04 LTS |
| Poznámka | ak nikto nechce robiť aktualizácie systému, zvážiť *Managed VPS* |

---

## 1. Podadresa pre aplikáciu

Aplikácia pobeží na **podadrese firemnej domény**, novú doménu kupovať netreba.

| Typ | Názov | Hodnota |
|---|---|---|
| `A` | `obedy.firma.sk` | IP adresa VPS |
| `AAAA` | `obedy.firma.sk` | IPv6 adresa VPS *(ak ju VPS má)* |

- TTL počas nasadzovania nastaviť nízko (300 s), po odladení sa môže zvýšiť.
- Certifikát pre HTTPS **netreba kupovať ani nastavovať** — vybaví ho automaticky Let's Encrypt priamo na serveri, len čo A záznam funguje.

---

## 2. Schránka na odosielanie

Aplikácia posiela objednávky dodávateľom a upozornenia adminom. Potrebuje vlastnú schránku:

- adresa: **`noreply@obedy.firma.sk`**
- prístup cez SMTP (`mail.webglobe.sk`, port 465 alebo 587, s autentifikáciou)

**Prečo na podadrese a nie `obedy@firma.sk`:** pri odosielaní z hlavnej domény by sa musel upravovať jej SPF záznam — a chyba v ňom zhodí poštu **celej firme**. Na podadrese je to úplne oddelené a firemnej pošty sa to nedotkne. Funkčne je to rovnaké.

---

## 3. Overovacie záznamy pošty

Bez nich Gmail a Microsoft 365 správy zahodia alebo hodia do spamu — a objednávky sa k dodávateľom nedostanú.
**Všetky tri patria na podadresu `obedy.firma.sk`, nie na hlavnú doménu.**

| Typ | Názov | Obsah |
|---|---|---|
| `TXT` | `obedy.firma.sk` | **SPF** — presné znenie podľa panela Webglobe (`v=spf1 include:… -all`) |
| `TXT` alebo `CNAME` | podľa selektora, napr. `dkim._domainkey.obedy.firma.sk` | **DKIM** — kľúč vygeneruje panel Webglobe pri zapnutí DKIM pre doménu |
| `TXT` | `_dmarc.obedy.firma.sk` | **DMARC** — začať na `v=DMARC1; p=none; rua=mailto:it@firma.sk` |

⚠️ **Dve upozornenia:**
1. **Nesiahať na SPF hlavnej domény.** Ak by sa niekedy predsa posielalo z `firma.sk`, existujúci SPF sa musí **doplniť**, nie prepísať — inak prestane chodiť pošta celej firme.
2. **DMARC nechať zatiaľ na `p=none`.** Je to režim „len hlás, nič nezahadzuj". Po pár týždňoch, keď z hlásení vidno, že všetko prechádza, sa dá sprísniť na `p=quarantine`.

---

## 4. Čo poslať späť

- [ ] **IP adresa VPS** (a IPv6, ak je)
- [ ] **SSH prístup** na VPS (kľúč)
- [ ] **SMTP údaje** pre `noreply@obedy.firma.sk` — server, port, používateľ, heslo
- [ ] potvrdenie, že **DNS záznamy sú aktívne**
- [ ] prístup na **NAS pre zálohy** — viď nižšie

---

## 5. Zálohovanie na firemný NAS

Zálohy sa ukladajú mimo hostingu, na firemný NAS. Dôležité je, **ktorým smerom to ide**:

> **NAS sa pripája na server a sťahuje si zálohu.** Nie server na NAS.

Dôvod: keby zálohu posielal server, musel by poznať prístup na NAS — a útočník, ktorý sa dostane na server, by zmazal aj zálohy. Pri sťahovaní pozná prístup len NAS a server o ňom nevie nič. Bonus: **NAS nemusí byť dostupný z internetu**, stačí mu odchádzajúce spojenie.

Čo treba na strane NAS:
- miesto na **datované snímky** (30 denných + 12 mesačných), nie na jednu prepisovanú kópiu,
- naplánovanú nočnú úlohu (`restic` alebo `borg` cez SSH),
- rezervu cca 20 GB — pri deduplikácii to bude v praxi oveľa menej.

---

## Poradie krokov

1. objednať VPS → vznikne IP adresa
2. pridať `A` záznam pre `obedy.firma.sk`
3. založiť schránku `noreply@obedy.firma.sk`
4. pridať SPF, DKIM a DMARC na podadresu
5. sprístupniť NAS pre sťahovanie záloh

Kroky 2–4 sú rádovo **pol hodiny práce**, jednorazovo.
