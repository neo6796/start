# Objednávanie obedov — koncept (v0.9)

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
12. Zastupovanie predáka rieši **delegácia s obdobím + eskalácia na chýbajúce objednávky**, nie automatický reťazec odvodený z domnelej neprítomnosti. Poradie zástupcov sa navyše prechádza **dopredu** a appka hlási tímy, ktoré ostanú bez zodpovednej osoby (1.3 bod 7, obrazovka 5.8).
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
23. **Žiadne „kopírovať minulý týždeň"** (5.1). Menu je každý týždeň iné, takže skopírovaná voľba je vo väčšine prípadov nesprávna — a nesprávna voľba sa tvári vybavene, kým prázdna bunka o sebe dáva vedieť. Bolo by to priame popretie bodu 22.
24. **Kalendár sviatkov a zatvorených dní je jediný zdroj pravdy** (5.7) pre objednávky, uzávierky aj mesačné rozúčtovanie. Deň, v ktorý sa nevarí, sa v objednávke neukáže vôbec a do fakturácie nevstúpi.
25. **Faktúra sa kontroluje strojovo proti tomu, čo appka sama odoslala** (5.6). Mesiac sa nedá uzavrieť, kým má nevyriešený rozdiel.
26. **Firma, tím a prevádzka sú tri nezávislé rozmery** (1.3a). Predák môže mať v tíme ľudí z viacerých spriaznených firiem, na jednej prevádzke sa stravujú ľudia z viacerých firiem. Matica predáka sa podľa firiem nečlení, **mesačný podklad áno**.
27. **Stravník sa nikdy nemaže, len sa prepne na neaktívneho** (1.3b). **Zoznam vlastní appka**, import z dochádzky je pomôcka — navrhuje, nikdy neprepisuje ani neruší. Existujúce osobné čísla sa **neprečíslovávajú**. Import z dochádzky je opakovateľný a ukazuje rozdiel; chýbajúceho človeka nikdy neruší sám. Spájací kľúč je **celý štvorciferný kód**, nie poradové číslo vo firme — to sa medzi firmami opakuje.
28. **Brigádnici sú osoby s krátkou platnosťou**, nie zvláštny druh záznamu (1.3b).
29. **Dva modely rozúčtovania, prepínané pri každom poskytovateľovi zvlášť** (6.2), predvolene **ekonomický**. *Štandardný* je 55 / 35 / zvyšok do sociálneho fondu. *Ekonomický* drží príspevok zamestnávateľa na nominálnej hladine **najlacnejšieho** poskytovateľa: stravník sa doťahuje v pásme 35–45 % a fond dopĺňa len zvyšok, takže **drahšie jedlo sa z fondu nepreplatí**. Pri najlacnejšom poskytovateľovi sú oba modely **totožné**, takže predvoľba nikdy neuškodí. Sociálny fond sa v oboch prípadoch **nenastavuje, dopočíta sa**.
30. **Typ vzťahu (PP / živnostník) je vlastnosť osoby, nie firmy** (6.2a) — brigádnik môže byť oboje. Výpočet je pre oboch rovnaký, líši sa výstup: mzdový podklad po firmách verzus samostatný výstup pre živnostníkov.
31. **Miesta výdaja** (3.4) sú nastavením poskytovateľa, osoba má **domovské miesto** a jednotlivý deň sa dá prepnúť inam ako výnimka. Objednávka dodávateľovi sa **delí podľa miest**, miesto má **minimum na dovoz** a presun medzi miestami je **korekcia**. Pri jedinom mieste sa appka na miesto nepýta nikde.
32. **Neodhlásený obed sa účtuje v plnej cene** — bez príspevku zamestnávateľa a bez sociálneho fondu (6.4). Príspevok je viazaný na odpracovanú zmenu, takže v deň neprítomnosti nemá z čoho vzniknúť.
33. **Dochádzka sa dá naimportovať aj pri uzávierke**, nielen pri zakladaní ľudí (6.5). Slúži na triedenie podľa prítomnosti a na nájdenie obedov v dňoch, keď človek v práci nebol. **Nikdy neúčtuje sama** — len označí deň na rozhodnutie.
34. **Živnostníkom appka obed len objednáva** (6.2a). Dodávateľovi platia sami, príspevok dostávajú nepriamo — o jeho výšku si zvýšia faktúru voči firme. Do mzdového podkladu ani do sociálneho fondu nevstupujú; dostávajú **štruktúrovaný prehľad** po osobách, prevádzkach a poskytovateľoch.
35. **Príplatok za dovoz sa zatiaľ nerieši** — na našich prevádzkach neexistuje. V dátovom modeli ostáva pole s nulou, aby sa dal zapnúť bez migrácie (3.4, otvorená otázka 11).
36. **Fakturačný a kontrolný výstup je rozdelený** (6.3) — za každú firmu zvlášť, v rámci nej po poskytovateľoch, a živnostníci každý sám za seba s uvedením firmy, ku ktorej patrí. Nad nimi je **sumár za firmu v rovnakej štruktúre ako pri zamestnancoch** a nakoniec súčet oboch. Každý list končí riadkom **„čo očakávať na faktúre"**. U živnostníka sa vedľa skutočnosti ukáže aj *ako keby bol zamestnanec* — príspevok, fond aj doplatok s DPH. **Kto komu fakturuje, je nastavenie poskytovateľa**, nie otvorená otázka.
37. **Import nesie len totožnosť** (1.3b) — osobné číslo, priezvisko, meno. Firma, tím, predák, prevádzka aj poskytovateľ sa nastavujú v appke **výberom z rozbaľovacieho zoznamu, nikdy písaním**. Zoznam sa dá vyexportovať a nahrať späť, ale import **neznáme hodnoty odmieta, nezakladá** — inak by bol dierou v tom istom pravidle.
38. **Ručne zadaná hodnota prebíja importovanú** (1.3b) — vo všetkých importoch. Import dopĺňa prázdne, prepisuje predchádzajúci import a **ručný zápis nechá tak**, len ho vypíše ako rozdiel. **Pred zápisom sa vždy ukáže, čo sa stane**, nie až po ňom.
39. **Appka nečíta natívny export dochádzkomera** (6.5) — číta jednoduchý dohodnutý tvar `osobne_cislo; datum; hodiny` (`docs/08-vstupne-subory.md`). Prevod je mimo appky. Pri výmene dochádzkového systému sa tak mení prevodník, nie appka.
40. **Záznam o neprítomnosti sa vedie pre každého stravníka**, nielen pre predákov (1.4). Jeden záznam obsluhuje zastupovanie, zatvorenie dní v matici aj to, aby kontrola cez dochádzku nehlásila očakávanú neprítomnosť. **Nič neblokuje a nie je povinný.**
41. **Firma sa mení len k prvému dňu mesiaca** (1.3b), pretože ako jediná delí peniaze. Nástup, odchod aj zmena tímu, predáka, prevádzky a poskytovateľa sú možné **ktorýkoľvek deň**.
42. **Tabuľa v jedálni sa nerobí** — pri tomto počte ľudí sa neoplatí. Kontrolu „kto si čo objednal a prevzal" plní **denný hárok pre výdaj** (5.5): jeden hárok na prevádzku a poskytovateľa, meno **aj** kód, jedlo len ako písmeno, odškrtávacie políčko.
43. **Nábeh je pilot na jednom tíme** (kapitola 14) — päť až šesť ľudí, jeden mesiac, **appka hlavná a papier ako kontrola**, nie naopak. Pilot musí dôjsť až po uzávierku a mzdový podklad, nie skončiť pri objednávaní.
44. **Jeden kľúč, viacero označení** (1.3b) — **žiadne druhé obedové číslo a žiadny prevodník.** Osoba má vnútorný nemenný kľúč, na ktorý sa viaže história, a dochádzkový kód, mzdové číslo aj číslo karty sú **údaje** na nej. Pri výmene dochádzkového systému sa prepíše jedno pole a história sa nehne.
45. **Spätný zápis je samostatná operácia** (4.5a) — dopisuje obed, ktorý sa zjedol mimo appky. Len **admin**, len do **otvoreného mesiaca**, s dôvodom, s trvalým príznakom na tom dni a **bez odoslania objednávky dodávateľovi**. Uzávierka počet spätných zápisov ukazuje.
46. **Mesiac má dva zámky, nie jeden** (6.3). **Mzdová uzávierka** ide do 5.–6. dňa z toho, čo appka sama odoslala, a **nečaká na faktúru**. **Fakturačná kontrola** sa zamyká, až keď faktúra príde; rozdiel ide ako opravná položka do ďalšieho mesiaca. Tvrdý mzdový termín tak neprehráva s termínom, ktorý neriadime.
47. **Nárok a strop sú dve rôzne veci** (6.2b). Nárok vzniká **odpracovaním viac než štyroch hodín** — na to je v importe stĺpec `hodiny`; bez importu sa nárok predpokladá. **Strop** je datované nastavenie a keď zasiahne, appka to **napíše**, neoreže ticho.
48. **Odmena živnostníkovi sa počíta od nákladu firmy** (6.2a) — *firmu má obed stáť rovnako, nech je stravník zamestnanec alebo živnostník*. Suma na faktúre sa dopočíta spätne podľa toho, či je platiteľom DPH a či si firma DPH odpočíta.
49. **Prevzatie obeda sa neeviduje** (5.5). Pri výdaji stojí zamestnanec dodávateľa, nie náš. Políčko na hárku ostáva ako pomôcka, ale nič sa naň nevieša. Obedy v dňoch neprítomnosti chytá import prítomnosti (6.5).
50. **Hostia sa riešia porciou bez mena** (1.3b) účtovanou stredisku, s dôvodom *hosť*. Žiadny nový mechanizmus, hosť ide v plnej cene.

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

### 1.3a Firma, tím a prevádzka sú tri nezávislé veci

Toto je pri tomto zákazníkovi kľúčové: obedy sa robia **naraz pre viac spriaznených firiem** a organizačne sú pomiešané. Model to zvláda len vtedy, keď sa tri veci držia oddelene a nič ich nenúti zhodovať sa:

| Rozmer | Vlastnosť čoho | Načo slúži | Kto ho určuje |
|---|---|---|---|
| **Firma** | osoby | peniaze — komu sa fakturuje, z čej mzdy sa zráža | mzdy / personalistika |
| **Tím** | osoby | zodpovednosť — kto za ňu objednáva | admin |
| **Prevádzka** | osoby (domovská) a dňa (výnimka) | logistika — kam sa vezie jedlo | admin, na deň predák alebo stravník |

**Predák pod firmou A môže mať v tíme ľudí z firiem A, B aj C.** To nie je výnimka, ktorú treba ošetriť — je to normálny stav. Predák o firmách vôbec nemusí vedieť; on rieši, kto zajtra je čo. Firma sa zjaví až v peniazoch.

**Na jednej prevádzke sa súbežne stravujú ľudia z viacerých firiem.** Rozvoz sa preto delí podľa **miesta**, nie podľa firmy — auto vezie jednu debnu na Farmu bez ohľadu na to, kto koho zamestnáva.

Z toho vyplývajú tri veci, ktoré by inak boli chybou:
1. **Matica predáka nesmie byť členená podľa firiem** — bol by to hluk pre jediného človeka, ktorého to nezaujíma.
2. **Mesačný podklad sa člení podľa firiem**, nie podľa tímov. Každá firma dostane svoj súbor pre svoje mzdy.
3. **Faktúra od dodávateľa je jedna** a rozpad na firmy si robíme my. Dodávateľ nemá dôvod vedieť, koľko firiem to je.

> **Živnostníci nie sú zamestnanci.** V dochádzke je „Živnostníci" tretia skupina vedľa dvoch firiem, ale u nich **neexistuje zrážka zo mzdy** — nemajú mzdu, z čoho zrážať. Appka im preto obed len **objednáva**; peniaze idú úplne inou cestou (6.2a).

### 1.3b Životný cyklus stravníka — ľudia pribúdajú, menia sa a odchádzajú

Zoznam ľudí nie je jednorazový import, je to **priebežne udržiavaný stav**. Preto:

**Nikdy sa nemaže, len sa prepne na neaktívneho.** Osoba má prepínač *aktívny / neaktívny* a voliteľne aj *platí do*. Prepínač je hlavný — človek ho stlačí, keď brigádnik skončí. Dátum je pre prípad, že sa koniec vie dopredu; vtedy sa prepne sám.

Neaktívny **nie je zmazaný**. Nezobrazuje sa v matici a nechodia mu upomienky, ale ostáva v histórii aj vo všetkých uzavretých mesiacoch presne tak, ako tam bol. Keby sa vrátil o rok, prepne sa späť a nadviaže na svoje staré záznamy. Mazanie by rozbilo uzavretý mesiac (5.6, 6.1).

**Brigádnici tým pádom nepotrebujú nič zvláštne.** Nahodia sa ako ktokoľvek iný a po sezóne sa prepnú na neaktívnych. Žiadny osobitný druh záznamu, žiadne upratovanie.

### Kto zoznam vlastní

**Zoznam stravníkov je majetkom appky, nie dochádzky.** Dochádzkomer nevie o tímoch, poskytovateľoch ani prevádzkach — tie existujú len tu. Preto:

| | |
|---|---|
| **Appka** | jediný zdroj pravdy. Pridanie, zmena, prepnutie na neaktívneho — všetko sa robí tu |
| **Import z dochádzky** | **pomôcka, nie pán.** Spustí sa, keď treba; navrhne, nič neprepíše |

#### Import nesie len totožnosť

Súbor obsahuje **tri stĺpce: osobné číslo, priezvisko, meno.** Nič viac. Firma, typ vzťahu, tím, predák, prevádzka aj poskytovateľ sa nastavujú **až v appke**.

Nie je to zjednodušenie pre pohodlie, je to obrana. Keby tie väzby chodili v súbore, prišli by ako text — a text sa dá napísať trikrát inak. *Vráble · Vrable · závod Vráble* by v databáze vyrobili tri prevádzky a rozbité súčty by sa objavili až o dva mesiace pri uzávierke. **Import teda nesie len to, čoho je dochádzka skutočným zdrojom: kto to je.**

V appke sa všetko ostatné vyberá **z rozbaľovacieho zoznamu, nikdy sa nepíše.** Zoznam sa dá doplniť, ale je to samostatný, vedomý krok — nie vedľajší účinok preklepu v tabuľke.

#### Poradie zakladania

Rozbaľovací zoznam musí mať z čoho vyberať, takže poradie nie je ľubovoľné:

| | Krok | Prečo tu |
|---|---|---|
| 1 | **firmy** | bez nich sa nedá určiť, komu sa fakturuje |
| 2 | **prevádzky** | miesta, kde sa ľudia vyskytujú |
| 3 | **poskytovatelia** a ich miesta výdaja (3.4) | tie sa viažu na prevádzky |
| 4 | **import menoslovu** — ID, priezvisko, meno | ľudia bez väzieb, zatiaľ „nezaradení" |
| 5 | **označiť predákov** | predák je sám stravník, takže musí najprv existovať |
| 6 | **doplniť väzby** — firma, typ vzťahu, tím, predák, prevádzka, poskytovateľ | všetko z rozbaľovacích zoznamov |

Krok 5 je dôvod, prečo sa predáci nedajú nahodiť skôr než ľudia: **predák je stravník s príznakom**, nie samostatná entita. Až keď sú označení, dá sa v kroku 6 pri každom človeku vybrať jeho predák — a v zozname sú len tí, ktorí naozaj predákmi sú.

**Krok 6 sa robí hromadne, nie po jednom.** Sto ľudí × šesť rozbaľovacích zoznamov je šesťsto kliknutí a zaručená chyba. Preto: označiť riadky → *nastaviť predáka* / *nastaviť prevádzku* / *nastaviť firmu* na všetky naraz. Väčšina ľudí má tie isté hodnoty, takže reálna práca je pár skupín a potom hŕstka výnimiek.

#### Export a import menoslovu

Zoznam sa dá **vyexportovať aj nahrať späť** — na hromadnú úpravu v Exceli, na zálohu, na kontrolu druhým človekom. Platia pri tom tri pravidlá, inak by sa tým dal zoznam pokaziť rýchlejšie než ručne:

1. **Spája sa cez osobné číslo**, nie cez meno. Riadok s neznámym číslom je **návrh na pridanie**, nie tiché pridanie.
2. **Neznáme hodnoty sa odmietajú, nezakladajú.** Ak je v stĺpci *prevádzka* napísané niečo, čo v zozname prevádzok nie je, import ten riadok označí ako chybu a **nevytvorí novú prevádzku**. Toto je celý dôvod, prečo sa v appke vyberá z rozbaľovacieho zoznamu — bez tejto zábrany by bol export späť dierou v tom pravidle.
3. **Chýbajúci riadok nikoho neruší.** Rovnako ako pri importe z dochádzky (nižšie).

Import nič neprepisuje sám a **nikdy nikoho neruší** — len ukáže rozdiel a čaká na potvrdenie. Nový človek v obedoch potrebuje aj tím, poskytovateľa a prevádzku, ktoré dochádzka nepozná; a brigádnik potrebuje obed hneď, nie až keď sa objaví v mesačnom exporte.

Appka pritom vie dochádzku používať ako **zrkadlo na kontrolu**, bez toho, aby podľa nej konala:

- *„v dochádzke sú 3 ľudia, ktorých v obedoch nemáš"*
- *„5 ľudí máš aktívnych, ale v dochádzke sa dva mesiace neobjavili — neodišli?"*

To je celý vzťah medzi tými dvoma systémami. Dochádzka je kontrolná vzorka, nie nadriadený.

**Opakovaný import namiesto prepisovania.** Súbor z dochádzky sa dá nahrať kedykoľvek znova a appka ukáže **rozdiel**, nie výsledok:

| Nález | Návrh appky |
|---|---|
| kód, ktorý ešte nepoznáme | pridať ako nového — admin doplní tím a prevádzku |
| zmenené priezvisko pri známom kóde | prepísať meno, história ostáva viazaná na kód |
| kód, ktorý v novom súbore chýba | *neodstraňovať automaticky* — ponúknuť ukončenie platnosti |

Ten posledný riadok je zámerný. Chýbajúci človek môže byť odídený, ale aj na dlhodobej PN, alebo len nebol v exporte za daný mesiac. **Automatické rušenie by ticho zmazalo živých ľudí.** Preto sa vždy pýta.

#### Čo sa smie meniť kedykoľvek a čo len k prvému

Príchod a odchod človeka nemá s kalendárom nič spoločné — ľudia nastupujú a odchádzajú hocikedy a appka to musí zvládnuť ktorýkoľvek deň. Jedna jediná zmena je obmedzená:

| Zmena | Kedy |
|---|---|
| **nástup nového stravníka** | ktorýkoľvek deň |
| **odchod / prepnutie na neaktívneho** | ktorýkoľvek deň |
| tím, predák, prevádzka, poskytovateľ | ktorýkoľvek deň |
| **firma** | **len k prvému dňu mesiaca** |

Firma je jediný rozmer, ktorý delí peniaze. Keby sa dala prepnúť pätnásteho, jeden človek by mal mesiac rozdelený medzi dva mzdové podklady a dve faktúry — a to je práca navyše pre všetkých pri niečom, čo sa deje raz za rok. **Appka preto ako dátum zmeny firmy ponúka len prvý deň mesiaca.**

Príchod ani odchod tým netrpia. Nový človek nemá čo deliť — jeho prvý mesiac je neúplný, ale celý patrí jednej firme. Rovnako odchod: obedy po posledný deň patria firme, v ktorej bol.

Ostatné rozmery obmedzené nie sú, lebo sa zapisujú po dňoch a spätne sa nič neprepisuje — zmena prevádzky platí odo dneška, minulý týždeň si drží, čo mal.

#### Obrazovka so zoznamom ľudí

Zoznam sa nebude čítať po číslach — bude sa v ňom **hľadať a triediť podľa toho, čo kto je**. Preto:

**Roly sú vidieť na prvý pohľad.** Predák a admin majú odlišný riadok — farebný pruh na kraji a odznak pri mene. Nie iba stĺpec so slovom *predák*, ten sa v stovke riadkov stratí.

**Predáci a admini sa dajú vytiahnuť navrch**, bez ohľadu na číslo. Je to prepínač, nie natvrdo: pri prideľovaní ľudí chceš mať predákov na očiach, pri kontrole zoznamu chceš abecedu.

**Prepínanie pohľadov** namiesto jedného dlhého zoznamu:

| Pohľad | Načo |
|---|---|
| **aktívni** *(predvolený)* | bežná práca |
| **bez zaradenia** | **najdôležitejší pri zavádzaní** — ľudia, ktorým ešte chýba firma, tím, predák alebo prevádzka |
| podľa firmy · tímu · prevádzky · poskytovateľa | kontrola po skupinách |
| predáci · admini | kto má aké práva |
| živnostníci | iný výstup pri uzávierke (6.2a) |
| neaktívni | archív, oddelene od živých |

**Pohľad *bez zaradenia* je vlastne zoznam nedokončenej práce.** Po importe je v ňom všetkých 33 ľudí a ako sa dopĺňajú väzby, vyprázdňuje sa. Keď je prázdny, zavádzanie je hotové — a nikto nemusí prechádzať riadok po riadku a hľadať, na koho sa zabudlo.

Ten istý pohľad je užitočný aj potom: nový človek z importu doň spadne sám a je vidieť, že ho treba zaradiť skôr, než mu bude treba objednať obed.

#### Ručne zadané prebíja importované

Toto pravidlo platí pre **všetky importy v appke** — menoslov, dochádzku aj čokoľvek, čo pribudne neskôr. Každá hodnota si nesie svoj **pôvod**: *z importu* alebo *ručne*.

| Čo import nájde | Čo urobí |
|---|---|
| prázdna hodnota | **doplní** bez pýtania |
| hodnota **z predchádzajúceho importu** | **prepíše** — opravený súbor má opraviť aj údaje |
| hodnota zadaná **ručne** | **nechá tak** a zapíše do zoznamu rozdielov |

Dôvod je jednoduchý: ručný zápis je rozhodnutie človeka, ktorý o veci vedel viac než súbor. Keby ho import prepísal, tá informácia zmizne bez stopy — a nikto si nevšimne, že zmizla. Preto sa **rozdiely ukážu a čaká sa**: buď sa prevezme jeden riadok, alebo všetky naraz, ale vždy vedome.

**Pred zápisom sa vždy ukáže, čo sa stane.** Nie hlásenie po skončení, ale obrazovka pred ním: *„doplní sa 12 · prepíše sa 4 · v rozpore s ručným zadaním 3 (nechám tak)"* — a až pod tým tlačidlo. Import, ktorý najprv zapíše a potom oznámi, sa nedá vziať späť.

**Spájací kľúč je celý štvorciferný kód** (`PersonalAccessCode`), nie poradové číslo v rámci firmy. **Nič sa neprečíslováva** — ten kód už existuje, je na kartách a v dochádzke. Appka si vedie oba údaje a do mzdového exportu dá ten, ktorý mzdový softvér požaduje; vnútorne spája cez štvorciferný. Overené na skutočných dátach: číslo `008` majú dvaja rôzni ľudia v dvoch firmách, rovnako `002` a `014`. Pri spájaní cez poradové číslo by dvom rôznym ľuďom splynuli obedy aj zrážky.

#### Jeden kľúč, viacero označení — nie druhé číslo

Ponúka sa zaviesť **vlastné obedové číslo** a medzi ním a dochádzkovým kódom držať prevodník. Neodporúčam to a dôvod je jednoduchý: **prevodná tabuľka je druhý zdroj pravdy o tom, kto je kto.** Keď sa raz rozíde — nová karta, preklep, zabudnutý riadok — nikto nevie, ktorá strana má pravdu, a zistí sa to až na zrážke u nesprávneho človeka.

Stavba, ktorá dá to isté bez tej ceny:

| | |
|---|---|
| **Vnútorný kľúč** | vlastný, neviditeľný, nemenný. Naveky sa naň viažu objednávky, zrážky aj história |
| **Dochádzkový kód** | *údaj* na osobe. Spája sa cezeň import (`08-vstupne-subory.md`) |
| **Mzdové číslo** | *ďalší údaj*, ak mzdový softvér chce iné |
| **Číslo karty** | *ďalší údaj*, ak ho raz treba |

Rozdiel oproti prevodníku je v tom, na čom stojí história. **Vnútorný kľúč nie je dochádzkový kód** — je ním len *naplnený* pri prvom importe. Preto sa dochádzkový kód môže kedykoľvek zmeniť a nedotkne sa to ničoho: minulé obedy, uzavreté mesiace ani zrážky sa nehýbu, prepíše sa jedno pole.

Tým odpadá aj obava, ktorá vedie k druhému číslu — *„čo keď sa dochádzkomer vymení"*. Vtedy sa raz prepíšu kódy a appka beží ďalej. **Druhé číslo by sa muselo udržiavať každý deň, aby raz za desať rokov niečo uľahčilo.**

> Ak by predsa vzniklo interné obedové číslo (napríklad kvôli papierovým hárkom), patrí do tabuľky vyššie ako **ďalší údaj**, nie ako druhý kľúč s prevodníkom. Označení môže mať osoba koľko chce; **kľúč jeden.**

**Brigádnici** (žatva, sezónne práce) sú **osoby s krátkou platnosťou**, nie zvláštny druh záznamu. Založia sa menom, tímom a dátumom do; kartu a kód dostávajú v dochádzke tak či tak, takže sa dajú importovať rovnako ako ostatní. Keď obdobie uplynie, sami vypadnú z matice a nikto ich nemusí upratovať.

Pre prípad, že ani to nie je dosť rýchle — príde partia na dva dni a nikto ich nestíha zakladať — má predák možnosť objednať **porcie navyše bez mena**, viazané na tím a prevádzku. Vtedy sa nedajú komu účtovať, takže idú na stredisko. Je to ústupok, nie predvolený režim: bezmenná porcia znamená, že sa neskôr nedá zistiť, kto ju zjedol.

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
7. **Poradie sa prechádza dopredu, nie až pri probléme.** Appka prejde najbližšie štyri týždne a vypíše tímy, ktoré v niektorý deň ostanú bez zodpovednej osoby — buď preto, že sú preč predák aj všetci jeho zástupcovia, alebo preto, že zástupcu nemá nikto zadaného. Toto je jediná časť mechanizmu, ktorá funguje **skôr**, než sa niečo pokazí; zvyšok (bod 3) je záchranná sieť. Obrazovka je v 5.8.

Zástupca môže zastupovať aj viac tímov naraz (viac blokov pod sebou).

### 1.4 Neprítomnosť — jeden záznam, tri použitia

Záznam *kto je preč, od–do, prečo* už v koncepte je — appka ho vedie predákom, aby sa podľa neho zapínalo zastupovanie (1.3). **Stačí zrušiť to obmedzenie a viesť ho pre každého stravníka.** Nie je to nová vec, je to tá istá vec bez zbytočného plotu.

Dôvod je krátky zoznam: *dovolenka · PN · školenie alebo služobná cesta · iné*. Nič viac — nie je to modul na evidenciu dochádzky.

Ten jeden záznam potom obsluhuje tri veci naraz:

| Použitie | Čo z toho plynie |
|---|---|
| **zastupovanie** *(už funguje)* | preč je predák → zapne sa zástupca |
| **matica predáka** | dni sa nastavia na *bez obeda* a je pri nich vidieť **prečo** |
| **kontrola cez dochádzku** (6.5) | neprítomnosť je **očakávaná**, takže sa nehlási ako nález |

Tretí riadok je hlavný dôvod, prečo to má zmysel. Bez neho by pri uzávierke vypadol zoznam, v ktorom je polovica ľudí na dovolenke — a zoznam, v ktorom je väčšina nálezov nezaujímavá, nikto po druhýkrát neotvorí.

Tri pravidlá, aby to nezavadzalo:

1. **Nič neblokuje.** Deň označený neprítomnosťou sa dá kedykoľvek prebiť — človek sa vráti skôr, príde na pár hodín, zastaví sa po obed. Je to predvolená hodnota, nie zámok. Rovnaký princíp ako pri delegácii, ktorá nikdy neberie práva stravníkovi.
2. **Nie je povinné.** Kto nič nezadá, appka funguje presne ako doteraz — dni ostanú nerozhodnuté a hromadné odhlásenie rozsahu dní zostáva.
3. **Nie je to rozpor s rozhodnutím 23.** Zákaz „kopírovať minulý týždeň" stojí na tom, že skopírovaná voľba je **odhad**, ktorý sa tvári ako odpoveď. Dovolenka nie je odhad — je to informácia, ktorú niekto vie a zapísal ju.

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
| **Ručne** (vždy dostupné) | týždenný editor 5 dní × N jedál, našepkávač už použitých názvov | menu chodí papierom, telefonicky alebo v tele e-mailu |
| **Import XLSX/CSV** | admin nahrá súbor, appka predvyplní menu, admin skontroluje a potvrdí; mapovanie stĺpcov sa uloží pre daného dodávateľa | dodávateľ posiela tabuľku |
| **Prilepenie textu** | admin skopíruje menu do textového poľa, appka sa pokúsi rozpoznať dni a jedlá, admin opraví a potvrdí | menu chodí ako PDF alebo v tele e-mailu |

Spoločné pravidlo: **žiadny import sa neuloží bez potvrdenia človekom.** Rozpoznávanie zlyhá vždy, keď dodávateľ zmení formát, a nepovšimnutá chyba v menu znamená zlé počty pre kuchyňu.

Ručný editor musí byť dobrý, lebo je to fallback pre všetkých. Pri 3 jedlách × 5 dní × 2 dodávateľov je to ~5 minút týždenne — import sa oplatí až pri väčších ponukách.

**Do MVP ide ručný editor.** Import a prilepenie textu prídu ako druhý krok, keď uvidíme reálne súbory od konkrétnych dodávateľov — bez vzorky by som ich robil naslepo.

### 3.3 Menu bez názvov jedál — plnohodnotný režim
Názvy jedál sú **vždy voliteľné**. Admin môže zadať len počet jedál a appka pracuje čisto s označením (`A`, `B`, `C` / `1`, `2`, `3` / …). Vypĺňanie „bravčový rezeň s broskyňou" nikto nevynucuje.

Ako to funguje v praxi:

| | Bez názvov | S názvami |
|---|---|---|
| Zadanie menu adminom | nastaví sa raz, ďalej sa nerobí nič | ~5 min týždenne |
| Na nástenke | **papierové menu od dodávateľa** | tlač z appky (5.5) |
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

Ďalšie uľahčenie pre tých, čo názvy vypĺňať chcú: **našepkávač z histórie.** Dodávatelia väčšinou rotujú jedlá v cykle, takže po pár týždňoch stačí napísať „vypráž" a zvyšok sa doplní. Našepkávač je bezpečný v tom, čím sa líši od kopírovania celého týždňa: ponúka, ale nič nezapíše bez toho, aby to človek potvrdil.

Nastavenie je per poskytovateľ aj per týždeň — jeden dodávateľ môže mať názvy, druhý len písmená, a v týždni, keď sa adminovi nechce, sa jednoducho nevyplnia. Appka si nikdy nepýta niečo, bez čoho vie fungovať.

### 3.4 Miesta výdaja — ľudia, ktorí sa cez týždeň pohybujú

Kto je počas týždňa raz v závode a raz na inej prevádzke, potrebuje vedieť povedať, **kam sa mu obed má doviezť.** Áno, appka to má vedieť — ale ťažisko nie je vo voľbe stravníka.

**Miesto nie je voľná voľba, je to zoznam.** Kam sa vozí, určuje dodávateľ, nie stravník. Preto sú miesta výdaja **nastavením per poskytovateľ**, rovnako ako počet jedál či termín odhlásenia:

| Údaj miesta | Načo |
|---|---|
| názov a skratka | skratka sa vojde do bunky matice aj na papierový hárok (`VR`, `TM`, `NR`) |
| čas dovozu | ľudia potrebujú vedieť, o koľkej tam jedlo bude |
| **minimum porcií** | pod istý počet dodávateľ nikam nepôjde a je lepšie to vedieť dopredu |
| vlastný čas na odhlásenie | ak auto vyráža skôr, deadline je skorší; prázdne = platí termín dodávateľa (4.2) |

**Default a výnimka, nie voľba každý deň.** Osoba má **domovské miesto** (nastavuje admin, tak ako poskytovateľa — 3.1). Deväťdesiat percent dní sa je tam. Konkrétny deň sa dá prepnúť inam a to je **výnimka**: zapíše sa len odchýlka, nie stav. Pýtať sa na miesto pri každom dni by zdvojnásobilo prácu v matici kvôli hŕstke dní a rozbilo by to trojstavový model (4.6) — vznikol by štvrtý stav „jedlo zvolené, miesto nie".

**Kde sa to zadáva:**
- **matica predáka** má prepínač *Jedlo / Miesto výdaja* — druhý pohľad na tú istú tabuľku, nie druhý riadok v každej bunke. Ovláda sa rovnako (šípky, medzerník, prvé písmeno skratky). Kto v ten deň obed nemá, má pomlčku: **bez obeda niet čo voziť.** V pohľade na jedlá pripomína odchýlku značka v rohu bunky.
- **stravník** dostane voľbu miesta hneď po výbere jedla — a len vtedy, keď jeho dodávateľ vozí na viac miest. Inak sa neukáže nič.
- **papierový hárok** (5.5) nemá stĺpec navyše; do políčka sa dopíše skratka za písmeno, `B/TM`. Stĺpec pre každý deň by hárok rozbil, dopísaná skratka nie.

**Čo je na tom naozaj dôležité — objednávka sa delí.** Dodávateľ nepotrebuje len súčet, potrebuje vedieť, **koľko boxov ide kam**. Preto objednávka obsahuje súhrn *aj* rozpis podľa miest. Keby dostal len súčet, uvarí správne a doveze zle, čo je na obed rovnako zlé.

Z toho vyplývajú dve veci, ktoré by inak potichu nefungovali:
1. **Minimum na dovoz** sa kontroluje pri **týždennej uzávierke**, nie ráno v deň obeda. Vtedy sa s tým ešte dá niečo spraviť — dohodnúť výnimku, alebo tých pár ľudí presunúť do závodu. Appka deň označí a ponúkne oboje; **neblokuje** voľbu, lebo nevie, či dodávateľ výnimku dá.
2. **Presun medzi miestami je korekcia.** Keď niekto v deň obeda je inde, celkový počet ostane rovnaký a napriek tomu treba prebaliť auto. Denná korekcia (4.3) preto obsahuje aj tabuľku presunov, nielen storná a doobjednávky.

**Kontrola konfliktu:** ak má niekto domovské miesto, kam jeho pridelený dodávateľ nevozí, appka to **ohlási v admine**. Bez toho by sa mu obed ticho vozil na prvé miesto zo zoznamu — teda tam, kde nie je.

**Ak vozí dodávateľ na jediné miesto, neexistuje o čom hovoriť.** Appka sa vtedy na miesto nepýta nikde: ani v matici, ani v telefóne, ani na hárku, ani v objednávke. Funkcia sa nezapína prepínačom, zapne sa tým, že sa zadá druhé miesto.

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

### 4.5a Spätný zápis — zaznamenať obed, ktorý sa už zjedol

Je to iná operácia než výnimka z 4.5. Tam sa mení niečo, čo appka poslala. Tu sa **dopisuje niečo, čo sa stalo mimo nej**: obed, ktorý sa objednal telefónom, na papieri alebo pred spustením appky.

Prvé použitie príde hneď — pri nábehu (kapitola 14). Pilot sa nezačne prvého v mesiaci; obedy z prvých dní sú už objednané, uvarené a zjedené, ale mzdový podklad za ten mesiac musí byť celý. Spätný zápis je jediný spôsob, ako sa mesiac uzavrie správne.

Hodí sa aj potom: zberný hárok príde neskoro, chyba sa nájde deň po termíne, niekto sa vráti z PN a obed mu objednali telefonicky.

**Pravidlá:**

| | |
|---|---|
| Kto | **len admin.** Predákovi termíny platia — inak by prestali platiť úplne |
| Kam | **len do otvoreného mesiaca.** Zamknutý mesiac sa nedopisuje, tam ide oprava ako položka do ďalšieho (6.3) |
| Cena | z **dňa, ktorého sa zápis týka** (6.1), nie dnešná |
| Stopa | kto, kedy, prečo — a **príznak ostáva na tom dni natrvalo** |

**Objednávka dodávateľovi sa neodosiela.** Toto je najdôležitejšie pravidlo a zároveň jediné, kde sa dá spätný zápis pokaziť: obed sa už uvaril a zjedol. Keby zápis prešiel bežnou cestou, appka by objednala jedlá na deň, ktorý dávno bol. Spätný zápis teda **zapíše a odosielanie preskočí** — vedome, nie ako vedľajší účinok.

**Zadáva sa hromadne, nie po dňoch.** Mesačná mriežka *ľudia × dni*, tá istá ako týždenná matica, len širšia — admin ju prepíše zo zberných hárkov. Pri pilote je to šesť ľudí × tri dni, teda pár minút.

**Vidno to aj v číslach.** Uzávierka pri každom mesiaci ukáže *„z toho 34 zadaných spätne"*. Nie preto, že je to podozrivé, ale preto, že sa to nemá stratiť: keď o pol roka niekto porovná appku s faktúrou, má vidieť, ktoré porcie appka nikdy neobjednala.

> **Je to diera v disciplíne, ktorú má appka vytvárať** — a preto je vidieť. Keby bol spätný zápis pohodlný a tichý, termíny by o pol roka prestali znamenať čokoľvek: vždy sa to dá dopísať potom. Admin, dôvod, príznak, počet v uzávierke. Nie zákaz, ale ani zvyk.

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

Poradie dôležitosti je dané tým, kto appku reálne otvorí: **matica predáka (5.2) je najdôležitejšia obrazovka celého systému**, hneď za ňou admin (5.3) papierové výstupy (5.5) a tabuľa v jedálni (5.4). Obrazovka stravníka (5.1) je jednoduchá a lacná, robíme ju pre tú menšinu, ktorá ju používať bude — a tá časom porastie.

### 5.1 Stravník (mobile-first)
1. **Budúci týždeň** — hlavná obrazovka. 5 kariet Po–Pia, každá ukazuje voľbu alebo „neobjednané". Hore odpočet do uzávierky. Ťuk na deň → zoznam jedál môjho poskytovateľa → ťuk na jedlo → uložené (bez tlačidla „Potvrdiť", ukladá sa priebežne, s undo).
2. **Tento týždeň** — len na čítanie + tlačidlo *Odhlásiť sa* pri dňoch, kde ešte beží denný deadline.
3. **Môj prehľad** — mesiac, počet obedov, cena spolu, príspevok zamestnávateľa, **koľko mi ide zo mzdy**.
4. **Profil** — zmena PIN, notifikácie, jazyk.

> **Prečo tu nie je „kopírovať minulý týždeň"** (rozhodnutie 23). Vyzerá to ako najlacnejšie zrýchlenie, ale nefunguje: menu je každý týždeň iné, takže `B` z minulého týždňa je tento týždeň iné jedlo. Skopírovaná voľba je teda vo väčšine prípadov nesprávna — a čo je horšie, **tvári sa vybavene**. Prázdna bunka kričí „doriešiť ma", vyplnená sa nespýta nikoho na nič. Zamaskovali by sme presne tie diery, kvôli ktorým máme trojstavový model (4.6). Zrýchlenie hľadáme inde: v klávesovom prepise v matici predáka (5.2), kde sa celý tím zadá bez myši.

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
- prepínač **Jedlo / Miesto výdaja** — druhý pohľad na tú istú tabuľku, keď dodávateľ vozí na viac miest (3.4)
- na tablete to isté prstom: dosť veľké dotykové plochy priamo v riadku
- hromadné akcie: nastaviť celý riadok na jedno jedlo, hromadné odhlásenie na rozsah dní (dovolenka/PN), vyprázdniť maticu
- tlač: zberný hárok, zoznam chýbajúcich, potvrdenie tímu (5.5)
- **zastupované tímy** ako samostatné bloky pod vlastným tímom, zreteľne odlíšené (1.3)
- v deň obeda sa v riadku dnešného dňa objaví možnosť **doobjednať** (ak to poskytovateľ dovoľuje, 4.3)

### 5.3 Admin
Poskytovatelia · Cenník a príspevky · Menu (týždenný editor, kopírovanie predchádzajúceho týždňa) · Používatelia, tímy a zástupcovia · Termíny a sviatky · Zostavy a exporty · Mesačná uzávierka · Audit log · Notifikácie.

Navyše **prehľad stavu pred uzávierkou**: ktoré tímy majú koľko chýbajúcich objednávok, zoradené od najhoršieho. Admin tak vidí, kde treba zavolať predákovi — alebo že predák je preč a treba delegovať.

### 5.4 Tabuľa v jedálni
Tablet alebo televízor pri výdaji, ktorý ukazuje **dnešné menu, počty porcií a odpočet do uzávierky**. Len na čítanie, bez ovládania.

- **Žiadne mená.** Je to verejná stena, na ktorú vidí každý vrátane návštev, a čo kto je, sú osobné údaje. Na tabuli sú len jedlá a počty.
- **Odpočet do uzávierky je hlavný dôvod, prečo tabuľu robiť.** Visí na mieste, kde každý deň stojí celý závod, a pripomína práve to, na čo sa najčastejšie zabúda. Pri stovke ľudí bez firemných mailov je to účinnejšia pripomienka než notifikácia v aplikácii, ktorú väčšina z nich nemá.
- Zobrazuje sa aj **zajtrajšie menu** — ľudia sa vedia zariadiť.
- Technicky je to **obyčajná adresa otvorená v prehliadači na celú obrazovku**, ktorá sa sama obnovuje. Bez prihlásenia — práve preto na nej nesmú byť osobné údaje — chránená nezverejnenou adresou.
- **Home Assistant nie je potrebný.** Ak ho firma používa, tú istú stránku vie vložiť do svojho panelu ako okno, prípadne si vyžiadať počty a zobraziť ich po svojom. Je to voliteľná nadstavba, nie závislosť.

### 5.5 Papierové výstupy — plnohodnotná súčasť, nie doplnok
Ak väčšina ľudí appku neotvorí, papier nie je ústupok — je to **hlavný kanál k stravníkovi**. Všetko na jedno kliknutie, A4/A3, veľké písmo, čitateľné z dvoch metrov:

1. **Menu na nástenku** — budúci týždeň, per poskytovateľ, s označením jedál (A/B/C) a cenou. Generuje sa hneď po zadaní menu. *(Má zmysel len ak sú vyplnené názvy — bez nich ide na nástenku papierové menu od dodávateľa, viď 3.3.)*
2. **Zberný hárok** — tím v riadkoch, Po–Pia v stĺpcoch. Vytlačí sa, zavesí vedľa menu, ľudia si voľbu zapíšu perom, predák ju prepíše do appky. Takto to bude v skutočnosti fungovať, tak nech to appka podporuje priamo.
   **Kombinovaný zber:** kto si už objednal sám v appke, má voľbu na hárku **predtlačenú sivou** a políčko prečiarknuté — aby ju nikto nezapisoval druhýkrát a predák nemusel rozmýšľať, čo je nové. Hárok sa dá vytlačiť kedykoľvek počas týždňa a vždy ukazuje aktuálny stav.
3. **Potvrdenie tímu po uzávierke** — čo má kto objednané. Zavesí sa vedľa menu, aby si to ľudia mohli skontrolovať skôr, než bude neskoro.
4. **Denný hárok pre výdaj** — kto má dnes čo. Podrobne nižšie, lebo je to jediný nástroj, ktorým sa dá skontrolovať prevzatie.
5. **Zoznam chýbajúcich objednávok** — pre predáka pred uzávierkou.

#### Denný hárok pre výdaj

**Jeden hárok = jedna prevádzka × jeden poskytovateľ × jeden deň.** Vždy zvlášť, aj keď sa v ten deň varí na tri miesta — každé miesto má iný čas dovozu a iného človeka, ktorý pri ňom stojí.

To rozdelenie **aj podľa poskytovateľa** je dôležitejšie, než sa zdá: jedlá sa označujú `A/B/C` v rámci menu, takže `B` od jednej jedálne a `B` od druhej sú dve rôzne veci. Na spoločnom hárku by sa nedali rozlíšiť.

**Čo je v hlavičke:** prevádzka · dátum · poskytovateľ · čas dovozu · **koľko porcií bolo objednaných a kedy sa objednávka odoslala**. Posledný údaj je tam preto, aby sa rozdiel medzi papierom a tým, čo naozaj prišlo, dal zachytiť pri výdaji, nie až o mesiac pri faktúre.

**Riadok:**

| Priezvisko a meno | Kód | Jedlo | Prevzaté |
|---|---|---|---|
| Kováč Peter | 1042 | B | ☐ |
| Nováková Mária | 1043 | A | ☐ |

**Meno aj kód, nie jedno z toho.** Meno preto, že človek pri výdaji pozná ľudí podľa mena, nie podľa čísla — hárok len s kódmi znamená vyhľadávanie pri každej porcii. Kód preto, že samotné meno nestačí: dvaja Kováči v jednom rade sú bežná vec a v koncepte je to už raz spomenuté ako zdroj omylov.

**Jedlo len ako písmeno, nie názov.** Kto potrebuje vedieť, čo je `B`, pozrie na menu vedľa. Hárok sa tým zúži a zároveň sa na ňom neocitne text typu *bezmäsité* alebo *diabetické* — voľba jedla môže naznačiť zdravotný stav alebo vyznanie a hárok pri výdaji vidí každý, kto stojí v rade (kapitola 12).

**Odškrtávacie políčko** na hárku je, ale **nič sa naň nevieša.** Stojí nula a keď sa niekde nájde človek, ktorý ho ochotne odškrtáva — napríklad predák, čo si obedy pre tím vyzdvihuje sám — bude sa hodiť. Nepočíta sa s ním ale ako s mechanizmom a **do appky sa nič neprepisuje.**

Dôvod je vecný, nie technický: pri výdaji stojí zamestnanec **dodávateľa**, nie náš. Nemáme ho ako poveriť a nemá dôvod to robiť. A hárok odškrtnutý spolovice je horší než neodškrtnutý — vyzeral by ako údaj a nebol by ním, takže by sa podľa neho účtovalo nesprávne.

**Neprevzaté obedy sa hľadajú inou cestou** — cez prítomnosť (6.5). Tá chytí prípad, ktorý naozaj stojí peniaze: *obed v deň, keď človek v práci nebol*. Prípad *bol v práci a neprišiel si poň* je zriedkavý a do istej miery sa rieši sám, lebo kto si obed platí, spravidla si poň príde.

**Zoradenie:** predvolene podľa priezviska, lebo pri výdaji sa hľadá jeden človek. Prepínateľné **po tímoch**, s každým tímom na novej strane — vtedy sa hárok dá roztrhať a dať predákom, ktorí si svoju skupinu skontrolujú sami.

**Pätička:** súčty po jedlách (`A: 12 · B: 8 · C: 4`), spolu, a prázdne miesto na dopísanie počtu neprevzatých. Súčet na papieri sa musí zhodovať s počtom v hlavičke — ak nie, niekto je na hárku navyše alebo chýba, a to sa má zistiť ráno.

Zberný hárok má aj druhý účel: je to **dôkaz**. Keď objednávky zadáva predák, spor „ja som chcel B" padá na neho — a papier s vlastnoručne zapísanou voľbou ten spor ukončí. Audit log povie, kto to zadal; hárok povie, podľa čoho.

### 5.6 Mesačná uzávierka a kontrola faktúry
Mesiac sa neuzatvára tlačidlom, ale **postupom, ktorý sa nedá preskočiť**: mesiac skončil → prišli faktúry → rozdiely sú vyriešené → zamknuté a odoslané mzdám. Stav je na obrazovke vždy vidieť, aby bolo jasné, na čom to stojí.

**Kontrola faktúry.** Appka pozná presný počet porcií, lebo ho sama odoslala, a pozná každé storno aj doobjednávku s časom. Vie teda faktúru nielen porovnať, ale aj **povedať, čím rozdiel vznikol**:

| Zadávanie | Kedy |
|---|---|
| **Len súčet** — počet a suma | prvá kontrola, pol minúty; ak sedí, hotovo |
| **Po dňoch** | až keď súčet nesedí — až tam sa ukáže deň, ktorý rozdiel vyrobil |

**Políčka faktúry sa nikdy nepredvypĺňajú našimi číslami.** Predvyplnená kontrola je kontrola, ktorú si odklepneme sami sebe. Rovnaký dôvod ako pri rozhodnutí 23.

Typické nálezy a ich riešenie (každý sa musí zvoliť, inak sa mesiac nezamkne):

| Nález | Odkiaľ to appka vie | Riešenie |
|---|---|---|
| **storno po dennej uzávierke** | má čas storna aj čas uzávierky | **plná cena bez príspevku** *(predvolené, 6.4)* / štandardne s príspevkom / znáša firma |
| **rozdiel bez záznamu** | v audite k tomu dňu nič nie je | overiť u dodávateľa / uznať / žiadať dobropis |
| **iná cena, rovnaký počet** | priemerná cena za obed nesedí s cenníkom | doplniť cenník s platnosťou od dátumu / reklamovať |

Tretí riadok je dôvod, prečo je v súčtovom režime aj **priemerná cena za obed**: počet a suma sú dve nezávislé príčiny a bez tohto údaja by sa cenový posun schoval do počtu.

**Voliteľný krok navyše: načítať dochádzku** (6.5). Doplní ku každému obedu príznak, či bol človek v ten deň v práci — z toho vypadne zoznam obedov v dňoch neprítomnosti, teda presne tie prípady, ktoré sa účtujú v plnej cene (6.4). Uzávierka bez neho beží normálne; kto ho nepoužije, len tie dni nenájde.

**Rozúčtovanie** sa počíta z cien platných v deň obeda (6.1), nie z dnešných, a **korekcie sa do neho zarátajú až po vyriešení** — kým je rozdiel otvorený, v rozúčtovaní je namiesto sumy počet nevyriešených.

**Uzavretie** čísla zafixuje. Neskoršia oprava už do uzavretého mesiaca nevstúpi, ide do najbližšieho otvoreného ako samostatná položka s odkazom na pôvodný mesiac (6.3). Ku každej uzávierke sa uloží kto, kedy, s akými číslami a **ako sa ktorý rozdiel vyriešil** — po roku si to nikto nepamätá.

### 5.7 Kalendár sviatkov a zatvorených dní
Jeden zoznam, z ktorého čítajú objednávky, uzávierky aj mesačné rozúčtovanie. Tri druhy dní:

| Druh | Kto ho určuje | Rozsah |
|---|---|---|
| **štátny sviatok** | zákon — appka si ho drží sama | nevarí nikto, needituje sa |
| **závod zatvorený** | správca | celozávodná dovolenka, odstávka — neobjednáva sa vôbec |
| **dodávateľ nevarí** | správca, **per dodávateľ** | napr. školská jedáleň cez prázdniny; ostatní varia ďalej |

Pevné sviatky sú zoznam, **Veľký piatok a Veľkonočný pondelok si appka počíta** — sú pohyblivé a ručne udržiavaný zoznam by raz do roka niekto zabudol doplniť.

Čo z kalendára vyplýva:
- **Deň, v ktorý sa nevarí, sa v objednávke neukáže vôbec** — nie zošedený a neklikateľný. Šedé políčko láka na otázku „prečo sa nedá", chýbajúci stĺpec ju nevyvolá.
- **Uzávierky sa posúvajú.** Ak je piatok sviatok, týždenná uzávierka je vo štvrtok o 12:00. Pri dennom odhlasovaní s pravidlom *predchádzajúci pracovný deň* sa počíta posledný deň, keď sa naozaj pracovalo, nie kalendárne včerajšok (4.2).
- **Zatvorenie dňa, na ktorý sú už objednávky, ich zruší.** Appka najprv povie koľko ich je a koho sa to týka, potom sa spýta. Dotknutí predáci dostanú upozornenie a dodávateľovi ide opravená objednávka.
- **Do fakturácie taký deň nevstúpi.** Uzávierka číta ten istý kalendár, takže nemôže účtovať deň, na ktorý sa nedalo objednať.

Najlacnejší okamih na zatvorenie dňa je skôr, než sa otvorí objednávkové okno — vtedy ho ešte nikto nevidel a nikoho neprekvapí. Obrazovka to hovorí priamo pri každom dni.

### 5.8 Zastupovanie — obrazovka
Prevedenie mechanizmu z 1.3 do jednej tabuľky **„kto objednáva za koho"** ku zvolenému dňu. Pre každý tím sa ukáže **reťaz**: predák → 1. zástupca → 2. zástupca, s prečiarknutými tými, čo sú v ten deň preč, a zvýrazneným tým, na kom sa to zastavilo.

Hlavná hodnota obrazovky nie je tabuľka, ale **panel rizík**: appka prejde najbližšie štyri týždne deň po dni a vypíše tímy, ktoré v niektorý deň ostanú **bez zodpovednej osoby** — či už preto, že sú preč všetci zástupcovia naraz (v lete pravidlo, nie výnimka), alebo preto, že predák žiadneho nemá. Dopredu, nie v ten deň ráno. To je celé zdôvodnenie, prečo sa zástupcovia zadávajú v poradí.

Ďalej obrazovka drží:
- **neprítomnosti** (dovolenka, PN, školenie) — zastupovanie sa podľa nich zapne a vypne samo; ručné odovzdanie tímu ostáva možné na deň, týždeň aj hodinu,
- **poradie zástupcov** per predák, s výslovným označením *bez zástupcu* tam, kde chýba,
- **záznam o zastupovaní** — kto, za koho, kedy a čo spravil.

**Čo zástupca smie:** objednávať a meniť objednávky prevzatého tímu, odhlasovať jeho ľudí, vidieť jeho zberný hárok a menu. **Čo nesmie:** ceny, príspevky, nastavenia dodávateľov, mzdové podklady, prideľovanie ľudí. Prevzatie má vždy koniec a skončí samo — trvalý prístup „lebo vtedy zastupoval" je najbežnejší spôsob, ako sa oprávnenia rozliezajú po firme.

---

## 6. Ceny, príspevky a mzdy

Toto je vrstva, ktorá appku spája s účtovníctvom, a zároveň jediná časť, kde chyba stojí peniaze. Preto:

### 6.1 Cenník
- Cena je vlastnosť **položky menu** (jedlá jedného poskytovateľa môžu mať rôznu cenu; polievka a dezert majú vlastnú cenu, ak sa objednávajú samostatne).
- Cenník má **platnosť od dátumu**. Zmena ceny nikdy nemení už uzamknuté týždne.
- **Cena sa odfotí na objednávku** v momente zamknutia týždňa. Retroaktívna zmena cenníka nesmie prepísať históriu — inak sa mesačná uzávierka rozíde s tým, čo ľudia videli.
- Všetky sumy sú v **centoch ako celé čísla**, nikdy `float`. Zaokrúhľovanie definované na jednom mieste.

### 6.2 Rozúčtovanie ceny obeda

Cenu určuje jedáleň **bez DPH** a k nej svoju sadzbu. Všetko ostatné sú **nastavenia s platnosťou od dátumu** (6.1), nie konštanty.

| Nastavenie | Predvolené |
|---|---|
| cena jedla **bez DPH** | z cenníka poskytovateľa |
| sadzba DPH dodávateľa | 19 % |
| **príspevok zamestnávateľa** — % z ceny bez DPH | **55 %** *(zákonné minimum)* |
| **príspevok stravníka** — % z ceny bez DPH | 35 %, v ekonomickom modeli pásmo **35–45 %** |
| sadzba DPH k príspevku stravníka | 19 % |
| doplatok zo **sociálneho fondu** | **nenastavuje sa — dopočíta sa** |

**Model sa volí pri každom poskytovateľovi zvlášť**, nie jedným prepínačom pre celú appku. Dôvod je praktický: keby bol jeden na všetko, nedalo by sa rozlíšiť *drahá jedáleň, ktorú si niekto vybral z chuti* od *drahej jedálne, ktorá je jediná dostupná na vzdialenej prevádzke*. Pri prvej má zmysel príspevok zastropovať, pri druhej by to trestalo ľudí za to, kde pracujú.

**Predvolený je ekonomický** a je to bezpečná predvoľba — viď poznámku o totožnosti na konci kapitoly.

#### Model A — štandardný

Pevné percentá, sociálny fond je zvyšok:

```
zamestnávateľ = 55 %
stravník      = 35 %
sociálny fond = zvyšok, teda 10 %
```

Škáluje s cenou. Pri drahšom jedle rastie všetko úmerne — **aj to, čím prispieva sociálny fond.**

#### Model B — ekonomický

Rieši práve to, čo model A nerieši: **aby sa luxus nepreplácal zo sociálneho fondu.** Vychádza sa z **cenovej hladiny základného poskytovateľa** a fond sa použije len do jej výšky.

```
zl55  = 55 % z ceny                          ← vždy, zákonné minimum
strop = 55 % zo základnej ceny + SF pri nej  ← nominálna suma, koľko chce firma dávať
stravník = C − strop,  orezané do pásma 35 % až 45 % z ceny
sociálny fond = C − zl55 − stravník          ← zvyšok, nikdy záporný
```

Poradie je podstatné: **najprv sa doťahuje stravník, až potom sa siahne na fond.** Fond dopĺňa len to, čo ostane.

Príklad pri základnej cene **5,00 €** — strop je teda `2,75 + 0,50 = 3,25 €`:

| cena bez DPH | 55 % | z fondu | **zamestnávateľ** | stravník | podiel | +DPH | **platí stravník** |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 5,00 *(základ)* | 2,75 | 0,50 | **3,25** | 1,75 | 35,0 % | 0,33 | **2,08** |
| 5,50 | 3,02 | 0,22 | **3,25** | 2,25 | 40,9 % | 0,43 | **2,68** |
| 5,75 | 3,16 | 0,09 | **3,25** | 2,50 | 43,5 % | 0,48 | **2,98** |
| **5,91** | 3,25 | 0,00 | **3,25** | 2,66 | 45,0 % | 0,51 | **3,16** |
| 6,50 | 3,58 | — | **3,58** | 2,92 | 45,0 % | 0,56 | **3,48** |
| 7,00 | 3,85 | — | **3,85** | 3,15 | 45,0 % | 0,60 | **3,75** |

**Zlom je pri 5,91 €.** Do tej ceny fond dopĺňa a príspevok zamestnávateľa drží presne na strope. Nad ňou už samotné zákonné minimum strop prekročí, **fond sa nepoužije vôbec** a rozdelenie je presne 55 / 45. Nad zlomom teda každé zdraženie nesie stravník.

> **Model je uzavretý sám v sebe.** Keďže `55 % + 45 % = 100 %`, pri hornom okraji pásma vychádza fond presne na nulu a nikdy nemôže vyjsť záporný. Žiadna cena, ani neobmedzene vysoká, model nerozbije.

**Čo sa nastavuje:** spodná a horná hranica pásma stravníka (35–45 %). Základná cena sa **nenastavuje ručne** — appka berie **najnižšiu cenu spomedzi aktívnych poskytovateľov** platnú v ten deň. Udržiava sa tým sama: keď pribudne lacnejšia jedáleň, hladina klesne bez zásahu.

*Poistka pre nepravdepodobný prípad:* ak by najlacnejšia jedáleň vozila len na jednu malú prevádzku a bolo by nespravodlivé odvádzať od nej hladinu pre všetkých, dá sa základný poskytovateľ **určiť ručne**. Predvolene sa neurčuje.

> **Pri najlacnejšom poskytovateľovi sú oba modely totožné.** Ak sa hladina odvodzuje od jeho vlastnej ceny, strop vyjde `55 % + 10 % = 65 %`, na stravníka ostane presne 35 % — teda štandardný model. **Ekonomický model je zovšeobecnením štandardného, nie jeho protikladom.** Preto sa dá zapnúť predvolene pri každej novej jedálni: pri tej najlacnejšej nemá žiadny účinok, pri drahšej ho má. Odškrtnúť sa dá kedykoľvek.

**Ochrana pri ukladaní:** `príspevok zamestnávateľa + horná hranica stravníka` nesmie presiahnuť 100 % — inak by fond vyšiel záporný. Appka to odmietne pri ukladaní nastavenia, nie až pri uzávierke.

**Kde sa zaokrúhľuje — rozhodnuté.** Počíta sa **na obede v plnej presnosti a zaokrúhľuje sa až mesačný súčet za osobu.** Pri dvadsiatich obedoch by sa inak nazbieral rozdiel oproti tomu, čo firma zaplatila jedálni. Sociálny fond sa počíta **bez DPH z ceny bez DPH**; DPH sa pripočítava len k podielu stravníka.

### 6.2b Nárok na príspevok a zákonný strop — dve rôzne veci

Ľahko sa zlejú do jednej, ale sú to dve nezávislé podmienky a appka ich rieši inak.

#### Nárok — odpracovaná zmena

Príspevok patrí zamestnancovi, ktorý v rámci zmeny **odpracoval viac než štyri hodiny**. To je aj dôvod, prečo sa neodhlásený obed v deň neprítomnosti účtuje v plnej cene (6.4) — nárok v ten deň nevznikol.

**Toto je presne to, na čo je v importe prítomnosti stĺpec `hodiny`** a nie iba *áno/nie* (`08-vstupne-subory.md`). Z hodín sa dá odvodiť nielen *bol/nebol*, ale aj hraničný prípad *bol, ale krátko*.

| Čo appka vie | Ako sa zachová |
|---|---|
| prítomnosť **nie je naimportovaná** | nárok sa **predpokladá** — tak ako to funguje dnes na papieri |
| `hodiny > 4` | nárok potvrdený |
| `hodiny > 0`, ale ≤ 4 | **označí na rozhodnutie**, neúčtuje sama |
| `hodiny = 0` | obed v deň neprítomnosti → zoznam podľa 6.4 |

Tretí riadok nemá appka riešiť sama: krátka zmena môže byť skrátený úväzok, prerušená práca aj zle pípnutá karta. **Označí a čaká**, rovnako ako pri všetkom ostatnom, čo vie len naznačiť.

#### Strop — číslo, ktoré sa mení niekoľkokrát ročne

Zákon obmedzuje príspevok zamestnávateľa hornou hranicou naviazanou na **stravné pri pracovnej ceste 5–12 hodín**. Tá suma sa mení opatrením MPSVR aj viackrát do roka, takže **nemá čo byť v kóde ani vo vzorci** — je to nastavenie s platnosťou od dátumu, ako všetko ostatné v 6.1.

Pri cenách obeda okolo 5–7 € je 55 % niečo medzi 2,75 a 3,85 €, čo je pod tou hranicou — **strop teda pravdepodobne vôbec nezasiahne.** To ale nie je dôvod ho vynechať: ceny rastú a hranica sa mení nezávisle od nich.

Preto: strop je **zapnuteľný a datovaný**, appka ho vyhodnotí pri každom obede a keď zasiahne, **napíše to** namiesto tichého orezania — *„príspevok orezaný stropom, 3,85 → 3,60"*. Tichý strop je najhorší možný: čísla nesedia a nikto nevie prečo.

**Čo treba od účtovníčky:** jedno číslo a dátum, odkedy platí. Nie schému.

### 6.2a Zamestnanci a živnostníci — rovnaký výpočet, celkom iná cesta peňazí

**Typ vzťahu je vlastnosť osoby, nie firmy.** Brigádnik u tej istej firmy môže byť v pracovnom pomere aj živnostník, takže sa to nedá odvodiť od firmy ani od skupiny v dochádzke. Osoba má teda **dva nezávislé údaje**: *firma* (ku ktorej patrí) a *typ vzťahu* (`PP` / `živnostník`).

Rozdiel nie je vo vzorci. Vzorec je rovnaký — 55 / 35 / zvyšok, DPH rovnako. Rozdiel je v tom, **kade tečú peniaze**:

| | Pracovný pomer | Živnostník |
|---|---|---|
| Kto platí dodávateľovi | **firma** (jedna faktúra za všetkých) | **on sám**, v plnej cene |
| Ako firma prispieva | príspevok + sociálny fond, priamo v cene | **nepriamo** — o tú sumu si zvýši faktúru voči firme |
| Ako sa vyrovnáva so stravníkom | **zrážka zo mzdy** | nič sa nevyrovnáva, zaplatil si sám |
| Čo z appky vyjde | **mzdový podklad** — príkaz, čo zraziť | **prehľad** — informácia, koľko si pridať a koľko dlží |
| Sociálny fond | vstupuje | **nevstupuje vôbec** |

**Čo z toho plynie pre appku:**

1. **Živnostník nie je v mzdovom podklade.** Ani ako riadok s nulou. Do exportu pre mzdy sa nedostane.
2. **Vzorec sa mu aj tak počíta** — inak by sa nevedelo, o koľko si má zvýšiť faktúru. Appka teda spočíta príspevok presne tak, ako keby bol zamestnanec, a výsledok len pošle iným smerom.
3. **Sociálny fond sa ho netýka.** Nejde o plnenie zo Zákonníka práce, takže sa mu z fondu nič nepočíta — suma, ktorú by fond doplácal zamestnancovi, je u neho súčasťou tej istej odmeny na faktúre.
4. **Prehľad je výstup, nie podklad.** Nikto podľa neho nič nestrháva; slúži jemu, aby vedel, čo fakturovať, a nám, aby sme vedeli, čo čakať.
5. **Neodhlásený obed sa ich týka tiež** (6.4), len inde. Voči dodávateľovi sa nemení nič — platia plnú cenu vždy. Mení sa **odmena na faktúre**: prispieva sa za odpracovaný deň, nie za deň, keď človek v práci nebol. Taký obed teda ostáva celý na ňom. Zoznam dní *na rozhodnutie* pri uzávierke (6.5) preto obsahuje **aj živnostníkov** — u zamestnanca to rozhoduje o zrážke, u živnostníka o tom, či sa obed dostane do odmeny.
6. **Prehľad je dostupný aj počas mesiaca**, nie až po uzávierke. Slúži aj na to, aby sa vedelo dopredu, aké sumy sa v ňom asi zbiehajú — po osobách aj po prevádzkach. Do uzavretia mesiaca je to odhad a je tak aj označený.

**Prehľad pre živnostníkov** má štyri triedenia — tie isté čísla, štyri pohľady. Podrobná stavba listu je v 6.3:

| Triedenie | Na čo je |
|---|---|
| **po osobách** | každý sám za seba: koľko obedov, koľko dlží dodávateľovi, **koľko si pridať na faktúru**, a koľko by doplácal, keby bol zamestnanec |
| **po firmách** | koľko odmien z ktorej firmy vzniklo — nesie ich firma, ku ktorej človek patrí |
| **po prevádzkach** | kde tie peniaze vznikajú |
| **po poskytovateľoch** | koľko z toho ide ktorej jedálni |

#### Odmena sa počíta od nákladu firmy, nie od ceny obeda

**Určujúce pravidlo: firmu má obed stáť rovnako, nech je stravník zamestnanec alebo živnostník.** Či je ten živnostník platiteľ DPH, je jeho vec a nemá to hýbať tým, koľko firma dáva.

To obracia smer výpočtu. Nepočíta sa *„príspevok podľa vzorca, a DPH nech dopadne ako chce"*, ale naopak:

```
X = príspevok + sociálny fond, presne ako keby bol zamestnanec   ← čo firmu stojí
riadok na faktúre = taká suma, aby firmu stála X
```

| Živnostník | Riadok na jeho faktúre |
|---|---|
| neplatiteľ DPH | `X` |
| platiteľ DPH, firma si DPH odpočíta | `X` *(DPH sa vyrovná)* |
| platiteľ DPH, firma si DPH odpočítať nemôže | `X ÷ (1 + sadzba)` |

Vo všetkých troch riadkoch firmu obed stojí `X`. Líši sa len číslo na papieri.

Appka preto potrebuje pri osobe **príznak platiteľa DPH** a jedno globálne nastavenie: *je DPH z tejto odmeny pre firmu nákladom, alebo si ju odpočíta?* Predvolene **odpočíta** — firmy sú platiteľmi a ide o službu prijatú k podnikaniu.

> **Zostáva jediná vec pre účtovníčku, a je to jedna veta, nie schéma:** *odpočíta si firma DPH z tejto odmeny, alebo je pre ňu nákladom?* Podľa toho sa prepne to nastavenie. Ako sa položka na faktúre pomenuje, je tiež na nej — appka to slovo len vytlačí. **Otvorená otázka 16.**

#### Čo treba potvrdiť s mzdovým oddelením pred spustením
- [ ] percentá 55 / 35 a sadzbu DPH k príspevku stravníka (19 %)
- [ ] **ktorý z dvoch modelov** sa zapne — štandardný alebo ekonomický (6.2)
- [ ] pri ekonomickom: **kto je základný poskytovateľ** a aké je pásmo stravníka (35–45 %)
- [ ] či sa uplatňuje **strop** naviazaný na stravné pri pracovnej ceste 5–12 h
- [ ] **kde sa zaokrúhľuje** — na obede alebo až na mesačnom súčte (odporúčam druhé)
- [ ] potvrdiť, že **neodhlásený obed ide v plnej cene** bez príspevku aj bez fondu (6.4)
- [ ] **schéma pre živnostníkov** — odmena na faktúre namiesto príspevku, jej daňový režim a DPH (6.2a)
- [ ] formát, v akom mzdový softvér vie načítať export (6.3)
- [ ] dokedy v mesiaci musí byť podklad odovzdaný → z toho vyplynie termín mesačnej uzávierky

### 6.3 Mesačná uzávierka a export

Admin **uzavrie mesiac** → čísla sa zafixujú, ďalšie zmeny idú len ako opravná položka do ďalšieho mesiaca (aby sa nemenil už odovzdaný podklad pre mzdy).

#### Dva zámky, nie jeden

Mzdový podklad má odísť **do 5.–6. dňa** mesiaca. Faktúra od dodávateľa dovtedy prísť nemusí. Keby bola uzávierka jeden úkon, tieto dva termíny by sa bili — a keďže mzdový je tvrdý a nezávisí od nás, prehrala by kontrola faktúry.

Mesiac sa preto zamyká **dvakrát, nezávisle**:

| Zámok | Kedy | Čo zamkne |
|---|---|---|
| **Mzdová uzávierka** | do 5.–6. dňa | počty, ceny a zrážky — z toho, čo appka sama odoslala |
| **Fakturačná kontrola** | keď príde faktúra | porovnanie s papierom (5.6) |

Mzdová uzávierka **nečaká na faktúru**. Appka pozná presný počet porcií, lebo ho sama odoslala — nepotrebuje ho od nikoho potvrdiť. Keď potom faktúra príde a niečo nesedí, rozdiel sa vyrieši a ide **ako opravná položka do najbližšieho otvoreného mesiaca** s odkazom na pôvodný.

To nie je poľavenie z rozhodnutia 25. To hovorí, že **nevyriešený rozdiel nesmie zmiznúť** — a nezmizne: druhý zámok ostane otvorený a je vidieť na obrazovke, kým sa nevyrieši. Hovorí, že sa nesmie prehliadnuť, nie že sa kvôli nemu má zdržať výplata.

> Praktický dôsledok pre dodávateľov: **čím skôr príde faktúra, tým menej opravných položiek.** Je to prosba, nie podmienka — appka funguje aj s faktúrou, ktorá príde dvadsiateho. Otázka je v `06-otazky-pre-dodavatela.md`.

**Výstup nie je jeden list.** Peniaze sa zbiehajú u viacerých strán a každá potrebuje vidieť len svoj diel, ale v tej istej štruktúre. Výstup je preto rozdelený **za každú firmu zvlášť** a v rámci nej **po poskytovateľoch**:

#### Za firmu — zamestnanci

| Riadok | Na čo je |
|---|---|
| počet obedov, po poskytovateľoch | koľko sa toho zjedlo a u koho |
| cena spolu bez DPH · DPH · s DPH | základ pre všetko ostatné |
| **príspevok zamestnávateľa** | náklad firmy |
| **sociálny fond** | druhý náklad firmy, oddelene |
| **zrážky zo mzdy spolu** | čo si má firma vybrať od ľudí, kontrolný súčet mzdového podkladu |
| **čo očakávať na faktúre** od každého dodávateľa | jediné číslo, ktoré sa porovnáva s papierom |

Posledný riadok je celý zmysel toho listu. Firma vopred vie, aká suma jej má prísť od ktorého dodávateľa — a keď nepríde, hneď vidieť z ktorej strany.

#### Za živnostníka — každý sám za seba

Tie isté stĺpce, len pre jednu osobu. Navyše sa vždy eviduje, **ku ktorej firme patrí** — tá nesie nepriamy príspevok, takže sa to musí dať sčítať aj za ňu.

| Riadok | |
|---|---|
| firma, ku ktorej patrí | |
| počet obedov, po poskytovateľoch | |
| **cena spolu s DPH** | **toto reálne platí dodávateľovi** |
| *koľko by bol príspevok zamestnávateľa, keby bol zamestnanec* | → **suma, ktorú si pridá na faktúru** |
| *koľko by bol sociálny fond, keby bol zamestnanec* | → tiež do odmeny |
| *koľko by ešte doplácal, keby bol zamestnanec* — suma **plus DPH**, presne ako zamestnancom | na porovnanie: toto je, čo ho to má stáť po započítaní odmeny |

**Počíta sa to tým istým vzorcom ako zamestnancom** — len sa to ukáže dvakrát: raz *ako keby* a raz ako to naozaj je. Rozdiel medzi tými dvoma stĺpcami je presne to, čo firma prispieva nepriamo.

#### Za firmu — živnostníci, tie isté riadky

Nad jednotlivcami je **sumár za firmu v rovnakej štruktúre ako pri zamestnancoch**. Tie isté riadky, aby sa dali čítať vedľa seba a porovnávať:

| Riadok | Zamestnanci | Živnostníci |
|---|---|---|
| počet obedov, po poskytovateľoch | ✓ | ✓ |
| cena spolu bez DPH · DPH · s DPH | ✓ | ✓ |
| príspevok zamestnávateľa | náklad firmy | *ako keby* → do odmeny |
| sociálny fond | náklad firmy | *ako keby* → do odmeny |
| doplatok stravníka s DPH | zrážka zo mzdy | *ako keby*, na porovnanie |
| **čo firmu tento mesiac stálo** | príspevok + fond | **odmeny na faktúrach** |
| čo očakávať na faktúre od dodávateľa | ✓ | ✓ alebo *fakturuje sa im priamo* |

#### Za firmu — spolu

Posledný list je súčet oboch: **koľko firmu obedy stáli celkovo**, zamestnanci aj živnostníci, a koľko z toho niesol sociálny fond. Bez neho by sa dalo odpovedať len na polovicu otázky.

Rovnaké súčty sú aj **po prevádzkach a po poskytovateľoch** — tie isté čísla, iné triedenie. Štatistika nikdy nezaškodí a pri rozhodovaní o dodávateľoch je to jediný podklad, ktorý existuje.

#### Ostatné výstupy

- **Export pre mzdy** — **jeden súbor za firmu**, živnostníci v ňom nie sú. Stĺpce: osobné číslo · meno · firma · stredisko/tím · počet obedov · cena spolu · príspevok ZL · sociálny fond · **zrážka zo mzdy**.

  **Univerzálny, nie šitý na mieru.** Každá firma má vlastný mzdový softvér, takže prispôsobovať sa jednému by ostatným nepomohlo. Export je preto **XLSX aj CSV**, CSV v UTF-8 **s BOM** (inak Excel rozbije diakritiku) a s voliteľným oddeľovačom. Stĺpce majú zrozumiteľné názvy a pevné poradie, takže sa dajú namapovať kdekoľvek. Ak sa niektorý softvér ukáže ako vyberavý, doplní sa preň predvoľba — ale až podľa skutočného odmietnutia, nie dopredu podľa dohadov.
- **Súhrn po prevádzkach a po poskytovateľoch** — tie isté čísla, iné triedenie. Na otázku *kde tie peniaze vznikajú*.

> **Kto komu fakturuje, je nastavenie poskytovateľa**, nie otvorená otázka. Dodávateľ buď fakturuje živnostníkom priamo (a firemná faktúra je bez ich porcií), alebo fakturuje všetko firme a tá to preúčtuje. Rozdelený výstup zvládne oboje — v prvom prípade sa proti faktúre porovnáva len firemná časť a živnostník dostane svoje číslo na vlastnú kontrolu, v druhom celok. Nastaviť sa to ale **musí**, inak by kontrola faktúry hlásila rozdiel každý mesiac.

### 6.4 Neodhlásené obedy
Ak sa človek neodhlási včas a obed si neprevezme, porcia je uvarená a vyfakturovaná. **Predvolené pravidlo: účtuje sa v plnej cene** — bez príspevku zamestnávateľa a bez sociálneho fondu.

Nie je to trestanie, je to dôsledok toho, ako príspevok vzniká. **Príspevok na stravovanie je viazaný na odpracovanú zmenu.** V deň, keď človek v práci nebol, teda nemá z čoho vzniknúť — a keby sme ho aj tak pripočítali, firma by z vlastných nákladov zaplatila 55 % obeda, na ktorý nárok nebol. Rovnako sa nepoužije sociálny fond. Zostáva plná cena vrátane DPH.

Politika ostáva **nastavením** — sú aj firmy, ktoré to riešia inak, a nechceme, aby zmena znamenala zásah do kódu:

| Voľba | Kedy dáva zmysel |
|---|---|
| **plná cena bez príspevku** *(predvolené)* | bežný prípad; jediná voľba, pri ktorej firma neplatí za nič |
| `účtovať štandardne s príspevkom` | ak to mzdár po posúdení nároku pripustí |
| `neúčtovať`, znáša firma | jednorazové situácie, kde je vymáhanie drahšie než porcia |

To isté pravidlo sa použije pri odhlásení po termíne cez admina (4.5) aj pri doobjednávke predáka (4.3).

**Ako sa taký obed vôbec nájde.** Appka sama od seba nevie, či si niekto obed prevzal — vie len, že bol objednaný. Preto sa pri uzávierke dá načítať dochádzka a porovnať (6.5). To je jediný praktický spôsob, ako sa na tieto dni prísť, kým neexistuje evidencia prevzatia (fáza 3).

> **Právny základ nech potvrdí účtovníčka.** Viazanosť príspevku na odpracovanú zmenu je dôvod, prečo je plná cena predvolená; presné znenie podmienky ale patrí jej, nie mne. Je to súčasť otázky 5 v `04-otazky-pre-mzdara.md`.

### 6.5 Prítomnosť na pracovisku — import dochádzky pri uzávierke

Dochádzka sa v appke používa **dvakrát a zakaždým inak**:

| Kedy | Načo | Čo z toho appka spraví |
|---|---|---|
| **pri zakladaní ľudí** (1.3b) | mená, osobné čísla, kto pribudol a kto zmizol | návrh na doplnenie zoznamu |
| **pri mesačnej uzávierke** (5.6) | kto bol v ktorý deň v práci | **príznak prítomnosti** k jednotlivým obedom |

Druhé použitie je nové. Súbor sa načíta rovnako ako pri zakladaní ľudí — spája sa cez **celý štvorciferný kód** — a ku každému obedu doplní jediný údaj: *bol v ten deň v práci, alebo nie.*

**Čo sa tým získa:**

1. **Triedenie a filtrovanie.** Mesačný prehľad sa dá zoradiť aj podľa tohto príznaku — nielen po firmách, tímoch a prevádzkach.
2. **Zoznam obedov v dňoch neprítomnosti.** Presne tie prípady z 6.4. Bez dochádzky sa nájdu len náhodou.
3. **Kontrola opačným smerom.** Človek bol v práci celý mesiac a neobjednal si ani raz — objednáva si mimo appky, alebo naňho predák zabúda?

**Čo sa tým nezíska, a je dôležité to nepomiešať:**

> **Prítomnosť nie je prevzatie.** Kto bol v práci, obed prevziať nemusel. Kto v práci nebol, mohol si poňho poslať. Dochádzka je preto **indícia, nie dôkaz** — a podľa indície sa nesmie strhávať zo mzdy.

Preto platí tvrdé pravidlo: **import nikdy nič neúčtuje sám.** Označí deň ako *na rozhodnutie* a čaká. Rozhodnutie spraví človek — jedným kliknutím na riadok, alebo hromadne na celý zoznam, keď je jasné, že ide o ten istý prípad. Voľba sa uloží do auditu spolu s tým, kto ju spravil, aby sa dalo o rok povedať, prečo bola tomu človeku strhnutá plná cena.

**Import je voliteľný.** Uzávierka bez neho funguje presne tak ako doteraz — len sa tie dni nenájdu. Nie je to podmienka uzavretia mesiaca; je to nástroj, keď ho treba.

#### Ručná oprava prítomnosti

Dochádzka nie je neomylná: zabudnutá karta, služobná cesta, práca z iného miesta. Preto sa **každý deň dá prepnúť ručne** — priamo v zozname, s povinnou poznámkou prečo. Takto opravený deň dostane pôvod *ručne* a **ďalší import ho už neprepíše** (1.3b): ukáže rozdiel a nechá rozhodnúť.

Poradie je tu dôležité opačne než pri menoslove. Pri ľuďoch sa najprv importuje a potom dopĺňa; pri dochádzke sa **najprv importuje, potom opravuje** — a od tej chvíle je oprava silnejšia než súbor. Kto si dal námahu zistiť, že Kováč bol na školení a kartu nepípol, nemá o to prísť tým, že sa súbor nahrá druhýkrát.

Pred každým importom sa ukáže **čo sa prepíše**, s rozpisom podľa toho istého pravidla: doplní sa · prepíše sa · v rozpore s ručným zadaním.

#### Formát vstupu

Dochádzkomer nevyhovuje priamo — jeho export obsahuje osoby, nie dni. Súbor sa teda pripraví zvlášť a appka číta **jednoduchý dohodnutý tvar**, nie natívny export:

```
osobne_cislo;datum;hodiny
1042;2026-08-03;8.5
1042;2026-08-04;0
```

Tri stĺpce, jeden riadok = jeden človek a jeden deň. Podrobná špecifikácia vrátane hraničných prípadov je v `docs/08-vstupne-subory.md` — je napísaná tak, aby sa dala odovzdať komukoľvek, kto ten prevod spraví.

**Prečo takto a nie natívny export:** appka sa neviaže na jeden konkrétny dochádzkový systém. Keď sa dochádzkomer o tri roky vymení, mení sa prevodník — jeden malý skript — a nie appka.

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
| Zberný hárok, potvrdenie tímu, zoznam chýbajúcich (5.5) | predákovi | na požiadanie | PDF |

### 7.2.1 Automatické odosielanie dodávateľom
Nastavuje **admin, samostatne pre každého poskytovateľa**:

| Nastavenie | Poznámka |
|---|---|
| **E-mailové adresy** | viac adries (kuchyňa + fakturácia). Kópia chodí vždy adminovi, aby existoval ľudský svedok. |
| **Odstup od uzávierky** | *hneď · +30 min · +1 h · +2 h*. Skorší čas nedáva zmysel — pred uzávierkou počty ešte nie sú konečné. |
| **Posielať korekciu aj bez zmien** | áno/nie. Odporúčam áno: mlčanie je nejednoznačné, kuchyňa nevie, či sa nič nezmenilo, alebo appka spadla. |

**Časy sa počítajú z uzávierok daného poskytovateľa, nie z pevného rozvrhu.** To je dôvod, prečo to musí byť per poskytovateľ: kto má odhlasovanie *v deň obeda o 07:30*, dostane korekciu ráno na ten istý deň; kto má *predchádzajúci pracovný deň o 14:00*, dostane ju poobede na nasledujúci pracovný deň. „Ráno po dennej uzávierke" teda platí len pre časť dodávateľov.

**V tele e-mailu sú počty aj ako čistý text**, nielen v prílohe — kuchyňa ho číta na telefóne a otvárať PDF je zbytočná prekážka. PDF a XLSX sú priložené pre archív a účtovníctvo.

> **⚠️ Objednávka nesmie obsahovať odkaz na odhlásenie z odberu.** Overené na prvom skúšobnom e-maile: odosielacia služba doň pridala hlavičku `List-Unsubscribe` a Gmail nad správou zobrazil pruh *„Táto správa bola poslaná z databázy emailových adries"* s tlačidlom **Neodoberať**.
>
> Sú s tým dva problémy a druhý je vážny:
> 1. Objednávka obedov vyzerá ako reklamná pošta, čo jej uberá na dôveryhodnosti presne u toho, kto podľa nej má variť.
> 2. **Keby na to kuchár klikol, odosielacia služba si jeho adresu zapíše medzi odhlásené a ďalšie objednávky mu už nepošle.** Prestali by chodiť ticho — appka by odosielanie považovala za úspešné a chyba by sa ukázala až tým, že sa jedného dňa neuvarí.
>
> Preto sa hlavička v odosielacej službe **vypína**, a to ešte pred prvým ostrým odoslaním. Je to nastavenie účtu, nie niečo, čo vie appka prebiť — hlavičku pridáva relay až po tom, čo správu odovzdáme.
>
> Toto je zároveň ukážka, prečo sa skúšobná správa posiela **na Gmail a číta sa aj to, čo je nad ňou**, nielen či prišla.

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

> **Odkaz sám o sebe potvrdenie nespraví — musí otvoriť stránku s tlačidlom.** Znie to ako krok navyše, ale je nutný: **e-mailoví klienti a bezpečnostné skenery odkazy v správach samy navštevujú**, aby overili, či nevedú na škodlivý obsah. Microsoft Defender, firemné antivírusy aj náhľady odkazov to robia bežne a bez toho, aby o tom človek vedel.
>
> Keby potvrdenie prebehlo už otvorením odkazu, **objednávku by nám „potvrdil" robot skôr, než by ju uvidel kuchár** — a appka by prestala hlásiť práve tie prípady, kvôli ktorým celá poistka existuje. Tichý súhlas od skenera je horší než žiadny, lebo vyzerá ako dobrá správa.
>
> Preto: odkaz otvorí stránku, na nej sú **počty na tie dni** a tlačidlo. Potvrdenie zapíše až stlačenie tlačidla. Vedľajší zisk je, že dodávateľ potvrdzuje **konkrétne čísla**, nie len to, že mu prišiel e-mail — a tie čísla má pred očami ešte raz.
>
> V samotnom e-maile môže odkaz vyzerať ako tlačidlo, to je len vzhľad. Skutočné tlačidlo priamo v tele správy (Gmail Actions, AMP for Email) existuje, ale vyžaduje registráciu u Googlu, funguje len v Gmaile a pri ostatných klientoch je aj tak potrebná záložná cesta. Za tú komplikáciu to nestojí.
- Admin nastaví **per poskytovateľ, do kedy potvrdenie čakať** (nevyžadovať / 30 min / hodina / dve).
- Ak potvrdenie nepríde včas, appka **eskaluje**: SMS dodávateľovi a upozornenie adminovi „Sever nepotvrdil objednávku, zavolajte im".
- Neisté *„asi to dorazilo"* sa tým mení na jednoznačné *„potvrdili o 12:07"* — a to je zároveň **dôkaz pri spore o počty**.
- **Potvrdenie platí pre konkrétne čísla, nie pre e-mail.** Keď po ňom príde korekcia (storno, doobjednávka, presun medzi miestami), staré potvrdenie sa tým **stáva neplatným** a appka žiada nové. Inak by sa dodávateľ mohol brániť tým, že potvrdil niečo iné, než nakoniec platilo — a mal by pravdu.
- Odkaz je **jednorazový a viazaný na danú objednávku**. Po použití alebo po dni obeda prestane platiť; kto ho dostane preposlaný o týždeň, ním už nič nepotvrdí.

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

#### E-mail — cez odosielaciu službu, nie cez hosting
Pri nastavovaní sa ukázalo, že **e-mailová služba u Webglobe je pre doménu vypnutá** a poštu pre `ahafarma.sk` obsluhuje **firemný server v technickej miestnosti** (`62.169.176.222`). Zvažovali sa tri cesty:

| Cesta | Prečo nie / áno |
|---|---|
| Zapnúť poštu u Webglobe | ❌ formulár ponúka len `@ahafarma.sk`, podadresa sa nedá; zapnutie by Webglobe spravilo obsluhou pošty hlavnej domény, hoci MX smeruje inam |
| Firemný server | ❌ naviazalo by odosielanie objednávok na prúd a internet v závode; navyše treba otvoriť odosielací port pre IP aplikačného servera |
| **Odosielacia služba (Brevo)** | ✅ nezávislá od oboch, zadarmo pri našom objeme, dáta v EÚ, **hlási odrazy** |

Nastavenie:
- odosielacia doména **`obedy.ahafarma.sk`** — overuje sa len podadresa, hlavná doména ostáva nedotknutá,
- odosielateľ `objednavky@obedy.ahafarma.sk`,
- **`Reply-To` smeruje na skutočnú firemnú schránku**, pretože odosielacia služba vie len posielať. Keď dodávateľ odpovie, správa dorazí človeku.

Hlásenia o odrazoch od služby dopĺňajú *aktívne potvrdenie* z 7.2.1 — technickú chybu zachytíme hneď, ľudské potvrdenie hovorí, že objednávku niekto naozaj videl.

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
- **E-mail:** odosielacia služba **Brevo** (EÚ) na podadrese `obedy.ahafarma.sk`. Pošta u Webglobe je pre doménu vypnutá a firemný server v technickej miestnosti by odosielanie objednávok naviazal na prúd a internet v závode — viď 9.1.
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
- **Tabuľa v jedálni sa nerobí** (rozhodnutie 42), takže mená ani voľby nie sú nikde na verejnej obrazovke.
- **Denný hárok pre výdaj** mená obsahuje — je to prevádzkový dokument pre človeka pri výdaji, nie nástenka. Preto je na ňom jedlo len ako písmeno (`A/B/C`), nie názov: hárok vidí každý, kto stojí v rade, a *bezmäsité* alebo *diabetické* na ňom nemá čo robiť. Po dni sa neodkladá na pult.
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
5. ~~**Mzdový softvér**~~ — **vyriešené inak, než sa čakalo:** každá firma má vlastný. Prispôsobovať sa jednému nemá zmysel, takže export je **univerzálny a dokumentovaný** (6.3) — XLSX aj CSV, pevná zrozumiteľná sada stĺpcov, jeden súbor za firmu. Doladí sa podľa toho, čo ktorý softvér naozaj nezoberie. **Termín: podklad do 5.–6. dňa mesiaca.**
6. ~~**Zoznam zamestnancov**~~ — **vyriešené:** menoslov je pripravený v dohodnutom tvare, **33 ľudí** (prefixy `1`, `2`, `3`). Importuje sa ako *osobné číslo · priezvisko · meno*; väzby sa dopĺňajú v appke z rozbaľovacích zoznamov (1.3b, rozhodnutie 37). Ostáva doplniť **firmu, typ vzťahu, tím, predáka a prevádzku** ku každému — to je otázka na HR, nie na súbor.
7. ~~**Doména a e-mailová schránka**~~ — **vyriešené:** podadresa `obedy.firma.sk` na firemnej doméne, pripraví firemný IT technik. Zadanie preňho je v `docs/02-zadanie-pre-it.md`.
8. ~~**Hostia a návštevy**~~ — **vyriešené: áno, a nič sa preto nestavia.** Použije sa mechanizmus, ktorý už v koncepte je — **porcia bez mena viazaná na tím a prevádzku, účtovaná stredisku** (1.3b, pôvodne pre narýchlo príchodzích brigádnikov). Pribudne len dôvod *hosť*, aby sa dalo rozlíšiť v zostave. Hosť nemá nárok na príspevok ani na fond, takže ide v plnej cene.
9. ~~**Prevzatie obeda**~~ — **vyriešené: neevidovať.** Pri výdaji stojí zamestnanec dodávateľa, nie náš; nemáme ho ako poveriť a hárok odškrtnutý spolovice by bol horší než neodškrtnutý. Políčko na hárku ostáva ako pomôcka, ale **nič sa naň nevieša** a do appky sa neprepisuje (5.5). Obedy, ktoré naozaj stoja peniaze — v dňoch neprítomnosti — chytá import prítomnosti (6.5).
10. **Miesta výdaja** (3.4) — treba zozbierať od dodávateľov: **kam sú ochotní voziť, o koľkej a od koľkých porcií.** Bez minima a času dovozu je nastavenie len polovičné.
11. ~~**Príplatok za dovoz na vzdialenejšie miesto**~~ — **vyriešené:** na našich prevádzkach sa neúčtuje. Cena obeda je rovnaká na všetkých miestach. V dátovom modeli ostáva pole s nulou, aby sa dal príplatok zapnúť bez migrácie, keby ho niektorý budúci dodávateľ zaviedol; vtedy sa vráti otázka, kto ho platí (rozhodnutie 35).
12. **Zoznam prevádzok** — na ktorých miestach firma reálne obeduje a kto je kde vedený.
13. ~~**Spôsob úhrady pre živnostníkov**~~ — **vyriešené:** platia dodávateľovi sami v plnej cene. Firma neplatí za nich nič a nič im nestrháva; príspevok dostávajú nepriamo ako **odmenu pripočítanú k ich faktúre** voči firme (6.2a, rozhodnutie 34).
14. ~~**Zoznam firiem**~~ — **vyriešené a potvrdilo to, čo sa tušilo:** prefixy v dochádzke **nie sú firmy**. `1` = Adiumentum, `2` = PD, ale `3` = *živnostníci*, čo je **typ vzťahu, nie firma** — živnostník patrí napríklad pod Adiumentum. Skutočných firiem je viac (Cronus, HBE, …). Prefix sa preto **na nič nepoužije**: dochádzka dodá len ID a meno, firmu aj typ vzťahu zadá admin v appke (rozhodnutie 37). Zoznam firiem sa dopĺňa v nastaveniach a nemusí byť úplný vopred.
15. ~~**Kde sa zaokrúhľuje**~~ — **vyriešené:** v plnej presnosti na obede, zaokrúhľuje sa až **mesačný súčet za osobu** (6.2).
16. **Odmena pre živnostníkov — jedna veta od účtovníčky** (6.2a). Princíp je rozhodnutý: *firmu má obed stáť rovnako, nech je stravník zamestnanec alebo živnostník*, a suma na faktúre sa dopočíta spätne od toho. Ostáva len: **odpočíta si firma DPH z tejto odmeny, alebo je pre ňu nákladom?** Podľa toho sa prepne jedno nastavenie. Plus ako sa tá položka pomenuje.
16a. **Strop — jedno číslo a dátum** (6.2b). Suma naviazaná na stravné pri pracovnej ceste 5–12 h, s platnosťou od dátumu. Pri dnešných cenách obeda pravdepodobne nezasiahne, ale mení sa niekoľkokrát ročne a appka ju má vyhodnocovať. **Otázka pre účtovníčku.**
17. ~~**Kto fakturuje živnostníkom**~~ — **vyriešené:** je to **nastavenie poskytovateľa** (6.3), nie rozhodnutie. Rozdelený výstup zvládne oboje — priamu fakturáciu živnostníkom aj preúčtovanie cez firmu. Od dodávateľa treba len vedieť, ktorý z tých dvoch režimov chce; je to v `06-otazky-pre-dodavatela.md`.
18. ~~**Vie dochádzkomer exportovať denné prítomnosti**~~ — **vyriešené inak:** natívny export nevyhovuje a appka ho ani čítať nebude. Prevod do dohodnutého tvaru `osobne_cislo; datum; hodiny` sa spraví mimo appky; zadanie je v `docs/08-vstupne-subory.md` (rozhodnutie 39). Ostáva overiť, že sa z dochádzkomera dá dostať aspoň *osoba × deň* v akejkoľvek podobe — bez toho niet čo prevádzať.

---

## 14. Nábeh — ako sa prepneme z papiera

Celý zvyšok dokumentu opisuje **ustálený stav**. Prvý mesiac je iný a treba ho naplánovať zvlášť, lebo práve v ňom sa dá pokaziť dôvera v appku na dlho.

### Jeden tím, päť až šesť ľudí, jeden mesiac

Presne tak, ako znel návrh. Jedna prevádzka, jeden poskytovateľ, jeden predák, hŕstka ľudí. Dôvod nie je opatrnosť — je to **rýchlosť opravy**. Keď sa niečo pokazí pri šiestich ľuďoch, vyrieši sa to jedným telefonátom. Pri stovke sa to nevyrieši vôbec.

### Appka je od prvého dňa hlavná, papier je kontrola

Toto je jediné miesto, kde by som navrhovaný postup obrátil. *„Papier ide naostro a appka vedľa neho"* znie bezpečnejšie, ale nefunguje: keď z appky nič nezávisí, predák do nej nezadá načas a nezistí sa nič. **Chyba, ktorá nikoho nebolí, sa neukáže.**

Takže naopak: objednávka dodávateľovi ide z appky, papier sa vedie súbežne a **v piatok sa porovnajú**. Rozdiel medzi nimi je nález. Pri šiestich ľuďoch je najhorší možný následok šesť nesprávnych obedov a jeden telefonát.

### Prvý mesiac musí obsiahnuť aj peniaze

Najčastejšia chyba pri takomto nábehu je odskúšať len objednávanie — tú ľahkú polovicu. Pilot musí dôjsť až na koniec:

- [ ] **spätný zápis dní pred spustením** (4.5a) — pilot sa nezačne prvého v mesiaci, ale mzdový podklad musí byť za celý mesiac
- [ ] týždenná objednávka odoslaná a **potvrdená** dodávateľom, každý týždeň
- [ ] aspoň jedno **odhlásenie po termíne** a jedno **doobjednanie v deň obeda**
- [ ] **mesačná uzávierka** a kontrola proti skutočnej faktúre
- [ ] **mzdový podklad** odovzdaný mzdárke — aj keby bol na šesť riadkov

Uzávierka a mzdový podklad sú tá časť, ktorá sa najhoršie opravuje neskôr, lebo sa dotýka peňazí a už odovzdaných čísel. Musí sa odskúšať prvá, nie posledná.

### Koho vybrať

**Nie nadšencov.** Tím, ktorého predák je svedomitý, ale k technike vlažný — ak to zvládne on, zvládne to každý. Nadšenec obíde každú nedokonalosť sám od seba a neohlási ju.

Ak sa to dá zariadiť, nech je v pilote aspoň jeden človek, ktorý sa počas týždňa pohybuje po viacerých prevádzkach. Miesta výdaja (3.4) sú najkomplikovanejšia časť návrhu a je lepšie ich vyskúšať na jednom človeku než na dvadsiatich.

### Čo sa meria

Nie *„fungovalo to"*, ale:

| | |
|---|---|
| odišla objednávka **načas**, každý týždeň? | |
| **potvrdil** dodávateľ prijatie zakaždým? | |
| koľkokrát sa **objednávalo po termíne** | |
| sedela **faktúra** na prvý pokus? | |
| koľko času tým predák reálne strávil | |

Posledný riadok rozhodne o rozšírení viac než ktorýkoľvek iný. Ak to predákovi zaberie viac času než papier, appka sa neujme, aj keby počítala bezchybne.

### Rozšírenie

Po mesiaci bez rozdielov medzi papierom a appkou pribudne **druhý tím**, potom zvyšok. Papierová kontrola sa udrží ešte jeden mesiac aj u nových tímov a potom sa zruší — okrem zberného hárku, ten ostáva natrvalo (5.5).

**Kým beží pilot, zvyšok firmy objednáva po starom.** Žiadny paralelný polovičný stav pre všetkých.

---

## 15. Fázy

| Fáza | Obsah |
|---|---|
| **0 — Koncept** | tento dokument, odsúhlasenie |
| **1 — Preview** | klikací prototyp bez databázy: login, **matica predáka** vrátane pohľadu na miesta výdaja, týždeň stravníka, admin nastavenia, ručný editor menu, cenník s oboma modelmi príspevku, ukážky tlačových zostáv, tabuľa v jedálni, história, **mesačná uzávierka a kontrola faktúry (5.6)**, **kalendár sviatkov a zatvorených dní (5.7)**, **zastupovanie (5.8)**, logo |
| **2 — MVP** | prihlásenie a roly vrátane superadmina, obnova hesla cez e-mail, týždenná objednávka + uzávierky, denné odhlásenie s pravidlami per poskytovateľ, **doobjednanie predákom + korekčný súhrn**, konfigurácia poskytovateľov vrátane **miest výdaja (3.4)**, ručný editor menu, **matica predáka**, **kalendár sviatkov a zatvorených dní (5.7)**, **neprítomnosti (1.4)**, delegácia, reťaz zástupcov a eskalácia (5.8), **import menoslovu a hromadné priraďovanie väzieb (1.3b)**, ceny a **mesačná uzávierka s kontrolou faktúry (5.6)**, **rozdelený fakturačný výstup (6.3)**, export pre mzdy, denný súhrn pre dodávateľa, **tlačové zostavy vrátane denného hárku pre výdaj (5.5)**, **push notifikácie pre predákov a admina** + sprievodca inštaláciou na plochu, **príloha menu (fotka/PDF/Word)**, **exporty, história a zálohy (kapitola 7)**, audit, nasadenie |
| **3 — Rozšírenia** | grafy a dashboard, **import prítomnosti pri uzávierke (6.5)**, push pre stravníkov, SMS pre predákov ak treba, import menu (XLSX/CSV, prilepenie textu) podľa reálnych vzoriek, evidencia prevzatia v appke *(dovtedy ju plní papierový hárok)*, hostia, SSO, kiosk, rola dodávateľa, prípadná ukrajinčina |

**Tabuľa v jedálni sa nerobí** (rozhodnutie 42) — v preview ostáva ako ukážka, do MVP nejde. Menu na nástenke plní ten istý účel za cenu jedného výtlačku.

Ako sa appka dostane na server, ako sa mení za behu a čo zmena urobí s dátami — samostatne v `docs/07-nasadenie-a-zmeny.md`. Podstatné pre koncept: **cena odfotená na objednávku (6.1) a zamknuté mesiace (5.6) sú to, vďaka čomu sa dá appka meniť aj po rokoch bez toho, aby sa prepisovala minulosť.**

Push je v MVP **len pre predákov a admina** (zopár ľudí, s každým sa dá inštalácia prejsť osobne), pre stravníkov ostáva vo fáze 3. Tlačové zostavy sú naopak plnohodnotnou súčasťou MVP — appku bude držať predák s papierom, nie stravník s telefónom.
