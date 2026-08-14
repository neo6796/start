# Nasadenie a zmeny

Ako sa appka dostane na server, ako sa mení, keď už beží, a čo zmena urobí s dátami.

---

## Najprv rozlíšme dve rôzne „na ostro"

| | Čo to je | Kedy | Riziko |
|---|---|---|---|
| **Preview naživo** | ten istý klikací súbor, ale na `obedy.ahafarma.sk` namiesto odkazu v chate | **hneď, do 20 minút** | žiadne — je to jeden statický súbor bez databázy |
| **Ostrá prevádzka** | appka s databázou, prihlasovaním a skutočnými objednávkami | až po Etape 2 | reálne, rieši ho zvyšok tohto dokumentu |

**Preview sa oplatí vyvesiť skoro.** Predáci si ho otvoria na telefóne, poklikajú maticu a povedia, čo je zle — a to je spätná väzba, ktorú z odkazu v chate nedostaneme. Nič sa neukladá, takže sa nedá nič pokaziť. Zároveň si tým **overíme HTTPS, doménu aj Caddy** skôr, než na tom bude čokoľvek závisieť.

---

## 1. Prvé nasadenie ostrej appky

Na serveri budú bežať tri kontajnery:

| Kontajner | Čo robí |
|---|---|
| **caddy** | prijíma HTTPS zvonku, vybaví certifikát od Let's Encrypt sám, posiela požiadavky appke |
| **app** | samotná aplikácia (Next.js) |
| **db** | PostgreSQL, dostupný **len zvnútra**, port 5432 sa navonok neotvára |

Celé nastavenie je jeden `docker-compose.yml` a jeden `Caddyfile`. Caddyfile je doslova toto:

```
obedy.ahafarma.sk {
    reverse_proxy app:3000
}
```

Certifikát, obnova certifikátu, presmerovanie z HTTP — to všetko si Caddy vybaví sám a nikdy sa k tomu nevraciame.

**Koľko to trvá:** pol dňa. Z toho vlastné spustenie appky je pätnásť minút; zvyšok je nastavenie tajomstiev a — hlavne — **overenie, že záloha naozaj funguje.**

### Tri veci, ktoré musia byť správne od prvého dňa

1. **Tajomstvá nie sú v gite.** SMTP kľúč, heslo k databáze a podpisovací kľúč pre prihlásenie žijú v súbore `.env` **na serveri**, ktorý sa do repozitára nikdy nedostane. Vytvorí sa ručne pri nasadzovaní.
2. **Záloha beží a obnova je vyskúšaná.** Nie „je nastavená" — *vyskúšaná*. Prvá obnova sa spraví hneď v deň nasadenia, na testovaciu kópiu. Záloha, z ktorej sa nikdy neskúšalo obnoviť, je len pocit bezpečia.
3. **Testovacia kópia existuje** (bod 3 nižšie). Bez nej sa každá zmena skúša na ostrých dátach, čo je presne to, čomu sa chceme vyhnúť.

---

## 2. Bežná zmena, keď už appka beží

Postup je vždy rovnaký a vojde sa do jedného príkazu na serveri:

```bash
./deploy.sh
```

Čo ten skript spraví:

```bash
#!/bin/bash
set -e                                    # pri prvej chybe skonči, nepokračuj

git pull                                  # 1. stiahni novú verziu
docker compose build app                  # 2. zostav ju
./backup.sh pred-nasadenim                # 3. ZÁLOHA DATABÁZY  ← toto je to dôležité
docker compose run --rm app npm run migrate   # 4. uprav databázu
docker compose up -d                      # 5. prepni na novú verziu
sleep 5
curl -fsS https://obedy.ahafarma.sk/health   # 6. overenie, že žije
```

**Trvanie:** dve až tri minúty, z toho väčšina je zostavovanie.
**Výpadok:** pár sekúnd, kým sa vymení kontajner. Nikto si toho nevšimne.

### Kedy nenasadzovať

Tomuto sa oplatí venovať pozornosť, lebo appka má dva okamihy, kedy na nej naozaj záleží:

| Čas | Prečo nie |
|---|---|
| **piatok 11:00 – 13:00** | týždenná uzávierka a odoslanie objednávok dodávateľom |
| **ráno 06:30 – 08:30** | denné odhlasovanie a korekcie |
| **prvé dni v mesiaci** | mesačná uzávierka a podklad pre mzdy |

Ideálny čas je **utorok alebo streda popoludní**. Nie preto, že by hrozila katastrofa — ale ak niečo nesadne, je čas to opraviť skôr, než to niekomu prekáža.

### Keď sa niečo pokazí

Návrat na predošlú verziu je rovnako rýchly ako nasadenie:

```bash
git checkout <predchádzajúci commit>
docker compose up -d --build
```

**Ale pozor:** vrátenie *kódu* je jednoduché, vrátenie *databázy* nie. Preto sa vraciame k migráciám v bode 4.

---

## 3. Testovacia kópia

**Postavená.** Púšťa sa jedným príkazom na serveri:

```bash
cd ~/obedar/deploy && ./test-kopia.sh
```

Rovnaký compose, vlastná databáza (`data/db-test`), vlastný port (`127.0.0.1:3010`). Bežné nasadenie sa jej nedotkne — služby sú v profile `test`, takže bez menovitého vyžiadania pre `deploy.sh` neexistujú. To je práve to, o čo ide: **na kópii beží nová verzia, kým na ostrej ešte stará.**

Prepínače:

| | |
|---|---|
| `./test-kopia.sh` | dáta z poslednej zálohy, mená nahradené za „Zamestnanec 4021" |
| `./test-kopia.sh --mena` | to isté, ale so skutočnými menami |
| `./test-kopia.sh --prazdna` | bez dát |

**Ako sa na ňu dostať.** Kým v `.env` nie je `TEST_DOMENA`, kópia počúva len na slučke a chodí sa na ňu tunelom — Caddy si teda ani nepýta certifikát pre adresu, ktorá ešte neexistuje:

```bash
ssh -N -L 8080:127.0.0.1:3010 root@server     # z vlastného počítača
# a potom http://localhost:8080
```

Keď na `test.obedy.ahafarma.sk` začne ukazovať DNS (jeden `A` záznam na tú istú adresu ako `obedy`), stačí do `.env` doplniť `TEST_DOMENA=test.obedy.ahafarma.sk` a certifikát aj HTTPS vybaví Caddy sám.

**Na každej obrazovke je červený pruh** „Testovacia kópia". Bez neho sa raz stane to horšie z dvoch: buď niekto zmení ostré dáta v presvedčení, že skúša, alebo hľadá chybu, ktorá „sa nedeje", lebo ju hľadá na kópii.

Naplní sa **kópiou ostrých dát** (z poslednej zálohy), takže sa na nej testuje proti skutočnému tvaru dát, nie proti vymyslenej vzorke. Tam, kde sa pracuje s osobnými údajmi, sa mená pri obnove nahradia — na test stačia „Zamestnanec 41".

Čo sa na nej robí:
- každá zmena, ktorá siaha na databázu,
- každá zmena okolo peňazí,
- pravidelný test obnovy zo zálohy — jedno použitie na dva účely.

Testovacia kópia **nesmie posielať e-maily a SMS.** Nemá nastavený SMTP, takže z nej neodíde nič a appka to na uzávierke rovno povie; znenie správy si aj tak prečítaš na obrazovke, lebo sa ukladá do databázy. Adresy jedální sa pri napĺňaní navyše prepíšu na `test@localhost`. Inak by sa raz stalo, že dodávateľ dostane skúšobnú objednávku a uvarí podľa nej.

---

## 4. Čo zmena urobí s databázou

Toto je jediná časť, kde sa dá spraviť škoda, ktorá sa nedá vrátiť tlačidlom.

### Migrácie sú kód

Každá zmena štruktúry databázy je **očíslovaný súbor v repozitári**. Databáza si vedie zoznam už spustených migrácií, takže sa každá vykoná práve raz a vždy v rovnakom poradí. Nasadenie tej istej verzie druhýkrát neurobí nič.

Znamená to aj, že testovacia kópia prejde presne tými istými krokmi ako ostrá — a ak tam migrácia prešla, na ostrej prejde tiež.

### Tri druhy zmien

| Druh | Príklady | Čo sa deje s dátami |
|---|---|---|
| **Bezpečné** | pridať tabuľku · pridať stĺpec, ktorý smie byť prázdny · pridať index | nič. Existujúce riadky sa nedotknú, appka beží ďalej |
| **Opatrné** | pridať povinný stĺpec · zmeniť typ stĺpca · pridať pravidlo jednoznačnosti | robí sa **v troch krokoch**: pridať prázdny → doplniť hodnoty → až potom sprísniť. Naraz by to spadlo na existujúcich riadkoch |
| **Deštruktívne** | zrušiť stĺpec · zrušiť tabuľku | **dáta sú nenávratne preč.** Len po zálohe, len vedome, a najlepšie o vydanie neskôr, než sa prestali používať |

### Pasca, na ktorú sa naozaj dá naletieť

**Premenovanie stĺpca.** Nástroj, ktorý migrácie generuje, to sám od seba nechápe ako premenovanie — vidí, že jeden stĺpec zmizol a iný pribudol, a vygeneruje `DROP` + `ADD`. Výsledok je prázdny nový stĺpec a zmazaný starý. Pri stĺpci s cenami by to znamenalo prísť o mesiace údajov.

Preto platí pravidlo bez výnimky:

> **Žiadna migrácia sa nespustí, kým ju človek neprečítal.** Nástroj ju navrhne, ja ju prečítam, a až potom ide do repozitára. Automatické „uprav databázu podľa modelu" sa na ostrom serveri nikdy nezapne.

### Riziková zmena v troch krokoch

Keď sa mení niečo, čo už obsahuje dáta, ide sa **rozšír → prenes → zúž**:

1. **Rozšír** — pridá sa nové vedľa starého, appka zapisuje do oboch. Stará verzia stále funguje.
2. **Prenes** — dáta sa prekopírujú, appka začne čítať z nového. Ak sa niečo pokazí, vraciame sa na starý stĺpec, ktorý je stále plný.
3. **Zúž** — až o vydanie neskôr, keď je jasné, že je všetko v poriadku, sa starý stĺpec zruší.

Zdĺhavé to je len na papieri. V praxi to znamená, že **v každom okamihu existuje cesta späť** — a to je celý zmysel.

---

## 5. Čo nás chráni

| Poistka | Čo pokrýva |
|---|---|
| **Záloha tesne pred migráciou** | je súčasťou `deploy.sh`, nedá sa na ňu zabudnúť |
| **Nočné snímky na NAS** | 30 denných + 12 mesačných, sťahuje si ich NAS (`docs/02`) |
| **Štvrťročný test obnovy** | jediný spôsob, ako vedieť, že zálohy naozaj fungujú |
| **Testovacia kópia** | migrácia beží na skutočných dátach skôr, než sa dotkne ostrých |
| **Zamknuté mesiace** | ↓ vysvetlenie nižšie |

**Zamknuté mesiace sú tá poistka, ktorá je vidieť najmenej a znamená najviac.** Preto koncept trvá na tom, že sa cena **odfotí na objednávku** (6.1) a uzavretý mesiac sa **zafixuje** (5.6). Dôsledok pre budúce zmeny je zásadný:

> Aj keby sme o rok prepísali celý výpočet príspevkov, **už uzavreté mesiace ostanú také, aké boli.** Nová logika sa dotkne len otvoreného mesiaca.

Bez toho by každá zmena v cenách či príspevkoch spätne prepísala minulosť a mzdové podklady by prestali sedieť s tým, čo sa kedysi odovzdalo. S tým sa dá appku meniť pokojne aj po rokoch.

---

## 6. Ako by to vyzeralo naozaj — miesta výdaja

Vezmime funkciu, ktorú sme práve navrhli (3.4), a predstavme si, že ju dopĺňame do bežiacej appky s tisíckami objednávok:

```sql
-- 1. nová tabuľka — nič existujúce sa nedotkne
CREATE TABLE miesto_vydaja (...);

-- 2. nový stĺpec, ktorý smie byť prázdny — nič sa nedotkne
ALTER TABLE osoba ADD COLUMN domovske_miesto_id INT NULL;

-- 3. doplnenie hodnôt — jeden príkaz
UPDATE osoba SET domovske_miesto_id = (SELECT id FROM miesto_vydaja WHERE skratka = 'VR');

-- 4. výnimka na konkrétny deň, prázdna hodnota = domovské miesto
ALTER TABLE objednavka_den ADD COLUMN miesto_id INT NULL;
```

**Žiadny existujúci riadok nemení význam. Žiadny výpadok. Nulové riziko.** Trvá to sekundy.

A nie je to náhoda — je to preto, že sme funkciu navrhli ako **domovské miesto + výnimka**, nie ako povinné pole pri každom dni. Keby bolo miesto povinné, museli by sme doplniť hodnotu do každej existujúcej objednávky a rozhodnúť, čo s tými, kde sa to nedá zistiť.

**Návrh, ktorý je zrozumiteľný pre používateľa, býva zhodou okolností aj ten, ktorý sa bezpečne nasadzuje.** Nie vždy, ale prekvapivo často.

---

## 7. Čo zámerne nerobíme

| Vec | Prečo nie |
|---|---|
| **Nasadenie bez sekundy výpadku** | pri stovke ľudí, ktorí appku otvoria trikrát za týždeň, je desaťsekundový výpadok neviditeľný. Zložitosť navyše by sa nikdy nevrátila |
| **Automatické nasadenie po každom commite** | pri jednom človeku, ktorý to spravuje, je vedomé spustenie `deploy.sh` lepšie než prekvapenie |
| **Kubernetes a spol.** | jeden server, tri kontajnery. Čokoľvek zložitejšie by sme spravovali namiesto toho, aby sme spravovali obedy |
| **Samostatný databázový server** | databáza vedľa appky je jednoduchšia, rýchlejšia a lacnejšia. Ak raz nebude stačiť, presunie sa — pri týchto počtoch to nenastane |

---

## 8. Odporúčanie k pilotu

Nespúšťať naraz pre celý závod. Poradie, ktoré dáva zmysel:

1. **Preview naživo** na `obedy.ahafarma.sk` — hneď, na spätnú väzbu od predákov.
2. **Ostrá appka, jeden tím a jeden dodávateľ**, dva týždne. Papierový hárok pritom beží ďalej ako doteraz — to je tá poistka, ktorá pilot robí nerizikovým. Porovnáva sa, či appka a papier dávajú rovnaké čísla.
3. **Zvyšok tímov**, keď dva týždne prejdú bez prekvapenia.
4. **Vypnutie starého postupu** až vtedy, keď si nikto nespomenie, kedy ho naposledy potreboval.

Appka to podporuje už z návrhu: pri spustení dostanú prístup **len predáci a admin** (rozhodnutie 15), stravníci až na požiadanie.
