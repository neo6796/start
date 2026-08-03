# Zadanie pre IT — čo zostáva

Pre aplikáciu na objednávanie obedov (*Obedár*).

> **Aktualizované.** Server, doména aj odosielanie pošty sú **hotové a overené** — spravili sme ich sami, mimo firemnej infraštruktúry. Pôvodné zadanie počítalo so schránkou na firemnom mailovom serveri a s otvorením odosielacieho portu; **to už neplatí a nerobte to.** Zostáva jediná vec: prístup na NAS pre zálohy.

---

## Čo je hotové (na vedomie, netreba zasahovať)

| | |
|---|---|
| **Aplikačný server** | VPS u Hetznera, Nemecko · Debian 13 · IP `46.225.236.143` |
| **Podadresa** | `A` záznam `obedy.ahafarma.sk` → `46.225.236.143` |
| **HTTPS** | Let's Encrypt automaticky na serveri, nič sa nekupuje |
| **Odosielanie pošty** | cez **Brevo**, odosielacia doména `obedy.ahafarma.sk` |
| **DKIM a DMARC** | štyri záznamy na podadrese `obedy`, overené |

**Do SPF hlavnej domény `ahafarma.sk` sme nesiahli a siahnuť netreba.** Brevo overuje odosielanie cez DKIM, nie cez SPF. Pošta celej firmy je tým nedotknutá.

**Schránku `obedy@ahafarma.sk` nezakladajte** a **port 587/465 na firemnom serveri neotvárajte.** Bolo by to zbytočné a naviazalo by odosielanie objednávok na prúd a internet v technickej miestnosti.

---

## Čo potrebujeme od vás — zálohy na firemný NAS

Zálohy sa ukladajú mimo hostingu, na firemný NAS. Dôležité je, **ktorým smerom to ide**:

> **NAS sa pripája na server a sťahuje si zálohu.** Nie server na NAS.

Dôvod: keby zálohu posielal server, musel by poznať prístup na NAS — a útočník, ktorý sa dostane na server, by zmazal aj zálohy. Pri sťahovaní pozná prístup len NAS a server o ňom nevie nič. Bonus: **NAS nemusí byť dostupný z internetu**, stačí mu odchádzajúce spojenie.

Čo treba na strane NAS:

- miesto na **datované snímky** (30 denných + 12 mesačných), nie na jednu prepisovanú kópiu,
- naplánovanú nočnú úlohu (`restic` alebo `borg` cez SSH na `46.225.236.143`),
- rezervu cca **20 GB** — pri deduplikácii to bude v praxi podstatne menej,
- **štvrťročný test obnovy.** Záloha, z ktorej sa nikdy neskúšalo obnoviť, nie je záloha.

Verejný SSH kľúč NAS-u pošlite a my ho na server pridáme; alebo nám povedzte, či ho máme vygenerovať my.

---

## Ešte jedna maličkosť — adresa na odpovede

Objednávky odchádzajú z `objednavky@obedy.ahafarma.sk`, ale **odpovede dodávateľov musia niekam prísť.** Zatiaľ je ako `Reply-To` nastavená existujúca firemná schránka `info@panskepole.sk`.

Ak chcete radšej samostatnú schránku na tento účel (napr. `obedy@ahafarma.sk` na firemnom serveri, len ako prijímaciu), založte ju a dajte vedieť — v aplikácii je to jedno nastavenie, mení sa bez zásahu do kódu. **Odosielanie cez ňu nepotrebujeme**, len prijímanie.

---

## Zhrnutie

1. sprístupniť NAS pre sťahovanie záloh ← **jediná blokujúca vec**
2. *(voliteľne)* povedať, či má `Reply-To` ostať na `info@panskepole.sk`
