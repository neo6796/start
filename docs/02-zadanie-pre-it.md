# Zadanie pre IT

Pre aplikáciu na objednávanie obedov (*Obedár*).

> **Táto verzia nahrádza všetko predchádzajúce.** Zadanie sa cestou dvakrát menilo, ako sa vyjasňovalo, kadiaľ pôjde pošta. Ak máte staršiu verziu, zahoďte ju — hlavne tú, kde stálo *„schránku len na prijímanie"* a *„port neotvárať"*. **Dnes platí opak.**

---

## Čo je hotové — netreba zasahovať

| | |
|---|---|
| **Aplikačný server** | VPS u Hetznera, Nemecko · Debian 13 · IP `46.225.236.143` |
| **Doména** | `A` záznam `obedy.ahafarma.sk` → `46.225.236.143` |
| **HTTPS** | Let's Encrypt automaticky, nič sa nekupuje ani neobnovuje ručne |
| **Beží tam** | ukážka aplikácie — `https://obedy.ahafarma.sk` |

**Do DNS hlavnej domény `ahafarma.sk` sme nesiahli a siahať netreba.** Na podadrese `obedy` sú štyri záznamy pre externú odosielaciu službu (Brevo) — **nechajte ich tak.** Práve teraz sa nepoužívajú, ale sú to naše záložné dvere a nič nestoja.

---

## 1. Schránka `obedy@ahafarma.sk` — prijíma **aj odosiela**

Aplikácia bude posielať objednávky dodávateľom cez váš mailový server. Jedna adresa zvládne obe úlohy: je odosielateľom aj adresou, na ktorú chodia odpovede.

Potrebujeme:

- schránku **`obedy@ahafarma.sk`**,
- **SMTP údaje na odosielanie**: server, port (587 alebo 465 — vyberte, čo máte), používateľské meno, heslo,
- **prístup k schránke aspoň pre dvoch ľudí** (alebo presmerovanie na dve adresy).

> **Prečo dvaja ľudia.** Na túto adresu odpovie dodávateľ vetou typu *„v stredu nemáme kapacitu, uvaríme len 30 porcií"*. Musí ju niekto prečítať aj vtedy, keď je jeden človek na dovolenke. Schránka, ktorú nikto neotvára, je horšia než žiadna — vytvára falošný pocit, že sa niekto pozerá.

**Heslo neposielajte e-mailom ani cez chat.** Vložte ho do správcu hesiel a pošlite odkaz, alebo ho nadiktujte.

---

## 2. Firewall — ✅ netreba nič robiť

Port **465 je otvorený a nasmerovaný na mailový server**, overené správcom.

Pôvodne som navrhoval zúžiť ho len na zdrojovú adresu `46.225.236.143`. **To by bola chyba** — ten istý port používajú zamestnanci zo svojich telefónov a notebookov mimo firemnej siete. Zúžením by sa im rozbilo odosielanie pošty. Odosielací port má byť dostupný, presne ako je.

**Dôsledok, ktorý z toho vyplýva pre nás:** keďže je port otvorený voči internetu, dostáva neustále pokusy o uhádnutie hesla. Heslo k schránke `obedy@ahafarma.sk` preto musí byť **dlhé a náhodne vygenerované správcom hesiel**, nie vymyslené človekom.

Nejde o formalitu. Keby sa schránka prelomila, poslúžila by na rozosielanie spamu a **IP adresa firemného mailového servera by skončila na čiernych listinách.** Vtedy prestanú chodiť nielen objednávky obedov, ale pošta celej firmy.

---

## 3. Potvrdiť, že sa odchádzajúca pošta podpisuje DKIM-om

Na doméne existuje záznam `default._domainkey`. **Overte, či sa správy odosielané z tejto schránky naozaj podpisujú** — samotná existencia záznamu to nezaručuje, podpisovanie musí byť pre danú schránku zapnuté.

Bez podpisu skončia objednávky u dodávateľov v spame alebo ich prijímajúci server zahodí. My si to po nasadení overíme skúšobnou správou na Gmail, ale je lepšie vedieť to dopredu.

Existujúce záznamy, ktoré sme kontrolovali a **nemeníme**:

| Záznam | Hodnota |
|---|---|
| SPF | `v=spf1 a mx a:mail.ahafarma.sk ip4:62.169.176.222 ~all` |
| DKIM | `default._domainkey` |
| DMARC | `v=DMARC1; p=none;` |

⚠️ Ak by sa niečo v SPF predsa dopĺňalo, záznam sa **rozširuje, nikdy neprepisuje** — a smie byť len jeden. Inak prestane chodiť pošta celej firme.

---

## 4. Odblokovať IP aplikačného servera a dať ju na bielu listinu

Pri testovaní odosielania sme dvakrát zadali nesprávne prihlasovacie meno a ochrana proti hádaniu hesla zablokovala celú IP adresu:

```
* Connected to mail.pdvrable.sk (62.169.176.222) port 587
* This IP [46.225.236.143] is blocked.
```

**Prosíme o dve veci:**

1. **Odblokovať `46.225.236.143`** *(ak sa ban po čase neuvoľní sám)*.
2. **Pridať ju na bielu listinu** — je to server, z ktorého bude appka denne posielať objednávky do jedální. Ak ju ochrana zablokuje uprostred týždňa, v ten deň sa neuvarí správny počet obedov.

Je to jediná IP adresa, prihlasuje sa vždy tým istým menom a posiela rádovo desiatky správ denne.

*Na našej strane sme z toho spravili pravidlo: pri chybe prihlásenia appka pokus nikdy neopakuje, len upozorní správcu. Opakovanie ostáva len pre sieťové a dočasné chyby.*

## 5. Zálohovanie na firemný NAS

Ide o jednu naplánovanú úlohu na NAS-e. Nič sa neinštaluje, nič sa neotvára vo firewalle.

### Prečo to ide týmto smerom

> **NAS sa pripája na server a sťahuje si zálohu. Nie server na NAS.**

Keby zálohu **posielal server**, musel by mať uložený prístup na NAS. Útočník, ktorý sa dostane na server, si ten prístup prečíta — a po zašifrovaní dát zmaže aj zálohy. Presne preto zálohy zlyhávajú vtedy, keď ich najviac treba.

Pri sťahovaní pozná prístupové údaje **len NAS**. Server o jeho existencii nevie nič a nemá sa ako k nemu dostať. Vedľajší efekt je príjemný: **NAS nemusí byť dostupný z internetu**, stačí mu odchádzajúce spojenie.

### Čo si rieši server sám — teda čo NIE je vaša práca

Každú noc server sám vyrobí jeden zabalený súbor s dátumom v názve a staršie ako týždeň si zmaže:

```
/srv/zalohy/obedar-2026-08-07.sql.gz
/srv/zalohy/obedar-2026-08-06.sql.gz
/srv/zalohy/obedar-2026-08-05.sql.gz
```

Sú to **jednotky megabajtov na deň**. Preto netreba `restic`, `borg` ani deduplikáciu — nie je čo šetriť.

### Čo treba na NAS-e — tri kroky

**1. Vygenerovať SSH kľúč** *(ak už NAS nejaký má, stačí ten)*

```
ssh-keygen -t ed25519 -f /volume1/.ssh/obedar -N ""
```

**Verejnú časť** (`obedar.pub`) nám pošlite — pridáme ju na server. Súkromná ostáva u vás, nikam sa neposiela.

**2. Nočné stiahnutie** — naplánovaná úloha, napríklad o 3:30

```
rsync -az -e "ssh -i /volume1/.ssh/obedar" \
      zaloha@46.225.236.143:/srv/zalohy/ \
      /volume1/zalohy/obedar/
```

Zámerne **bez `--delete`**: server si drží týždeň, NAS si má nechať históriu. Na Synology aj QNAP sa to zadá v *Plánovači úloh* ako používateľský skript; na linuxovom stroji je to riadok v `cron`.

**3. Upratovanie** — druhý riadok v tej istej úlohe

```
find /volume1/zalohy/obedar -name 'obedar-*.sql.gz' \
     -mtime +30 ! -name '*-01.sql.gz' -delete
```

Necháva **všetko z posledných 30 dní a navyše každý prvý deň mesiaca navždy**. Mesačná história tak vznikne sama, bez snímok a bez ďalšieho nastavovania. Dvanásť súborov ročne po pár megabajtoch je zanedbateľné, takže sa neoplatí ani mazať.

### Prečo nie jedna prepisovaná kópia

Toto je jediná vec, na ktorej záleží viac než na zvyšku: **musia to byť datované súbory, nie jedna kópia, ktorá sa každú noc prepíše.** Keby sa dáta poškodili a nikto si to dva dni nevšimol, prepísala by sa aj tá posledná dobrá — a záloha by bola presne tak pokazená ako originál.

### Účet na serveri

Vytvoríme účet `zaloha` s právom **len čítať ten jeden priečinok**. Z NAS-u sa na serveri nedá nič zmeniť ani zmazať, ani keby sa niekto k NAS-u dostal.

### Miesto

Rezerva **20 GB** je na roky dopredu. Reálne pôjde o jednotky MB denne.

### Keby to na NAS-e nešlo

Nie je to problém, len iný postup: zálohu bude **posielať server do úložiska u poskytovateľa** (Hetzner Storage Box, ~3 € mesačne) s prístupom, ktorý **smie len pridávať, nie mazať**. Zachová sa tým to podstatné — útočník na serveri zálohy nezmaže. Stačí povedať, ktorá z tých dvoch ciest je vám bližšia.

### Test obnovy — to už nie je vaša úloha

Raz za štvrťrok si zálohu obnovíme na prázdny server a pozrieme sa, či tam všetko je. **Záloha, z ktorej sa nikdy neskúšalo obnoviť, nie je záloha, ale pocit.** Robíme to my, ale je dobré, aby ste o tom vedeli.

---

## Zhrnutie

| | Čo | Blokuje? |
|---|---|---|
| 1 | schránka `obedy@ahafarma.sk` + SMTP údaje | ✅ hotové |
| 2 | firewall — port 465 otvorený a nasmerovaný | ✅ hotové, netreba meniť |
| 3 | DKIM podpisovanie odchádzajúcej pošty | ✅ potvrdené |
| 4 | **prístup k schránke pre dvoch ľudí** | ⬜ zostáva |
| 5 | **prístup na NAS pre sťahovanie záloh** | ⬜ až pred spustením |
