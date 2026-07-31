# Objednávanie obedov — koncept (v0.4)

Pracovný názov: **Obedár**
Rozsah: 50–100 stravníkov, 1–5 poskytovateľov stravy, interná firemná appka.
Stav: koncept. Nič sa nekóduje, kým nie je odsúhlasený tento dokument a následne klikací preview.

**Rozhodnuté:**
1. Predák za podriadených **objednáva, mení aj odhlasuje**.
2. Poskytovateľa **prideľuje admin pevne**, stravník si ho nevyberá.
3. Appka **rieši ceny aj podklad pre mzdové zrážky**.
4. **Bez zmien** — všetci obedujú v rovnakom režime.
5. Menu sa zadáva **spôsobom nastaveným per poskytovateľ** (ručne / import / prilepenie textu).
6. Príspevok zamestnávateľa je **nastavenie**, oba modely (percento aj pevná suma) sú v systéme; čísla potvrdí mzdové oddelenie.
7. **Väčšina stravníkov nemá firemný e-mail** → hlavné kanály sú predák a nástenka.
8. **Len slovenčina.**
9. Pribúda rola **superadmin**; adminov môže byť viac.
10. **Predák môže doobjednať aj v deň obeda** (do denného deadlinu), stravník už nie.
11. Stravníci appku pravdepodobne používať nebudú → **hlavným používateľom je predák**, papierové výstupy sú prvotriedna súčasť.
12. Zastupovanie predáka rieši **delegácia s obdobím + eskalácia na chýbajúce objednávky**, nie automatický reťazec.
13. **Bez 2FA.** Superadmin má heslo min. 12 znakov, obnova prístupu cez e-mail.
14. **Menu na budúci týždeň je známe do pondelka** → objednávacie okno Po–Pia 12:00 ostáva v plnom rozsahu.
15. Pri spustení dostanú prístup **len predáci a admin**, stravníci na požiadanie.
16. Zber volieb je **kombinovaný**: kto chce, objedná si sám v appke, zvyšok cez papierový zberný hárok.
17. **Push notifikácie pre predákov a admina** sú v MVP (Android hneď, iPhone po pridaní na plochu), pre stravníkov až neskôr.
18. **Názvy jedál sú voliteľné** — menu môže bežať len na `A/B/C`; namiesto písania sa dá pripnúť fotka, PDF alebo Word papierového menu, ktorý zároveň slúži ako dôkaz.
19. **Trvale prihlásený** je predvolené, s kratšou platnosťou pre admina a opätovným overením hesla pri zásahoch do peňazí.
20. **SMS zatiaľ nie** — pripraví sa len voliteľné pole „telefón", aby sa dala kedykoľvek zapnúť za pol dňa.
21. **Exporty, história a zálohy sú súčasťou MVP** (kapitola 7), vrátane kompletného exportu dát na jedno kliknutie. Grafy až vo fáze 3.
22. **Deň má tri stavy, nie dva** (4.6): nerozhodnuté · bez obeda · objednané. Upomienky a počítadlá pracujú len s nerozhodnutými.

> **Ťažisko appky:** nie je to appka pre stravníkov. Je to nástroj pre **predákov, admina a mzdy** — správne počty dodávateľovi, správna zrážka zo mzdy, dohľadateľnosť. Stravníkovi dáva menu na nástenke a možnosť objednať si sám, ak chce. Tak sa má aj navrhovať.

---

## 1. Roly a viditeľnosť

| Rola | Vidí | Môže |
|---|---|---|
| **Stravník** | seba | objednať/zmeniť do týždňového deadlinu, odhlásiť sa na deň do denného deadlinu, história a mesačný prehľad so sumou |
| **Predák** | seba + pridelených podriadených | za seba aj za každého podriadeného: objednať, zmeniť, odhlásiť na deň, hromadne odhlásiť rozsah dní (dovolenka, PN) |
| **Admin** (môže ich byť viac) | všetkých | plná konfigurácia, výnimky po deadline, cenník a príspevky, exporty, audit |
| **Superadmin** | všetkých | to čo admin + vytvára a ruší adminov, mení systémové nastavenia |
| *(voliteľne, fáza 3)* **Výdaj** | denný zoznam | odškrtnutie prevzatia obeda |
| *(voliteľne, fáza 3)* **Dodávateľ** | len svoje súhrny | stiahnutie denného počtu porcií |

Prideľovanie podriadených robí výhradne admin.

**Kto koho vytvára:** superadmin → adminov; admin → predákov a stravníkov. Nikto si nemôže zvýšiť vlastné oprávnenie a admin nemôže zrušiť ani upraviť superadmina.

**Reset PIN robí len admin**, vždy ako *dočasný PIN s vynútenou zmenou pri prvom prihlásení*, vždy so záznamom v audite a notifikáciou dotknutému. Inak by admin vedel potichu prevziať cudzí účet a tváriť sa ako on.

### 1.1 Predák — plné oprávnenie, ale s dohľadateľnosťou
Predák má nad svojím tímom rovnaké práva ako stravník nad sebou. Aby to nevytváralo spory, platí:
- každý zásah je v audit logu ako *„Novák J. (predák) zmenil objednávku pre Kováč P. — streda: B → A"*,
- podriadený dostane o zmene notifikáciu,
- predák **nevidí ani nemení** ceny a mzdové údaje podriadených, len objednávky.

Vedľajší efekt: ľudia bez smartfónu majú riešenie — objedná im predák.

### 1.2 Tím
Tím = entita s prideleným predákom, nie pole „nadriadený" na osobe.
Dôvod: výmena predáka je jedna zmena, nie 15 zmien.
Osoba patrí práve do jedného tímu. Osoba bez tímu = „Bez zaradenia", vidí ju len admin.

### 1.3 Zastupovanie predáka
Cieľ je jasný: **aby sa na nikoho obed nezabudlo.** Mechanizmus navrhujem trochu inak, než znel pôvodný nápad — s rovnakým výsledkom, ale bez slabého miesta.

**Poradie zástupcov ostáva:** admin určí každému predákovi usporiadaný zoznam zástupcov (1., 2., …). Zástupcom môže byť aj iný predák.

**Slabé miesto automatického reťazca:** aby systém sám posunul práva na zástupcu, musel by vedieť, že predák je preč. To appka nevie — nie je to dochádzkový systém. A človek odchádzajúci na dovolenku si nastavenie často nespraví, práve preto lebo sa ponáhľa.

**Riešenie — delegácia s obdobím + eskalácia na symptóm:**
1. Zastupovanie je vždy konkrétny záznam: *kto zastupuje koho, od–do*. Nastaví ho predák pred odchodom, **alebo kedykoľvek admin** — aj za predáka, ktorý odišiel bez nastavenia. Poradie zástupcov je predvyplnená ponuka, takže je to jedno kliknutie.
2. Delegácia sa **sama skončí** dátumom. Žiadne upratovanie, žiadne zabudnuté prístupy.
3. **Poistkou nie je reťazec, ale eskalácia na výsledok:** ak vo štvrtok popoludní tím nemá objednané, upozornenie ide predákovi. Ak v piatok ráno stále nemá, ide automaticky 1. zástupcovi **a adminovi**. Toto chytí aj prípad, na ktorý žiadny reťazec nestačí — predák je v práci, ale zabudol.
4. Zastupujúci vidí cudzí tím ako **samostatný blok** („Zastupujem: Tím Údržba, do 15. 8."), nie zliaty so svojím. Zlievanie tímov spôsobuje omyly typu „objednal som to tomu druhému Kováčovi".
5. Všetko je v audite ako *„Novák (zastupuje Kováča) objednal pre Horvátha"*.
6. Delegácia **nikdy neberie práva stravníkovi** — ten si môže objednať sám vždy, bez ohľadu na to, kto koho zastupuje.

Zástupca môže zastupovať aj viac tímov naraz (viac blokov pod sebou).

---

## 2. Prihlasovanie — posúdenie pôvodného návrhu

**Pôvodný návrh:** pole meno → drop-down pre admina a vedúcich → heslo/PIN.

**Neodporúčam**, z troch dôvodov:
1. **Bezpečnosť** — drop-down so zoznamom adminov a predákov zverejňuje na verejnej prihlasovacej stránke organizačnú štruktúru a rovno menuje privilegované účty. To je presne zoznam, ktorý útočník potrebuje.
2. **Zbytočný krok** — rola je vlastnosť účtu, nie voľba pri prihlásení. Systém po overení hesla sám vie, kto si.
3. **Chybovosť** — ľudia si vyberú zlú položku a hlásia „nedá sa prihlásiť".

### 2.1 Odporúčané riešenie
Jedna obrazovka, dve polia:

```
            [ logo ]
   Osobné číslo alebo prihlasovacie meno
   [________________________]
   PIN
   [________________________]
   [ ☑ Zapamätať toto zariadenie (60 dní) ]
   [      Prihlásiť sa      ]
   Zabudnuté PIN? Kontaktuj správcu — kl. 123
```

Pole je pre všetkých rovnaké, líši sa len **minimálna požiadavka na silu**:

| Rola | Prihlasovací secret | Prečo |
|---|---|---|
| **Stravník** | PIN, min. 4 číslice (odporúčam default 6, admin vie znížiť) | pamätateľné, numerická klávesnica, funguje v rukaviciach |
| **Predák** | min. 8 znakov | vidí a mení údaje iných ľudí |
| **Admin** | min. 10 znakov | konfigurácia, ceny, mzdové podklady |
| **Superadmin** | min. 12 znakov | vytvára a ruší adminov |

**Bez 2FA.** Appka ho mať nebude — pre nástroj na objednávanie obedov je to primerané rozhodnutie a ušetrí to všetkým otravu s aplikáciou v telefóne. Hashovanie hesiel (argon2id), zámky po neúspešných pokusoch a audit log platia rovnako.

#### Prečo pre predáka a admina heslo, a nie dlhý PIN
Desaťmiestne číslo si nikto nezapamätá. Skončí to buď na lístku pod klávesnicou, alebo to bude telefónne číslo či dátum narodenia — teda niečo, čo sa dá uhádnuť. Navyše 10 číslic má ~33 bitov entropie, kým 10 znakov s písmenami ~52 bitov: **dlhý PIN je slabší aj neprakticky zapamätateľný naraz.** Preto navrhujem heslo, pokojne ako tri slová (`modrykonpije`) — zapamätateľnejšie aj podstatne silnejšie. Kto chce, môže si zvoliť aj samé číslice, len ich musí byť dosť.

#### Prečo sú 4 číslice pre stravníka prijateľné — ale s poistkami
10 000 kombinácií znie málo. Pri uzamknutí účtu po 5 pokusoch na 15 minút je vyskúšanie všetkého otázka ~3 týždňov, čo online útok prakticky vylučuje. Skutočné riziko je iné: 10–15 % ľudí si zvolí `1234`, `0000`, `1111` alebo rok narodenia — a útočník skúsi ten istý PIN na všetkých 100 účtoch bez toho, aby ktorýkoľvek zamkol. Preto sú nutné tri veci:
- **zoznam zakázaných PIN-ov** (postupnosti, opakovania, rok narodenia, vlastné osobné číslo) — bez neho sú 4 číslice naozaj slabé,
- limit pokusov aj **na IP adresu**, nielen na účet,
- **audit log** — každá zmena je dohľadateľná a admin ju vie vrátiť.

Škoda z prelomeného účtu stravníka je „niekto mi zmenil obed z A na B" plus prípadné účtovanie neodhláseného jedla. S auditom a vratnosťou to je primerané riziko.

#### Ďalšie pravidlá
- **Účet bez prístupu do appky:** osoba môže existovať **úplne bez PIN-u** — objednáva za ňu predák, mzdový podklad ju zahŕňa normálne. PIN sa vydá len tomu, kto oň požiada. Pri spustení tak netreba rozdať 100 PIN-ov: appku dostanú do rúk predáci a admin, ostatní priebežne podľa záujmu.
- **Prvé prihlásenie:** admin vydá dočasný PIN, appka vynúti zmenu.
- **Reset:** len cez admina (e-mail netreba — väčšina ľudí ho nemá).
- **Ochrana:** 5 neúspešných pokusov → zámok na 15 minút, log pokusov, limit na IP.
- **Viac rolí naraz** (predák je aj stravník): po prihlásení prepínač v hlavičke `Moje obedy | Môj tím | Správa`. Nie pred prihlásením.

#### Trvale prihlásený
Áno, a odporúčam to mať zapnuté **predvolene** — človek, ktorý sa musí prihlasovať zakaždým, si appku neotvorí.

Technicky to nie je „nikdy sa neodhlásiť", ale dlhodobý token v bezpečnostnej cookie (`httpOnly`, `Secure`, `SameSite`), ktorý sa **pri každom použití obnoví**. Kto appku používa pravidelne, ostáva prihlásený donekonečna; kto ju rok neotvorí, sa prihlási znova.

Platnosť sa líši podľa toho, čo daný účet zmôže:

| Rola | Trvale prihlásený | Prečo |
|---|---|---|
| Stravník | áno, prakticky natrvalo | v stávke je zmena obeda z A na B |
| Predák | áno, obnova do 90 dní nečinnosti | vidí a mení údaje tímu |
| Admin / superadmin | áno, ale **30 dní** | ceny, mzdové podklady, správa účtov |

Poistky, ktoré k tomu patria:
- tlačidlo **„Odhlásiť sa na všetkých zariadeniach"** — prvá pomoc pri stratenom telefóne,
- admin vie **odhlásiť ktorýkoľvek účet** (odchod zamestnanca, požičaný mobil),
- zmena hesla alebo PIN-u **zruší všetky ostatné relácie**,
- pri citlivých úkonoch — **uzavretie mesiaca, zmena cenníka, zmena príspevkov** — si appka vypýta heslo znova, aj keď je používateľ prihlásený. Odomknutý mobil v šatni tak nestačí na zásah do mzdových podkladov.
- v profile je zoznam zariadení („iPhone, naposledy dnes 07:12"), aby bolo vidno, kde všade je účet prihlásený.

#### Obnova hesla cez e-mail
Kto má na účte vyplnený e-mail (admin, superadmin, prípadne predák), môže si heslo obnoviť sám. Ostatným ho resetuje admin.

- **E-mail je povinný údaj pre admina a superadmina** — je to ich jediná cesta späť, superadmin nad sebou nikoho nemá.
- Odkaz na obnovu: **platnosť 30 minút, jednorazový**, po použití sa odhlásia všetky ostatné relácie daného účtu.
- Limit na počet žiadostí o obnovu (aby sa schránka nedala zaspamovať).
- Každá obnova ide do audit logu a príde o nej informačný e-mail.
- Odkaz na obnovu **nikdy neprezradí, či daný účet existuje** — odpoveď je vždy rovnaká.

**Kde tým leží bezpečnosť:** ak sa heslo superadmina obnovuje cez schránku, tak kto ovláda tú schránku, ovláda celý systém — vrátane cenníka a mzdových podkladov. Tá schránka by teda mala byť dobre zabezpečená a nemala by byť zdieľaná (nie `info@`). Ak by sa neskôr ukázalo, že to je málo, dá sa doplniť vytlačený jednorazový kód do trezora bez zásahu do zvyšku systému.

### 2.2 Rozšírenia (fáza 3)
- **SSO cez Microsoft Entra ID / Google Workspace**, ak firma má účty pre všetkých → nulová správa hesiel. Návrh systému na to musí byť pripravený od začiatku.
- **Kiosk pri jedálni** (tablet): osobné číslo + PIN, automatický odhlas po 20 s nečinnosti.
- Čítačka firemných kariet (NFC) — len ak už existuje dochádzkový systém, z ktorého sa dá čítať.

---

## 3. Poskytovatelia stravy (catering)

Admin nastavuje **1 až 5** aktívnych poskytovateľov. Pre každého samostatne:

| Nastavenie | Hodnoty | Default |
|---|---|---|
| Názov, kontakt, e-mail na odosielanie objednávky | text | — |
| Počet jedál v ponuke | 1–10 | 3 |
| Číslovanie | `A,B,C` / `a,b,c` / `1,2,3` / `I,II,III` / `i,ii,iii` | `A,B,C` |
| Skladba jedla | `KOMPLET` (všetko v jednom) alebo `PO ČASTIACH` | KOMPLET |
| — ak PO ČASTIACH | polievka: nie/voliteľná/povinná; hlavné: povinné; dezert: nie/voliteľný/povinný | — |
| Denný deadline na odhlásenie | viď 4.2 | v deň obeda 07:30 |
| Doobjednanie predákom v deň obeda | áno/nie, dokedy, či aj zmena voľby (viď 4.3) | nie |
| Kapacita/deň (voliteľné) | max. počet porcií, prípadne limit na jedlo | bez limitu |
| Dni, kedy varí | Po–Pia (možno vypnúť konkrétny deň) | Po–Pia |
| Spôsob zadávania menu | ručne / import XLSX-CSV / prilepenie textu (viď 3.2) | ručne |
| Cenník | viď kapitola 6 | — |

**Číslovanie sa generuje automaticky z poradia** — admin len zvolí štýl. Názvy jedál sú voliteľné; ak chýbajú, zobrazí sa iba označenie („B"). Ak sú vyplnené, zobrazí sa `B — Vyprážaný syr, hranolky, tatárska`.

### 3.1 Pridelenie poskytovateľa stravníkovi
**Prideľuje výhradne admin.** Stravník si poskytovateľa nevyberá a predák ho meniť nemôže — rôzni poskytovatelia majú rôzne ceny, takže by to bol zásah do mzdového podkladu.

Osoba má **zoznam pridelených poskytovateľov**, spravidla jedného:

| Pridelené | Čo vidí stravník | Ako to vyzerá v bunke matice |
|---|---|---|
| **jeden** (odporúčaný default) | rovno ponuku jedál | jeden riadok, napr. `A B C ×` |
| **viac** | ponuku zoskupenú po poskytovateľoch | ponuky **pod sebou**, `A B C` / `1 2 3 4`, krížik na vlastnom riadku |

Model „jeden alebo viac" nestojí navyše nič v prípade, keď má každý jedného — obrazovka vyzerá presne tak ako doteraz. Zložitosť sa objaví len u ľudí, ktorí naozaj majú na výber.

**Krížik je vždy jeden, bez ohľadu na počet poskytovateľov.** „Nechcem obed" je rozhodnutie o dni, nie o dodávateľovi — „nechcem od U Jeleňa, ale možno od Severu" nedáva zmysel. Pri jednom poskytovateľovi visí na konci jeho riadku, pri viacerých má vlastný riadok naspodku, aby bolo vidieť, že nepatrí ani jednej jedálni.

> **Ak sa prideľuje viac poskytovateľov, dajte každému iný typ číslovania.** Práve na to je to nastavenie dobré: keď má U Jeleňa `A B C` a Sever `1 2 3 4`, je „áčko" a „trojka" jednoznačné v celom závode. Ak by mali obaja `A B C`, stravník aj predák vidia dve rôzne „áčka" a musí sa k nim dopisovať meno dodávateľa. Appka na zhodné číslovanie dvoch aktívnych poskytovateľov upozorní.

- Pridelenie je vlastnosť **osoby**, nie tímu (človek môže prejsť do iného tímu bez zmeny stravy), ale admin má nástroj *„prideliť celému tímu naraz"*.
- **Zmena poskytovateľa platí od najbližšieho neuzamknutého týždňa.** Už uzamknuté týždne sa nemenia — dodávateľ má počty odoslané.
- Pri deaktivácii poskytovateľa appka upozorní *„27 stravníkov nemá poskytovateľa"* a ponúkne hromadný presun.
- Nový zamestnanec bez prideleného poskytovateľa nemôže objednávať a je v zozname „na doriešenie".

**Ak sú v jednom tíme ľudia od rôznych poskytovateľov**, matica predáka ich zvládne v jednej tabuľke: každý riadok ponúka **označenia svojho poskytovateľa** (jeden má `A B C`, druhý `1 2 3 4`) a pri osobnom čísle sa zobrazí značka poskytovateľa. Predák nikam neprepína a nemôže omylom objednať jedlo, ktoré daný človek nemôže dostať.

### 3.2 Zadávanie menu — každý poskytovateľ inak
Menu chodí od každého dodávateľa v inej podobe, preto je spôsob zadávania **nastavenie poskytovateľa**:

| Spôsob | Ako to funguje | Kedy |
|---|---|---|
| **Ručne** (vždy dostupné) | týždenný editor 5 dní × N jedál, tlačidlo *kopírovať minulý týždeň*, našepkávač už použitých názvov | menu chodí papierom, telefonicky alebo v tele e-mailu |
| **Import XLSX/CSV** | admin nahrá súbor, appka predvyplní menu, admin skontroluje a potvrdí; mapovanie stĺpcov sa uloží pre daného dodávateľa | dodávateľ posiela tabuľku |
| **Prilepenie textu** | admin skopíruje menu do textového poľa, appka sa pokúsi rozpoznať dni a jedlá, admin opraví a potvrdí | menu chodí ako PDF alebo v tele e-mailu |

Spoločné pravidlo: **žiadny import sa neuloží bez potvrdenia človekom.** Rozpoznávanie zlyhá vždy, keď dodávateľ zmení formát, a nepovšimnutá chyba v menu znamená zlé počty pre kuchyňu.

Ručný editor musí byť dobrý, lebo je to fallback pre všetkých. Pri 3 jedlách × 5 dní × 2 dodávateľov je to ~5 minút týždenne — import sa oplatí až pri väčších ponukách.

**Do MVP ide ručný editor + kopírovanie minulého týždňa.** Import a prilepenie textu prídu ako druhý krok, keď uvidíme reálne súbory od konkrétnych dodávateľov — bez vzorky by som ich robil naslepo.

### 3.3 Menu bez názvov jedál — plnohodnotný režim
Názvy jedál sú **vždy voliteľné**. Admin môže zadať len počet jedál a appka pracuje čisto s označením (`A`, `B`, `C` / `1`, `2`, `3` / …). Vypĺňanie „bravčový rezeň s broskyňou" nikto nevynucuje.

Ako to funguje v praxi:

| | Bez názvov | S názvami |
|---|---|---|
| Zadanie menu adminom | nastaví sa raz, ďalej sa nerobí nič | ~5 min týždenne |
| Na nástenke | **papierové menu od dodávateľa** | tlač z appky (5.4) |
| Objednávka v appke | tlačidlá `A` `B` `C` | `B — Vyprážaný syr, hranolky` |
| Zberný hárok | funguje rovnako | funguje rovnako |
| Podklad dodávateľovi | funguje rovnako | funguje rovnako |
| Mzdy a ceny | funguje rovnako | funguje rovnako |

**Jediné, čo bez názvov nefunguje:** človek objednávajúci si cez víkend z domu nevie, čo je `B`. A pri reklamácii („objednal som B a dostal niečo, čo nejem") neexistuje záznam, čo `B` v ten deň bolo.

**Riešenie bez písania — príloha týždňa:** admin odfotí papierové menu od dodávateľa telefónom a nahrá ho k danému týždňu (alebo pripne súbor, ktorý prišiel mailom). V appke sa pri výbere jedla objaví tlačidlo *„zobraziť menu"*. Trvá to desať sekúnd, nič sa neprepisuje, a obe uvedené nevýhody padajú. **Toto je predvolený spôsob** pre toho, komu sa nechce písať.

#### 3.3.1 Príloha menu — formáty a spracovanie
Prijímame všetko, čo reálne chodí, a všetko sa zobrazí **priamo v appke** bez sťahovania:

| Formát | Spracovanie |
|---|---|
| Fotka z telefónu (JPG, PNG, **HEIC** z iPhonu) | HEIC sa prevedie na JPEG (inak ho prehliadač nezobrazí), narovná sa podľa EXIF orientácie, zmenší sa na rozumné rozlíšenie pre mobilné dáta a originál sa uchová |
| PDF | zobrazí sa priamo |
| **Word (.docx), Excel (.xlsx)** | prevedú sa na PDF na serveri, aby sa dali otvoriť aj na telefóne — stiahnutie `.docx` do mobilu je pre používateľa slepá ulička |

Prevod Office → PDF si vyžiada LibreOffice v serverovom obraze (~200 MB navyše). Za to, že admin nemusí nič prekonvertovávať a stravník nemusí nič sťahovať, to stojí.

#### 3.3.2 Príloha ako dôkaz
Aby príloha slúžila ako dôkaz, musí byť **nemenná a datovaná**:

- príloha je viazaná na **konkrétny týždeň a poskytovateľa**, nie na „aktuálne menu",
- pri nahradení sa stará verzia **nemaže, len archivuje** — vidno, kto ju nahral a kedy,
- **objednávka odkazuje na tú verziu prílohy**, ktorá platila v čase jej vzniku (rovnaký princíp ako odfotenie ceny v 6.1),
- prílohy sa uchovávajú spolu s objednávkami podľa účtovných lehôt.

Tým vzniká úplná reťaz pri spore: **príloha** hovorí, čo `B` v ten týždeň bolo · **audit log** hovorí, kto objednávku zadal a kedy · **zberný hárok** hovorí, podľa čoho ju zadal.

Ďalšie uľahčenie pre tých, čo názvy vypĺňať chcú: **našepkávač z histórie.** Dodávatelia väčšinou rotujú jedlá v cykle, takže po pár týždňoch stačí napísať „vypráž" a zvyšok sa doplní. Plus tlačidlo *kopírovať minulý týždeň*.

Nastavenie je per poskytovateľ aj per týždeň — jeden dodávateľ môže mať názvy, druhý len písmená, a v týždni, keď sa adminovi nechce, sa jednoducho nevyplnia. Appka si nikdy nepýta niečo, bez čoho vie fungovať.

---

## 4. Termíny a uzávierky

Všetky časy v zóne **Europe/Bratislava**, v databáze UTC. Deadline platí na sekundu (12:00:00).

### 4.1 Týždenná objednávka
- Menu na týždeň **W+1** sa otvára v **pondelok 00:00 týždňa W**.
- Uzatvára sa v **piatok 12:00 týždňa W** (admin mení deň aj čas).
- Po uzávierke je týždeň **zamknutý** — nedá sa meniť voľba jedla, dá sa už len **odhlásiť na deň** (bod 4.2).
- Admin môže voliteľne otvoriť dlhší horizont (napr. 4 týždne dopredu, ak je menu známe) — každý týždeň sa zamkne vo svojom termíne. Užitočné pred dovolenkami.
- **Doobjednanie po uzávierke:** pre stravníka zakázané. Pre predáka je to nastavenie poskytovateľa — viď 4.3.

**Závislosť na menu:** okno je použiteľné len vtedy, keď je menu zadané. Dodávatelia ho posielajú tak, aby bolo do pondelka známe, takže plné päťdňové okno drží. Poistky:
- ak menu na budúci týždeň v pondelok ráno chýba, admin dostane upozornenie,
- kým menu nie je zadané, stravník aj predák vidia „*menu na budúci týždeň ešte nie je zverejnené*", nie prázdny týždeň,
- ak menu mešká, admin môže uzávierku pre daný týždeň jednorazovo posunúť.

### 4.2 Denné odhlásenie
Pravidlo sa nastavuje **per poskytovateľ**, tvar:

```
odhlásenie na deň D je možné najneskôr do:
   [v deň obeda | predchádzajúci pracovný deň | 2 pracovné dni vopred]  o  [HH:MM]
```

Príklady:
- Poskytovateľ A: *v deň obeda 07:30* (default) → obed v stredu sa dá zrušiť do stredy 07:30.
- Poskytovateľ B: *predchádzajúci pracovný deň 14:00* → obed v stredu do utorka 14:00; **obed v pondelok do piatku 14:00** (preskakuje víkend aj sviatok).

Používateľovi sa nikdy nezobrazí len „07:30", ale konkrétny dátum a čas + odpočet („*ostáva 4 h 12 min*"). Nejednoznačnosť tu spôsobuje reklamácie.

### 4.3 Kto čo môže a kedy
Dva deadliny × role. Predák má v poslednom okne viac práv než stravník — presne tak, ako to bolo navrhnuté:

| | Do týždennej uzávierky (Pia 12:00) | Medzi ňou a denným deadlinom | Po dennom deadline |
|---|---|---|---|
| **Stravník** | objedná, zmení, odhlási | **len odhlási** | — |
| **Predák** (za seba aj tím) | objedná, zmení, odhlási | **odhlási + doobjedná + zmení** | — |
| **Admin** | všetko | všetko | výnimka s dôvodom (4.5) |

**Doobjednanie predákom je nastavenie poskytovateľa, nie automatika** — dodávateľ už má počty a musí s tým súhlasiť. Per poskytovateľ sa nastaví:
- `predák môže doobjednať na daný deň` áno/nie,
- dokedy (default = rovnaký čas ako denný deadline na odhlásenie),
- či môže aj **meniť** voľbu (A→B), alebo len **pridať** chýbajúcu objednávku.

V praxi sa storná a doobjednávky často vyrušia, preto appka pošle dodávateľovi v momente denného deadlinu **korekčný súhrn**:

> *pôvodne 47 · storná 3 · doobjednávky 2 → **46** · zmeny v skladbe: A −1, B +1*

Je to presne to, čo dnes predák vybavuje telefonátom do kuchyne — len písomne a dohľadateľne.

Obmedzenia doobjednávky: len z jedál, ktoré sú v ten deň v menu, a v rámci kapacity dodávateľa, ak je nastavená. Doobjednaný obed podlieha rovnakej politike účtovania ako v 6.4.

**Treba overiť u dodávateľov:** či doobjednanie v deň obeda vôbec akceptujú a dokedy. Je to obchodná dohoda, nie technická otázka — appka ju len vykoná. Ak niektorý dodávateľ nesúhlasí, u neho sa to jednoducho nezapne.

### 4.4 Kalendár neobedových dní
- Slovenské štátne sviatky (predvyplnené, ročne aktualizované).
- Celozávodná dovolenka / odstávka — admin uzavrie rozsah dní.
- Jednorazové zatvorenie („dodávateľ nevarí 14. 8.") — admin, s automatickou notifikáciou dotknutým a hromadným zrušením objednávok bez účtovania.

### 4.5 Výnimky po deadline
Admin (a len admin) môže zrušiť objednávku aj po termíne — povinne s dôvodom a s príznakom **„účtovať napriek odhláseniu"** (áno/nie), lebo dodávateľ už porciu uvaril. Bez tohto poľa sa účtovanie rozíde s realitou. Viď aj 6.4.

### 4.6 Tri stavy dňa
Deň každého stravníka je v jednom z troch stavov. Systém ich musí **rozlišovať**, inak chodia upomienky ľuďom, ktorí sa už rozhodli, a predák naháňa niekoho, kto je na dovolenke.

| Stav | Čo znamená | Záznam | Počíta sa medzi chýbajúce | Ide dodávateľovi |
|---|---|---|---|---|
| **Nerozhodnuté** | nikto sa nevyjadril — východiskový stav | žiadny | **áno** | nie |
| **Bez obeda** `×` | vedomé rozhodnutie: dovolenka, služobka, nechce jesť | `BEZ_OBEDA` | **nie** | nie |
| **Objednané** `A/B/C` | zvolené jedlo | `OBJEDNANÉ` | nie | **áno** |

Čo z toho plynie:
- **Upomienky (kapitola 8) chodia len na nerozhodnuté dni.** Kto má krížik, je vybavený a nikto ho neotravuje.
- **Počítadlo predáka aj zoznam chýbajúcich krížiky ignorujú.**
- **Hromadné odhlásenie na dovolenku** nastaví celý rozsah dní na *bez obeda*, nie na prázdno — práve preto, aby na tie dni nechodili výzvy.
- **Po týždennej uzávierke má prechod na *bez obeda* iný význam:** to už nie je voľba, ale **odhlásenie** (`ODHLÁSENÉ`), lebo dodávateľ počet dostal. Stav vyzerá rovnako, líši sa história — a tá rozhoduje o účtovaní (6.4). Audit log tieto dva prípady odlišuje.
- **Nerozhodnuté dni v momente uzávierky** ostávajú nerozhodnuté: dodávateľovi sa neposielajú a človek obed nemá. V zozname po uzávierke sú viditeľné, aby bolo jasné, kto vypadol.

Na obrazovke platí jedno pravidlo: **podfarbenie bunky znamená akciu.** Kde nikto nekonal, nie je podfarbenie žiadne — bunka je čistá a jej možnosti len bledo orámované. Až voľba bunku zafarbí, a farba hovorí, **kto ju urobil**:

| Podklad | Význam |
|---|---|
| **žiadny** | nikto nekonal — bez voľby |
| **zelenkavý** | zadal si stravník sám v aplikácii |
| **modrozelenkavý** | zadal predák za neho |

Rozlíšenie „sám / predák" nie je ozdoba: pri spore je hneď vidieť, či si voľbu urobil človek sám, alebo mu ju niekto zadal — a to je prvá otázka, ktorá pri reklamácii padne. Podrobnosti (kto presne a kedy) sú v audit logu.

Vnútri bunky sa rozhodnutie vyplní: označenie jedla horčicovo, *bez obeda* tmavým krížikom.

Diery sa tak hľadajú ako **nezafarbené miesta**. Pomáhajú aj:
- **počítadlo dní bez voľby** pri mene v riadku,
- tlačidlo **„Zvýrazniť nerozhodnuté"**, ktoré prázdne bunky pred uzávierkou rozsvieti.

Na zbernom hárku platí to isté pravidlo: prázdne políčko znamená „nevyjadril sa", `×` znamená „nechcem obed".

---

## 5. Obrazovky

Poradie dôležitosti je dané tým, kto appku reálne otvorí: **matica predáka (5.2) je najdôležitejšia obrazovka celého systému**, hneď za ňou admin (5.3) a papierové výstupy (5.4). Obrazovka stravníka (5.1) je jednoduchá a lacná, robíme ju pre tú menšinu, ktorá ju používať bude — a tá časom porastie.

### 5.1 Stravník (mobile-first)
1. **Budúci týždeň** — hlavná obrazovka. 5 kariet Po–Pia, každá ukazuje voľbu alebo „neobjednané". Hore odpočet do uzávierky. Ťuk na deň → zoznam jedál môjho poskytovateľa → ťuk na jedlo → uložené (bez tlačidla „Potvrdiť", ukladá sa priebežne, s undo).
2. **Tento týždeň** — len na čítanie + tlačidlo *Odhlásiť sa* pri dňoch, kde ešte beží denný deadline.
3. **Kopírovať minulý týždeň** — jedno tlačidlo, doplní rovnaké voľby (ak dané jedlo v novom menu neexistuje, nechá deň prázdny a označí ho). Pri 100 ľuďoch to je rozdiel medzi „appka funguje" a „appka nefunguje".
4. **Môj prehľad** — mesiac, počet obedov, cena spolu, príspevok zamestnávateľa, **koľko mi ide zo mzdy**.
5. **Profil** — zmena PIN, notifikácie, jazyk.

### 5.2 Predák — „Môj tím" (hlavná obrazovka systému)
Keďže objednávky za väčšinu ľudí zadáva predák, toto nie je prehľad — **je to zadávacia obrazovka** a musí zvládnuť 20 ľudí za dve minúty.

Matica **ľudia × dni** (riadky = podriadení, stĺpce Po–Pia). V bunke sú **všetky dostupné jedlá vedľa seba** plus krížik „nechce obed" — voľba je jeden klik, nie preklikávanie dokola, a zároveň je vidieť, z čoho sa vyberá.
- **podfarbenie bunky = akcia** (4.6): bez podfarbenia = nikto nekonal · zelenkavé = zadal si stravník sám · modrozelenkavé = zadal predák
- vnútri bunky: vyplnené označenie = objednané · vyplnený krížik = bez obeda
- opätovný klik na zvolenú možnosť ju zruší a bunka sa vráti na nezafarbenú
- hore: *„3 ľudia nerozhodnutí, uzávierka o 5 h"* — krížiky sa nepočítajú
- počítadlo dní bez voľby pri mene + tlačidlo *Zvýrazniť nerozhodnuté* na kontrolný prechod pred uzávierkou
- **prepis z papiera musí byť bleskový:** šípky vľavo/vpravo prechádzajú medzi možnosťami, medzerník volí; alebo priamo `A`/`B`/`C` pre jedlo, `0` pre krížik, `Backspace` pre návrat na nerozhodnuté — kurzor sám skočí na ďalšieho človeka v tom istom dni, šípky hore/dole tiež. Bez myši, bez dialógov, bez potvrdzovania. Toto je jediná vec, ktorá rozhodne, či predáka appka baví alebo otravuje.
- pri ponuke nad šesť jedál sa možnosti v bunke zalomia do dvoch riadkov, tabuľka sa nerozbije
- na tablete to isté prstom: dosť veľké dotykové plochy priamo v riadku
- hromadné akcie: kopírovať minulý týždeň celému tímu, nastaviť celý riadok na jedno jedlo, hromadné odhlásenie na rozsah dní (dovolenka/PN)
- tlač: zberný hárok, zoznam chýbajúcich, potvrdenie tímu (5.4)
- **zastupované tímy** ako samostatné bloky pod vlastným tímom, zreteľne odlíšené (1.3)
- v deň obeda sa v riadku dnešného dňa objaví možnosť **doobjednať** (ak to poskytovateľ dovoľuje, 4.3)

### 5.3 Admin
Poskytovatelia · Cenník a príspevky · Menu (týždenný editor, kopírovanie predchádzajúceho týždňa) · Používatelia, tímy a zástupcovia · Termíny a sviatky · Zostavy a exporty · Mesačná uzávierka · Audit log · Notifikácie.

Navyše **prehľad stavu pred uzávierkou**: ktoré tímy majú koľko chýbajúcich objednávok, zoradené od najhoršieho. Admin tak vidí, kde treba zavolať predákovi — alebo že predák je preč a treba delegovať.

### 5.4 Papierové výstupy — plnohodnotná súčasť, nie doplnok
Ak väčšina ľudí appku neotvorí, papier nie je ústupok — je to **hlavný kanál k stravníkovi**. Všetko na jedno kliknutie, A4/A3, veľké písmo, čitateľné z dvoch metrov:

1. **Menu na nástenku** — budúci týždeň, per poskytovateľ, s označením jedál (A/B/C) a cenou. Generuje sa hneď po zadaní menu. *(Má zmysel len ak sú vyplnené názvy — bez nich ide na nástenku papierové menu od dodávateľa, viď 3.3.)*
2. **Zberný hárok** — tím v riadkoch, Po–Pia v stĺpcoch. Vytlačí sa, zavesí vedľa menu, ľudia si voľbu zapíšu perom, predák ju prepíše do appky. Takto to bude v skutočnosti fungovať, tak nech to appka podporuje priamo.
   **Kombinovaný zber:** kto si už objednal sám v appke, má voľbu na hárku **predtlačenú sivou** a políčko prečiarknuté — aby ju nikto nezapisoval druhýkrát a predák nemusel rozmýšľať, čo je nové. Hárok sa dá vytlačiť kedykoľvek počas týždňa a vždy ukazuje aktuálny stav.
3. **Potvrdenie tímu po uzávierke** — čo má kto objednané. Zavesí sa vedľa menu, aby si to ľudia mohli skontrolovať skôr, než bude neskoro.
4. **Denný zoznam pre výdaj** — kto má dnes čo, zoradené podľa priezviska.
5. **Zoznam chýbajúcich objednávok** — pre predáka pred uzávierkou.

Zberný hárok má aj druhý účel: je to **dôkaz**. Keď objednávky zadáva predák, spor „ja som chcel B" padá na neho — a papier s vlastnoručne zapísanou voľbou ten spor ukončí. Audit log povie, kto to zadal; hárok povie, podľa čoho.

---

## 6. Ceny, príspevky a mzdy

Toto je vrstva, ktorá appku spája s účtovníctvom, a zároveň jediná časť, kde chyba stojí peniaze. Preto:

### 6.1 Cenník
- Cena je vlastnosť **položky menu** (jedlá jedného poskytovateľa môžu mať rôznu cenu; polievka a dezert majú vlastnú cenu, ak sa objednávajú samostatne).
- Cenník má **platnosť od dátumu**. Zmena ceny nikdy nemení už uzamknuté týždne.
- **Cena sa odfotí na objednávku** v momente zamknutia týždňa. Retroaktívna zmena cenníka nesmie prepísať históriu — inak sa mesačná uzávierka rozíde s tým, čo ľudia videli.
- Všetky sumy sú v **centoch ako celé čísla**, nikdy `float`. Zaokrúhľovanie definované na jednom mieste.

### 6.2 Príspevky
V systéme budú **oba modely** ako nastavenie (per poskytovateľ alebo globálne), aby sa dalo prepnúť bez zásahu do kódu:

| Zložka | Model |
|---|---|
| Príspevok zamestnávateľa | **percento z ceny jedla** (Zákonník práce žiada min. 55 %) **alebo** **pevná suma na obed**, v oboch prípadoch s voliteľným **stropom** naviazaným na hodnotu stravného pri pracovnej ceste 5–12 h |
| Príspevok zo sociálneho fondu | pevná suma na obed (voliteľné, môže byť 0) |
| **Doplatok zamestnanca** | `cena − príspevok ZL − sociálny fond` → **suma na zrážku zo mzdy** |

Percentá, sumy a strop sú **nastavenia, nie konštanty v kóde** — zákonné limity a hodnota stravného sa menia opatrením MPSVR aj niekoľkokrát ročne. Nastavenie má platnosť od dátumu, rovnako ako cenník (6.1).

#### Čo treba potvrdiť s mzdovým oddelením pred spustením
- [ ] percento alebo pevná suma, a v akej výške
- [ ] či sa uplatňuje strop a aký
- [ ] či sa prispieva aj zo sociálneho fondu a koľko
- [ ] ako sa zaokrúhľuje (na cent, matematicky/nadol)
- [ ] politika neodhlásených obedov (6.4)
- [ ] formát, v akom mzdový softvér vie načítať export (6.3)
- [ ] dokedy v mesiaci musí byť podklad odovzdaný → z toho vyplynie termín mesačnej uzávierky

Do preview dám obe varianty vedľa seba s modelovými číslami, aby sa mzdár mohol pozrieť a povedať, ktorá sedí.

### 6.3 Mesačná uzávierka a export
- Admin **uzavrie mesiac** → čísla sa zafixujú, ďalšie zmeny len ako opravná položka v ďalšom mesiaci (aby sa nemenil už odovzdaný podklad pre mzdy).
- **Export pre mzdy** (XLSX/CSV): osobné číslo, meno, stredisko/tím, počet obedov, cena spolu, príspevok ZL, sociálny fond, **zrážka zo mzdy**. Formát doladíme podľa toho, čo vie načítať mzdový softvér.
- **Kontrola faktúry dodávateľa**: mesačný súhrn per poskytovateľ — počet porcií × cena, na porovnanie s faktúrou. Nezriedka sa nezhodujú a bez tohto listu sa to nedá ustrážiť.

### 6.4 Neodhlásené obedy
Ak sa človek neodhlási včas a obed si neprevezme, porcia je uvarená a vyfakturovaná. Politika je **nastavenie**:
- `účtovať zamestnancovi v plnej cene bez príspevku ZL` (najčastejšie),
- `účtovať štandardne s príspevkom`,
- `neúčtovať` (znáša firma).

To isté pravidlo sa použije pri odhlásení po termíne cez admina (4.5) aj pri doobjednávke predáka (4.3).

---

## 7. Výstupy, história a zálohy

### 7.1 Zásady
- **XLSX je primárny formát** — účtovníci žijú v Exceli. V ňom sú **dátumy dátumami a sumy číslami**, nie textom; inak sa v exporte nedá počítať a je na nič.
- **CSV v UTF-8 s BOM a bodkočiarkou** ako oddeľovačom. Bez toho Excel v slovenskom prostredí rozsype diakritiku aj stĺpce — je to drobnosť, ktorá kazí polovicu exportov na svete.
- **PDF** na tlač a odosielanie dodávateľom.
- Každý export má hlavičku: obdobie, dátum vygenerovania, kto ho vygeneroval.
- Každý export sa zapíše do auditu — pri osobných údajoch treba vedieť, kto aký zoznam stiahol.
- **Čo je na obrazovke, to sa dá exportovať.** Žiadna zostava, z ktorej sa dáta musia opisovať ručne.

### 7.2 Prevádzkové výstupy
| Výstup | Komu | Kedy | Formát |
|---|---|---|---|
| Objednávka — počty na jedlo (`A: 12, B: 7, C: 3`) | dodávateľovi | automaticky pri týždennej uzávierke | PDF + XLSX, e-mailom |
| Korekčný súhrn (storná a doobjednávky, 4.3) | dodávateľovi | pri dennom deadline | PDF, e-mailom |
| Denný zoznam pre výdaj | jedálni | ráno | PDF |
| Zberný hárok, potvrdenie tímu, zoznam chýbajúcich (5.4) | predákovi | na požiadanie | PDF |

### 7.2.1 Automatické odosielanie dodávateľom
Nastavuje **admin, samostatne pre každého poskytovateľa**:

| Nastavenie | Poznámka |
|---|---|
| **E-mailové adresy** | viac adries (kuchyňa + fakturácia). Kópia chodí vždy adminovi, aby existoval ľudský svedok. |
| **Odstup od uzávierky** | *hneď · +30 min · +1 h · +2 h*. Skorší čas nedáva zmysel — pred uzávierkou počty ešte nie sú konečné. |
| **Posielať korekciu aj bez zmien** | áno/nie. Odporúčam áno: mlčanie je nejednoznačné, kuchyňa nevie, či sa nič nezmenilo, alebo appka spadla. |

**Časy sa počítajú z uzávierok daného poskytovateľa, nie z pevného rozvrhu.** To je dôvod, prečo to musí byť per poskytovateľ: kto má odhlasovanie *v deň obeda o 07:30*, dostane korekciu ráno na ten istý deň; kto má *predchádzajúci pracovný deň o 14:00*, dostane ju poobede na nasledujúci pracovný deň. „Ráno po dennej uzávierke" teda platí len pre časť dodávateľov.

**V tele e-mailu sú počty aj ako čistý text**, nielen v prílohe — kuchyňa ho číta na telefóne a otvárať PDF je zbytočná prekážka. PDF a XLSX sú priložené pre archív a účtovníctvo.

#### Čo o doručení e-mailu naozaj vieme
Toto treba povedať na rovinu, lebo na tom stojí celá poistka: **že si e-mail niekto prečítal, sa spoľahlivo zistiť nedá.**

| Čo | Vieme? | Poznámka |
|---|---|---|
| Odoslanie zlyhalo (spojenie, odmietnutie) | **áno, isto** | server dodávateľa správu neprijal — okamžite a jednoznačne |
| Odraz *(bounce)* — plná schránka, neexistujúca adresa | **áno** | vráti sa notifikácia; treba sledovanú návratovú adresu alebo odosielaciu službu s webhookmi |
| Poštový server dodávateľa správu prijal | **áno** | ale to je maximum — hovorí o serveri, nie o človeku |
| Správa skončila v spame | **nie** | nezistiteľné |
| Človek ju otvoril | **prakticky nie** | otváracie pixely blokuje väčšina klientov a sú aj neslušné; žiadosť o potvrdenie prečítania takmer nikto nepotvrdí |

Preto je v prehľade **stav odoslania a potvrdenie dodávateľa oddelene** — sú to dve rôzne veci a zlievať ich do jedného „doručené" by bolo klamlivé.

#### Riešenie: aktívne potvrdenie namiesto detekcie
- V objednávke je odkaz **„Potvrdiť prijatie"** — jeden klik, bez prihlásenia, jednorazový token.
- Admin nastaví **per poskytovateľ, do kedy potvrdenie čakať** (nevyžadovať / 30 min / hodina / dve).
- Ak potvrdenie nepríde včas, appka **eskaluje**: SMS dodávateľovi a upozornenie adminovi „Sever nepotvrdil objednávku, zavolajte im".
- Neisté *„asi to dorazilo"* sa tým mení na jednoznačné *„potvrdili o 12:07"* — a to je zároveň **dôkaz pri spore o počty**.

#### Ostatné poistky
- appka **zaznamená každé odoslanie** so stavom a admin ho vidí v prehľade,
- pri zlyhaní **3 pokusy** s odstupom,
- ak zlyhajú všetky, **admin dostane okamžite upozornenie s priloženým PDF**, aby objednávku poslal ručne alebo nadiktoval telefonicky,
- admin môže ktorúkoľvek objednávku **poslať znova** — kópia je označená ako kópia, aby sa počty nezdvojili,
- odosielanie cez službu s webhookmi (Postmark, Resend, SES) dá spoľahlivé hlásenia o odrazoch — vlastné SMTP ich vie tiež, ale treba naň nastaviť sledovanú návratovú adresu,
- **SPF, DKIM a DMARC** na odosielacej doméne sú povinné — viď 7.2.2.

### 7.2.2 SPF, DKIM a DMARC — čo to je a prečo to potrebujeme
Sú to tri záznamy v DNS domény, z ktorej appka posiela poštu (napr. `obedy.firma.sk`). Bez nich sa naše maily nedostanú do schránky dodávateľa, ale do spamu — alebo ich prijímajúci server rovno zahodí.

| | Čo robí | Prirovnanie |
|---|---|---|
| **SPF** | zoznam serverov, ktoré smú posielať poštu za našu doménu; príjemca si overí, či správa prišla od niektorého z nich | zoznam ľudí oprávnených podpisovať za firmu |
| **DKIM** | ku každej správe pripojí digitálny podpis; verejný kľúč je v DNS, takže príjemca overí, že správa je naozaj naša a nikto ju cestou nezmenil | pečať na obálke |
| **DMARC** | povie príjemcovi, čo robiť, keď SPF alebo DKIM neprejde (nič / do spamu / zahodiť), a kam posielať hlásenia | pokyn, ako naložiť s listom, ktorý má porušenú pečať |

**Prečo to nie je voliteľné:** väčšina dodávateľov má poštu na Gmaile alebo Microsoft 365 a tie od roku 2024 vyžadujú SPF a DKIM aj DMARC. Bez nich sa objednávky jednoducho nedoručia a celá automatizácia je zbytočná.

**Čo to reálne obnáša:** tri riadky pridané do DNS domény tým, kto ju spravuje (firemné IT alebo poskytovateľ hostingu). Ak sa použije odosielacia služba, tá vygeneruje presné znenie záznamov na skopírovanie. Práca **rádovo pol hodiny, jednorazovo**, plus overovací test. Potom sa raz za čas pozrieť na DMARC hlásenia, či niečo nezlyháva.

### 7.2.3 Eskalácia pri nepotvrdení
Ak dodávateľ nepotvrdí prijatie do času nastaveného v 7.2.1, appka nečaká:

1. **SMS dodávateľovi** — krátka urgencia: *„Objednavka na 3.-7.8. nepotvrdena, prosim potvrdte odkazom v maili alebo zavolajte."*
2. **Upozornenie adminovi** súčasne — nech vie, že treba zdvihnúť telefón, ak ani SMS nepomôže.
3. Potvrdenie kedykoľvek potom eskaláciu **ukončí** a zapíše sa čas.

Spúšťače SMS sú preto **dva samostatné** a nastavujú sa nezávisle: *zlyhalo odoslanie* (technická chyba) a *neprišlo potvrdenie* (mail odišiel, ale nikto naň nereaguje). Sú to rôzne situácie a dodávateľ môže chcieť len jednu z nich.

#### Doplnkové SMS dodávateľom
SMS je **doplnok, nie náhrada** — neunesie prílohu a do jednej správy sa zmestí len krátky súhrn. Nastavuje sa per poskytovateľ (telefón + ktoré udalosti):

| Udalosť | Odporúčanie | Prečo |
|---|---|---|
| **Zlyhanie e-mailu** | **zapnúť vždy** | keď spadne SMTP, ďalší e-mail nepomôže — ide tou istou cestou. SMS je jediný naozaj **nezávislý kanál**. |
| **Denná korekcia** | podľa dodávateľa | ráno o 07:30 je kuchár pri sporáku, nie pri počítači. Krátka správa „streda: A 22, B 15, C 7, spolu 44" sa mu hodí viac než mail. |
| **Týždenná objednávka** | spravidla netreba | do SMS sa nezmestí, poslúži nanajvýš ako upozornenie „objednávka odoslaná, detail v maili". |

**Text sa posiela zámerne bez diakritiky.** So slovenskými mäkčeňmi prechádza SMS z kódovania GSM-7 na UCS-2 a limit padá zo **160 znakov na 70** — jedna správa by sa rozpadla na tri, s trojnásobnou cenou a rizikom, že prídu v zlom poradí. Appka pri zostavovaní textu ukáže počet znakov a upozorní, ak by sa správa delila.

**Náklady** sú zanedbateľné: ~0,03–0,05 € za správu, pri dvoch dodávateľoch a dennej korekcii rádovo **2 € mesačne**.

#### Cez koho posielať SMS
Na slovenskom trhu je viacero brán s API (SMSgate, 123sms, EuroSMS, SMS-portal, O2 Business). Ceny sa pohybujú **od ~0,01 do 0,04 € za správu**. Pri našom objeme je cena za správu takmer jedno — vyberať treba podľa iných vecí:

- [ ] **doručenky** (delivery reports) — bez nich nevieme, či SMS dorazila, a stratíme polovicu zmyslu,
- [ ] **alfanumerický odosielateľ** — aby prišla od `OBEDY` alebo názvu firmy (max. 11 znakov), nie z neznámeho čísla. Kuchár neznáme číslo ignoruje,
- [ ] **žiadny mesačný paušál ani minimálny odber** — posielame desiatky správ mesačne,
- [ ] jednoduché HTTP API a **EÚ spracovanie údajov**.

#### Prečo nie Viber, WhatsApp alebo Telegram
| | Prekážka |
|---|---|
| **WhatsApp Business** | treba overený Meta Business účet, partnera (BSP) a **vopred schválené šablóny správ** — každá zmena textu ide znova na schválenie. Dni papierovania kvôli dvom správam denne. |
| **Viber Business** | na Slovensku rozšírený, ale tiež cez agregátora, s overením firmy a schvaľovaním. Rovnaká réžia. |
| **Telegram** | technicky najjednoduchší a **zadarmo**, ale príjemca musí mať Telegram a najprv sám napísať botovi. Medzi kuchármi je rozšírenie nízke. |

Rozhodujúce je, že SMS **nevyžaduje žiadnu aplikáciu ani súhlas vopred a dorazí aj na tlačidlový telefón bez dát**. Práve to je pri správe typu „o hodinu uvaríte zlý počet" podstatné. Pri našom objeme by úspora z lacnejšieho kanála bola pár eur ročne — nestojí za ňu ani deň papierovania.

**Telegram má ale zmysel pre admina.** Je zadarmo, okamžitý a **unesie prílohu** — upozornenie „e-mail zlyhal" môže prísť rovno aj s PDF objednávky, aby ju admin poslal ďalej z telefónu. Zapneme ho ako voliteľný kanál pre admina a predákov, ktorí Telegram majú; pre dodávateľov ostáva SMS.

Doručenky z brány sa logujú rovnako ako e-maily (7.2.1).

### 7.3 Účtovníctvo a mzdy
- **Mesačný podklad pre mzdy** — per osoba: osobné číslo, meno, tím, počet obedov, cena spolu, príspevok zamestnávateľa, sociálny fond, **zrážka zo mzdy**. XLSX + CSV, formát doladený podľa mzdového softvéru.
- **Kontrola faktúry dodávateľa** — per poskytovateľ: počty porcií po dňoch × cena a súčet. Po zadaní fakturovanej sumy appka ukáže **rozdiel a deň, v ktorom vzniká**. Toto je najrýchlejšia cesta k odhaleniu, že dodávateľ fakturuje inak, než sa objednalo.
- **Rozúčtovanie na strediská a tímy** — pre vnútropodnikové účtovníctvo.
- **Neodhlásené obedy** — koľko sa ich zaplatilo zbytočne, per osoba a per tím, v eurách.
- Všetko za **ľubovoľné obdobie**, nielen za mesiac — kvartál, rok, vlastný rozsah.

### 7.4 Štatistika
Čísla, ktoré niekto reálne otvorí:
- vývoj počtu obedov v čase — celkovo, po tímoch, po poskytovateľoch,
- **obľúbenosť jedál** (podiel A/B/C) — podklad na rokovanie s dodávateľom alebo na zmenu počtu jedál v ponuke,
- **disciplína objednávania** — koľko % tímu objedná včas; ukáže, ktorý predák potrebuje pomoc,
- **neodhlásené obedy v eurách** — spravidla najzaujímavejšie číslo pre vedenie,
- náklady: priemerná cena obeda, celkový príspevok zamestnávateľa za mesiac (podklad na rozpočet),
- účasť: koľko percent zamestnancov sa reálne stravuje.

V MVP ako **tabuľky s exportom**. Grafy sú fáza 3 — pekné, ale nikto podľa nich nerozhoduje skôr, než uvidí čísla.

### 7.5 História a spätné prehliadanie
- Ľubovoľný minulý týždeň či mesiac sa otvorí **presne v stave, v akom bol**: kto čo mal objednané, kto to zadal, aké bolo menu vrátane prílohy a aká platila cena.
- História je **pravdivá, nie prepočítaná** — zmena cenníka ani príspevkov nikdy neprepíše minulosť (6.1, 3.3.2).
- **Karta osoby** — celá história jej objednávok s filtrom podľa obdobia. Typický spor sa vyrieši na dva kliky.
- **Audit log** s vyhľadávaním podľa osoby, dátumu a typu úkonu. Odpovedá na otázku „kto mi to zmenil".
- Uzavreté mesiace sú zamknuté; oprava ide ako položka do nasledujúceho mesiaca (6.3).

### 7.6 Zálohy a prenositeľnosť dát
- **Nočná automatická záloha** databázy **aj príloh menu**, ukladaná **mimo servera** — iné úložisko, ideálne iný poskytovateľ. Záloha na tom istom stroji nie je záloha.
- Zálohy **šifrované**, retencia 30 denných + 12 mesačných.
- **Štvrťročný test obnovy** so zápisom dátumu a výsledku. Netestovaná záloha je len nádej. Pri tejto veľkosti dát trvá obnova minúty.
- **Kompletný export na jedno kliknutie** — admin si kedykoľvek stiahne ZIP so všetkými dátami (XLSX + prílohy). Firma tak nie je uzamknutá v appke, vie dáta odovzdať účtovníkom alebo kedykoľvek prejsť inam. Považujem to za slušnosť voči zákazníkovi, nie za funkciu navyše.
- Postup obnovy je súčasťou prevádzkovej dokumentácie, nie len v hlave toho, kto to nasadil.

---

## 8. Notifikácie a pripomienky

Stravníci nepoužívajú e-mail a časť z nich nebude používať ani appku. Preto **appka neprehovára k stravníkom — prehovára k predákom**, a k stravníkom sa dostane cez nástenku a cez predáka.

**Rozsah push notifikácií: áno pre predákov a admina, nie pre stravníkov.** Rozdiel nie je v technológii, ale v počte — predákov je zopár a dá sa s každým osobne prejsť inštalácia, so stovkou stravníkov to nejde.

### 8.1 Ako sa notifikácia dostane k predákovi

| Platforma | Ako to funguje | Čo to vyžaduje |
|---|---|---|
| **Android** | Web push funguje spoľahlivo, dokonca aj bez inštalácie na plochu — stačí povoliť notifikácie v prehliadači | jedno ťuknutie na „Povoliť" |
| **iPhone** | Web push funguje **od iOS 16.4**, ale **iba ak je appka pridaná na plochu**. V obyčajnej karte Safari push nefunguje vôbec | Safari → Zdieľať → *Pridať na plochu* → otvoriť z ikony → povoliť notifikácie |

Na iPhone je to teda štyri kroky a používatelia ich sami spravidla nespravia správne. Pri desiatich predákoch je to ale päť minút na človeka, prípadne jedno spoločné posedenie pri nasadení — a appka ich prevedie sprievodcom podľa toho, aký telefón majú.

Inštalácia na plochu má zmysel pre predáka aj bez notifikácií: ikona na ploche, otvorí sa na celú obrazovku, netreba pamätať adresu. Pre denného používateľa je to rozdiel medzi „nástroj" a „ďalšia webstránka".

**Poistka:** každá notifikácia ide **súbežne aj e-mailom**. Ak predákovi push nefunguje, nezmešká nič — a naopak, kto e-mail nečíta, dostane push. Ani jeden kanál nie je jediný bod zlyhania.

**SMS — zatiaľ nie, ale pripravené.** Ak by sa push u predákov neosvedčil (starý telefón, vypnuté notifikácie, iPhone bez ochoty inštalovať), SMS je lacná náhrada: pri ~10 predákoch a dvoch správach týždenne jednotky eur mesačne, funguje na akomkoľvek telefóne, nulové nastavovanie.

Nie je to komplikované — notifikácie posielam cez **jednotnú vrstvu kanálov**, kde je e-mail aj push len zapojený modul. Pridanie SMS je potom účet u brány (Twilio alebo slovenský poskytovateľ), kľúč do konfigurácie a napojenie modulu: **rádovo pol dňa až deň práce.** Preto to nemusí byť v MVP.

Jediné, čo treba spraviť **hneď od začiatku**: mať na osobe **voliteľné pole „telefón"** a zbierať čísla predákov už pri zavádzaní. Inak sa pri zapínaní SMS bude o pol roka zháňať desať telefónnych čísel — a to je jediná časť, ktorá by naozaj zdržala.

| Kedy | Komu | Obsah | Kanál |
|---|---|---|---|
| Po 08:00 | adminovi | „Menu na budúci týždeň ešte nie je zadané" (len ak chýba) | push + e-mail |
| Št 13:00 | predákovi | „V tíme Údržba sa 6 ľudí nevyjadrilo. Uzávierka zajtra o 12:00." — počítajú sa len nerozhodnutí (4.6) | push + e-mail |
| Pia 09:00 | predákovi | posledná výzva + tlačiteľný zoznam chýbajúcich | push + e-mail |
| Pia 09:00 | 1. zástupcovi **a adminovi** | eskalácia, ak tím stále nemá objednané (1.3) | push + e-mail |
| Pia 12:05 | predákovi | potvrdenie tímu na tlač na nástenku | v appke |
| Pia 12:05 | dodávateľovi | počty porcií (PDF + XLSX) | e-mail |
| denný deadline | dodávateľovi | korekčný súhrn: storná a doobjednávky (4.3) | e-mail |
| pri uzavretí dňa adminom | predákom | „Vo štvrtok 14. 8. sa nevarí" | push + e-mail |
| začiatkom mesiaca | adminovi | podklad pre mzdy je pripravený na uzavretie | push + e-mail |

Predpoklad: **predáci a admini firemný e-mail majú.** Ak nie, ostáva push a stav v appke — predák sa do nej beztak prihlasuje, je to jeho pracovný nástroj.

Pre stravníkov, ktorí appku používať budú: informácie vidia v appke pri prihlásení (čo mám objednané, koľko mi ide zo mzdy). E-mail je voliteľný údaj na osobe — kto ho má vyplnený, dostane pripomienku aj mailom. **Push pre stravníkov ostáva vo fáze 3** — technicky je to tá istá vec, len ju netreba naraz vysvetľovať stovke ľudí. Kto si appku pridá na plochu sám, dostane ju zapnutú aj tak.

---

## 9. Architektúra a hosting — možnosti

Záťaž je triviálna: ~100 používateľov, špička pár desiatok súčasne v piatok pred 12:00, jednotky tisíc requestov denne.

| # | Riešenie | Cena/mes. | Pre | Proti |
|---|---|---|---|---|
| 1 | **VPS v EÚ** (Hetzner / Websupport SK), Docker Compose: app + PostgreSQL + Caddy (HTTPS automaticky) + nočná záloha mimo servera | ~5–8 € | plná kontrola, dáta v EÚ, dostupné z domu aj z mobilu, žiadny vendor lock-in, prenositeľné on-prem | niekto musí raz za čas urobiť update OS |
| 2 | **Firemný server / VM / NAS** on-prem | 0 € navyše | dáta neopúšťajú firmu | treba sprístupniť zvonka (reverse proxy + certifikát alebo VPN); víkendové objednávanie z domu je požiadavka, takže VPN pre 100 ľudí je nepraktická; zálohy a HTTPS na pleciach IT |
| 3 | **PaaS** (Railway / Render / Fly.io, alebo Vercel + Neon) | 0–20 € | najrýchlejší štart, žiadna správa servera | treba strážiť EÚ región kvôli GDPR, pri raste ceny rastú, čiastočný lock-in |
| 4 | **Azure / AWS** | 20–60 € | dáva zmysel, ak firma už beží na Microsoft 365 → App Service + Entra ID SSO „zadarmo" | pre 100 ľudí prestrelené a zložité |

**Rozhodnuté: možnosť 1 u Webglobe** (podrobnosti v 9.1). Jeden VPS v EÚ, všetko v Dockeri, denné zálohy databázy mimo servera + týždenný test obnovy. Ak firma neskôr povie „chceme to u nás", ten istý `docker compose up` beží na ich VM. Celkové náklady vrátane domény pod **150 €/rok**.

### 9.1 Rozhodnuté: Webglobe (server aj e-mail)
Slovenský poskytovateľ, dáta v EÚ — z hľadiska GDPR aj dostupnosti dobrá voľba. Pár vecí ale treba pri objednávaní ustrážiť.

#### Musí to byť VPS, nie webhosting
Toto je jediná naozaj zásadná vec. Zdieľaný webhosting je PHP + MySQL bez root prístupu a **appka podľa tohto konceptu na ňom nepobeží**: nemá Docker, nedá sa na ňom držať bežiaci Node proces ani vlastný plánovač úloh, a hlavne tam nie je LibreOffice, ktorým prevádzame Word menu na PDF (3.3.1). Webglobe VPS s root prístupom a voľbou distribúcie tieto problémy nemá.

Ak by bola cena webhostingu rozhodujúca, existuje legitímna alternatíva: **prepísať appku do PHP (Laravel) + MySQL**. Vtedy by bežala aj na zdieľanom hostingu za pár eur, ale stratíme prevod Word → PDF a časť prenositeľnosti. Rozhodnutie treba spraviť **pred kódovaním**, nie po ňom.

**Ak sa nikomu vo firme nechce aktualizovať Linux**, Webglobe ponúka aj *Managed VPS*, kde údržbu operačného systému robia oni. Za pár eur navyše to je rozumný kompromis.

#### E-mail — v poriadku, a náš návrh riziko sám znižuje
- **SPF a DKIM** Webglobe podporuje, **DMARC** je obyčajný TXT záznam, ktorý si pridáme sami (7.2.2). ✔
- Odosielací server `mail.webglobe.sk`, porty 465 alebo 587 s autentifikáciou. ✔
- Limit **100 správ za minútu** — my pošleme rádovo desať za deň, takže nepodstatné. ✔
- **Chýbajú webhooky o odrazoch.** Odrazy sa vracajú ako e-mail, takže by sme museli čítať schránku cez IMAP a parsovať ich. **Nemusíme** — práve preto, že sme sa rozhodli pre *aktívne potvrdenie* namiesto detekcie doručenia (7.2.1). Toto je konkrétny prípad, keď sa to rozhodnutie vypláca.
- Odosielať treba zo **skutočnej schránky na tej istej doméne** (napr. `obedy@firma.sk`), nie z vymyslenej adresy — inak sa SPF a DKIM rozídu a správy pôjdu do spamu.

#### Zálohy: firemný NAS — vyriešené, ale s dvomi podmienkami
Appka beží u Webglobe, zálohy sa ukladajú na firemný server/NAS. To je presne to rozdelenie, ktoré chceme: jeden problém u poskytovateľa nezmaže dáta.

**1. Sťahuje NAS, neposiela server.** Nočnú úlohu spúšťa **NAS**, ktorý sa prihlási na VPS a stiahne si zálohu. Nie naopak. Dôvod: keby zálohu posielal server, musel by poznať prístup na NAS — a útočník, ktorý sa dostane na server, by potom mohol zmazať aj zálohy. Pri sťahovaní pozná prístupové údaje len NAS a server o ňom nevie nič. Bonus: NAS nepotrebuje byť dostupný zvonku, stačí mu odchádzajúce spojenie.

**2. Verzie, nie zrkadlo.** Jedna prepisovaná kópia nie je záloha — keby sa databáza poškodila, nočná synchronizácia by rozbitú verziu prepísala cez zdravú. Treba **datované snímky**: 30 denných + 12 mesačných (7.6). Nástroj typu `restic` alebo `borg` to rieši aj s dedupláciou, takže miesto to zaberie málo.

Záloha sa **šifruje ešte na serveri**, než odíde — obsahuje osobné údaje aj mzdové sumy. A raz za štvrťrok **test obnovy**, inak nevieme, či záloha vôbec funguje.

Poznámka k tomu, prečo appka nebeží rovno na firemnom serveri: ľudia budú objednávať cez víkend z domu, takže by ho bolo treba sprístupniť z internetu aj s certifikátom a dohľadom — a VPN pre stovku ľudí je nepraktická. Firemný server ako **úložisko záloh** je ale ideálne využitie.

#### Čo ešte vybaviť pri objednávke
- [ ] **Zmluva o spracúvaní osobných údajov** (GDPR čl. 28) — Webglobe by mal mať štandardnú.
- [ ] Písomné potvrdenie, **kde presne dátové centrum stojí**.
- [ ] **SLA a okná plánovanej údržby** — bolestivé okno je piatok 11:00–12:00 a pracovné dni pred 07:30. Ak by údržba padla práve tam, treba to vedieť dopredu.
- [ ] **Externý monitoring dostupnosti**, nie u Webglobe — inak sa o výpadku dozvieme od ich systému, ktorý je tiež mimo.
- [ ] Certifikát: na VPS ho rieši Caddy cez Let's Encrypt automaticky, nič dokupovať netreba.

Ak by server bol nedostupný tesne pred uzávierkou, admin má možnosť **uzávierku pre daný týždeň jednorazovo posunúť** (4.1) — výpadok teda neznamená, že ľudia ostanú bez obeda.

### 9.2 Technológie (návrh, ladíme pred kódom)
**Rozhodnuté:** Next.js + PostgreSQL na VPS u Webglobe (viď 9.1).

- **Frontend + backend v jednom:** Next.js (React) + TypeScript, inštalovateľná **PWA** (ikona na ploche, offline zobrazenie „čo mám objednané").
- **Databáza:** PostgreSQL.
- **Auth:** vlastné session cookies, hash PIN/hesiel cez argon2id, rate limiting. Pripravené na neskoršie SSO.
- **Plánované úlohy:** cron worker — notifikácie, zamykanie týždňa, odoslanie objednávky dodávateľovi.
- **Push:** Web Push (VAPID) priamo, bez externej služby.
- **E-mail:** firemné SMTP alebo Resend/Postmark — hlavne pre dodávateľov.
- **Jazyk:** len slovenčina, žiadny prekladový framework. Texty ale držím **na jednom mieste** (jeden modul), nie rozsypané po komponentoch — pridanie ukrajinčiny neskôr je potom deň práce namiesto týždňa. Stojí to teraz nula navyše.
- ~~Alternatíva Django/Laravel~~ — zvážená a zamietnutá: na zdieľanom hostingu by odpadol prevod Word menu na PDF a stratila by sa prenositeľnosť cez Docker.

Aplikácia musí byť **mobile-first**: veľké dotykové plochy (rukavice), vysoký kontrast (denné svetlo v hale), čitateľné písmo, funguje na 4-ročnom Androide.

---

## 10. Dátový model (hrubý náčrt)

```
Osoba        (osobné číslo, meno, tím, poskytovateľ, roly[], hash PIN/hesla alebo NULL
              = bez prístupu do appky, e-mail — povinný pre admina a superadmina,
              inak voliteľný, telefón — voliteľný, do zásoby pre SMS, aktívna)
Relácia      (osoba, zariadenie, token, posledné použitie, platnosť) — trvalé prihlásenie
PrílohaMenu  (poskytovateľ, týždeň, súbor, prevedená verzia, nahral, kedy, verzia)
                staré verzie sa archivujú, nemažú
                roly: STRAVNÍK | PREDÁK | ADMIN | SUPERADMIN (aj viac naraz)
Tím          (názov, predák)
Zástupca     (predák, poradie, osoba)                    — predvolená ponuka
Zastupovanie (kto zastupuje, koho, od, do, kto nastavil) — konkrétny záznam, sám vyprší
Poskytovateľ (názov, číslovanie, skladba jedla, kapacita, pravidlo odhlásenia, e-mail, príspevky)
MenuDňa      (poskytovateľ, dátum, položky[])
Položka      (poradie → označenie, názov, zložka: polievka|hlavné|dezert|komplet, cena, alergény)
Objednávka   (osoba, dátum, poskytovateľ, položky[], stav, cena_snapshot, príspevok_snapshot,
              vytvoril, zmenil, kedy)
                stav: OBJEDNANÉ | BEZ_OBEDA | ODHLÁSENÉ | ODHLÁSENÉ_PO_TERMÍNE(účtované)
                nerozhodnuté = žiadny záznam (4.6)
MesačnáUzávierka (mesiac, uzavretá kým, kedy, zafixované sumy)
Nastavenia   (týždenná uzávierka, horizont, sviatky, uzavreté dni, príspevky, politika neodhlásených)
Audit        (kto, čo, kedy, stará → nová hodnota, IP)
```

Objednávka sa **nikdy nemaže**, len mení stav — inak sa spory „ja som sa odhlásil" nedajú rozhodnúť a mesačná uzávierka nemá čo auditovať.

---

## 11. Logo a vizuál

**Zvolené: Tanier-týždeň.** Jediný z trojice, ktorý ostane čitateľný aj ako 16 px ikona v záložke prehliadača — stačia mu dva tvary, kruh a výsek. Zvyšné dva sa v malom rozpadnú na šedú škvrnu. Všetky tri sú nakreslené v preview na svetlom aj tmavom podklade.

1. **Tanier-týždeň** ✔ — kruh rozdelený na 5 výsekov (Po–Pia), jeden vyplnený akcentom. Zrozumiteľné aj ako 32 px favicon aj ako 512 px PWA ikona.
2. **Obedár** — štylizovaný dvojposchodový obedár, držadlo tvorí fajku ✓.
3. **Vidlička-kalendár** — hroty vidličky prechádzajú do stĺpcov kalendárnej mriežky.

Farby: akcent **paprika/jantár** (jedlo, teplo, dobrá čitateľnosť) + **antracit** ako základ + krémové pozadie.
Sémantické farby držané oddelene od loga: zelená = objednané, sivá = neobjednané, červená = po termíne. Kontrast podľa WCAG AA.
Písmo: Inter (alebo systémové) — bezplatné, výborne čitateľné v malých veľkostiach.

Alternatívne názvy: *Obedár*, *Menu 5*, *Naobed*, *Obedy*.

---

## 12. Ochrana údajov

- Osobné údaje v minimálnom rozsahu: meno, osobné číslo, tím, poskytovateľ, e-mail (ak je).
- Voľba jedla môže nepriamo naznačiť zdravotný stav alebo vyznanie (diabetická, bezmäsitá, halal) → nezverejňovať mimo nutného okruhu; predák vidí označenie jedla, nie dôvod.
- Retencia: objednávky a mzdové podklady podľa účtovných lehôt, audit log 1 rok, potom anonymizácia.
- Prístup k mzdovým údajom má len admin, nie predák.

---

## 13. Otvorené otázky

**Rozhodnuté:** predák objednáva, mení aj odhlasuje · poskytovateľ pridelený adminom · ceny a mzdový podklad áno · bez zmien · menu per poskytovateľ (ručne + neskôr import) · menu známe do pondelka · príspevok ako nastavenie · väčšina bez e-mailu aj bez appky → predák + nástenka · kombinovaný zber cez hárok · len slovenčina · superadmin bez 2FA, heslo 12 znakov, obnova cez e-mail · prístupy pri spustení len predáci a admin · doobjednanie predákom v deň obeda · delegácia s obdobím + eskalácia.

**Otázky na dodávateľov** (obchodné, nie technické — appka sa prispôsobí):
1. **Akceptujú doobjednanie v deň obeda a dokedy?** (4.3) Ak nie, u daného dodávateľa sa funkcia nezapne.
2. **Vzorky menu** — v akom formáte reálne chodia, aby sa dalo rozhodnúť o importe (3.2).
3. **Denný deadline na odhlásenie** — každý dodávateľ svoj (4.2). Treba ich pozbierať.

**Otázky dovnútra firmy:**
4. **Čísla od mzdára** — checklist v kapitole 6.2.
5. **Mzdový softvér** — ktorý, aby export sedel formátom.
6. **Zoznam zamestnancov** — je odkiaľ ho preberať (dochádzka, personalistika), alebo sa 100 ľudí zadá ručne? Ručne je to jednorazovo pár hodín, čo je pri tejto veľkosti prijateľné.
7. ~~**Doména a e-mailová schránka**~~ — **vyriešené:** podadresa `obedy.firma.sk` na firemnej doméne, pripraví firemný IT technik. Zadanie preňho je v `docs/02-zadanie-pre-it.md`.
8. **Hostia a návštevy** — treba objednávať obed pre návštevu? (Malé rozšírenie: objednávka bez väzby na osobu, účtovaná stredisku.)
9. **Prevzatie obeda** — treba evidovať, kto si obed reálne vyzdvihol? Rieši spory typu „zaplatil som a nedostal".

---

## 14. Fázy

| Fáza | Obsah |
|---|---|
| **0 — Koncept** | tento dokument, odsúhlasenie |
| **1 — Preview** | klikací prototyp bez databázy: login, **matica predáka**, týždeň stravníka, admin nastavenia, ručný editor menu, cenník s oboma modelmi príspevku, ukážky tlačových zostáv, 3 varianty loga |
| **2 — MVP** | prihlásenie a roly vrátane superadmina, obnova hesla cez e-mail, týždenná objednávka + uzávierky, denné odhlásenie s pravidlami per poskytovateľ, **doobjednanie predákom + korekčný súhrn**, konfigurácia poskytovateľov, ručný editor menu + kopírovanie týždňa, **matica predáka**, delegácia a eskalácia, ceny a mesačný export pre mzdy, denný súhrn pre dodávateľa, **tlačové zostavy (5.4)**, **push notifikácie pre predákov a admina** + sprievodca inštaláciou na plochu, **príloha menu (fotka/PDF/Word)**, **exporty, história a zálohy (kapitola 7)**, audit, nasadenie |
| **3 — Rozšírenia** | grafy a dashboard, push pre stravníkov, SMS pre predákov ak treba, import menu (XLSX/CSV, prilepenie textu) podľa reálnych vzoriek, evidencia prevzatia, hostia, SSO, kiosk, rola dodávateľa, prípadná ukrajinčina |

Push je v MVP **len pre predákov a admina** (zopár ľudí, s každým sa dá inštalácia prejsť osobne), pre stravníkov ostáva vo fáze 3. Tlačové zostavy sú naopak plnohodnotnou súčasťou MVP — appku bude držať predák s papierom, nie stravník s telefónom.
