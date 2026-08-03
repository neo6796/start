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
| `A` | `obedy.ahafarma.sk` | `46.225.236.143` ✅ hotovo |


- TTL počas nasadzovania nastaviť nízko (300 s), po odladení sa môže zvýšiť.
- Certifikát pre HTTPS **netreba kupovať ani nastavovať** — vybaví ho automaticky Let's Encrypt priamo na serveri, len čo A záznam funguje.

---

## 2. Schránka na odosielanie — na firemnom mailovom serveri

Pošta pre `ahafarma.sk` beží na **firemnom serveri v technickej miestnosti** (`62.169.176.222`, MX `mail.ahafarma.sk`). Služba u Webglobe je vypnutá, takže schránka sa zakladá tam, nie v paneli hostingu.

Aplikácia potrebuje:

- schránku **`obedy@ahafarma.sk`** (nie `noreply@` — dodávatelia na objednávky odpovedajú a tie odpovede potrebujeme prečítať),
- **SMTP údaje**: server, port (465 alebo 587), používateľ, heslo,
- **presmerovanie** z tejto schránky na adresu, ktorú niekto reálne číta.

### ⚠️ Overiť: dostupnosť odosielacieho portu zvonku

Server prijíma poštu zvonku (MX na porte 25), ale **odosielací port 587/465 býva otvorený len do vnútornej siete**. Aplikácia beží na serveri v Nemecku, takže sa naň musí dostať cez internet.

Ak je port zavretý, **neotvárať ho pre celý internet.** Stačí povoliť vo firewalle jedinú zdrojovú adresu:

```
povoliť TCP 587 (alebo 465) zo zdroja 46.225.236.143
```

To je IP adresa aplikačného servera. Jedno pravidlo, nulová expozícia navonok.

### Dôsledok pre prevádzku
Odosielanie objednávok dodávateľom sa tým viaže na dostupnosť firemného servera. Pri výpadku prúdu či internetu v piatok predpoludním objednávka neodíde — aplikácia to podchytí tromi pokusmi a upozornením správcovi s priloženým PDF, ale výpadok treba brať do úvahy.

---

## 3. Overovacie záznamy pošty

Bez nich Gmail a Microsoft 365 správy zahodia alebo hodia do spamu — a objednávky sa k dodávateľom nedostanú.
**Netreba pridávať nič — všetky tri už na doméne existujú** a pokrývajú firemný mailový server:

| Záznam | Súčasná hodnota |
|---|---|
| SPF | `v=spf1 a mx a:mail.ahafarma.sk ip4:62.169.176.222 ~all` |
| DKIM | `default._domainkey` s RSA kľúčom |
| DMARC | `v=DMARC1; p=none;` |

Keďže aplikácia odosiela cez ten istý server, ktorý SPF už povoľuje, **v DNS sa nemení nič**.

⚠️ Ak by test doručiteľnosti (nižšie) predsa zlyhal na SPF, existujúci záznam sa **doplní**, nikdy neprepisuje — inak prestane chodiť pošta celej firme.

---

## 4. Čo poslať späť

- [ ] **IP adresa VPS** (a IPv6, ak je)
- [ ] **SSH prístup** na VPS (kľúč)
- [ ] **SMTP údaje** pre `obedy@ahafarma.sk` — server, port, používateľ, heslo
- [ ] potvrdenie, že **port 587/465 je dostupný z `46.225.236.143`**
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
2. ~~pridať `A` záznam~~ — hotovo, `obedy.ahafarma.sk` → `46.225.236.143`
3. založiť schránku `obedy@ahafarma.sk` na firemnom mailovom serveri
4. overiť dostupnosť odosielacieho portu z aplikačného servera
5. sprístupniť NAS pre sťahovanie záloh

Kroky 2–4 sú rádovo **pol hodiny práce**, jednorazovo.
