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

## Schránka na odpovede — `obedy@ahafarma.sk`

Objednávky odchádzajú z `objednavky@obedy.ahafarma.sk`, ale **odpovede dodávateľov musia niekam prísť.** Dočasne je ako `Reply-To` nastavená `info@panskepole.sk`. Chceme to nahradiť samostatnou schránkou na firemnom serveri.

**Prosíme založiť `obedy@ahafarma.sk` — ako schránku, do ktorej sa len prijíma.**

| | |
|---|---|
| **Prijímanie** | ✅ áno, to je celý dôvod jej existencie |
| **Odosielanie cez ňu** | ❌ nie, a nepotrebujeme na ňu ani SMTP údaje |
| **Otvárať port 587/465 zvonku** | ❌ **nie.** Pôvodné zadanie to žiadalo, dnes už neplatí |
| **Prístup** | aspoň dvom ľuďom, alebo presmerovanie na dve adresy |

**Prečo nie odosielanie cez ňu.** Objednávky odchádzajú v piatok napoludnie a ráno pred výdajom — teda v okamihoch, keď na tom naozaj záleží. Keby ich posielal server v technickej miestnosti, viazali by sa na prúd a internet v závode. Výpadok v piatok o 12:00 by znamenal, že objednávka neodíde. Preto odosielanie ostáva na externej službe, ktorá je na to postavená.

**Prečo prístup pre dvoch ľudí.** Adresa, na ktorú dodávateľ odpovie *„v stredu nemáme kapacitu, uvaríme len 30 porcií"*, musí byť čítaná aj vtedy, keď je jeden človek na dovolenke. Schránka, ktorú nikto neotvára, je horšia než `info@`, kam sa aspoň niekto pozerá.

V aplikácii je to jedno nastavenie — zmena adresy nevyžaduje zásah do kódu.

---

## Zhrnutie

1. sprístupniť NAS pre sťahovanie záloh ← **jediná blokujúca vec**
2. založiť **prijímaciu** schránku `obedy@ahafarma.sk` a dať k nej prístup dvom ľuďom
3. **neotvárať** odosielací port pre aplikačný server — už to netreba
