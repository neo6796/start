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

Zálohy sa ukladajú mimo hostingu. Dôležité je, **ktorým smerom to ide**:

> **NAS sa pripája na server a sťahuje si zálohu.** Nie server na NAS.

Dôvod: keby zálohu posielal server, musel by poznať prístup na NAS — a útočník, ktorý sa dostane na server, by zmazal aj zálohy. Pri sťahovaní pozná prístup len NAS a server o ňom nevie nič. Bonus: **NAS nemusí byť dostupný z internetu**, stačí mu odchádzajúce spojenie.

Čo treba na strane NAS:

- miesto na **datované snímky** (30 denných + 12 mesačných), nie na jednu prepisovanú kópiu,
- naplánovanú nočnú úlohu (`restic` alebo `borg` cez SSH na `46.225.236.143`),
- rezervu cca **20 GB** — pri deduplikácii to bude v praxi podstatne menej,
- **štvrťročný test obnovy.** Záloha, z ktorej sa nikdy neskúšalo obnoviť, nie je záloha.

Verejný SSH kľúč NAS-u pošlite a pridáme ho na server; alebo povedzte, či ho máme vygenerovať my.

---

## Zhrnutie

| | Čo | Blokuje? |
|---|---|---|
| 1 | schránka `obedy@ahafarma.sk` + SMTP údaje | ✅ hotové |
| 2 | firewall — port 465 otvorený a nasmerovaný | ✅ hotové, netreba meniť |
| 3 | DKIM podpisovanie odchádzajúcej pošty | ✅ potvrdené |
| 4 | **prístup k schránke pre dvoch ľudí** | ⬜ zostáva |
| 5 | **prístup na NAS pre sťahovanie záloh** | ⬜ až pred spustením |
