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

## 2. Firewall — jedno pravidlo

Aplikácia beží na serveri v Nemecku, takže sa na váš mailový server musí dostať cez internet.

```
povoliť TCP 587 (alebo 465) zo zdroja 46.225.236.143
```

**Jedna adresa, jedno pravidlo, nulová expozícia navonok.** Neotvárajte port pre celý internet.

*(Toto je bod, ktorý v predchádzajúcej verzii zadania stálo „nerobiť". Vtedy sme počítali s externou službou. Teraz to potrebujeme.)*

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

## 4. Zálohovanie na firemný NAS

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

## Zhrnutie — štyri veci

| | Čo | Blokuje? |
|---|---|---|
| 1 | schránka `obedy@ahafarma.sk` + SMTP údaje + prístup pre dvoch | ✅ áno |
| 2 | firewall: TCP 587/465 zo zdroja `46.225.236.143` | ✅ áno |
| 3 | potvrdiť DKIM podpisovanie odchádzajúcej pošty | ✅ áno |
| 4 | prístup na NAS pre sťahovanie záloh | až pred spustením |

Prvé tri sú rádovo **pol hodiny práce**, jednorazovo.
