# Etapa 2 — čo bude v prvej funkčnej verzii

Koncept je uzavretý (53 rozhodnutí), preview odsúhlasené. Teraz sa stavia appka.

**Pravidlo pre túto etapu:** prvá verzia nie je zmenšený koncept. Je to **najmenšia vec, s ktorou sa dá spustiť pilot** — jeden tím, päť až šesť ľudí, jedna prevádzka, jeden dodávateľ. Všetko ostatné z konceptu príde, keď bude na čom.

---

## Čo musí byť v prvej verzii

Odvodené z toho, čo pilot naozaj potrebuje spraviť (kapitola 14), nie z toho, čo je v koncepte pekné.

| | Prečo bez toho pilot nezačne |
|---|---|
| **Prihlásenie a roly** — predák, admin | bez toho sa nedá nič |
| **Číselníky** — firmy, prevádzky, poskytovatelia, tímy | matica nemá z čoho čerpať |
| **Ľudia** — import menoslovu, hromadné priradenie väzieb | tých 33 sa nezadá ručne |
| **Menu na týždeň** — označenia jedál + priložené PDF | predák musí vedieť, z čoho sa vyberá |
| **Matica predáka** — trojstavová, týždenná | to je celá appka pre predáka |
| **Týždenná uzávierka** | zamkne týždeň stravníkom |
| **Denná objednávka e-mailom** + potvrdenie prijatia | jediná vec, ktorá ide von |
| **Spätný zápis** (4.5a) | august sa dopisuje od prvého |
| **Mesačná uzávierka a mzdový podklad** | pilot musí dôjsť až po peniaze |
| **Nočná záloha** | dáta pilotu sú skutočné dáta |

## Čo v prvej verzii nebude

Nie preto, že sa na to zabudlo — preto, že to pilot nepotrebuje a každá vec navyše je vec, ktorá sa môže pokaziť.

| | Kedy príde |
|---|---|
| miesta výdaja a minimá | pri druhej prevádzke |
| zastupovanie a eskalácia | pri druhom tíme |
| SMS | keď bude registrovaný odosielateľ `OBEDAR` |
| push notifikácie | po pilote |
| import prítomnosti z dochádzky | keď bude prevodník |
| výstupy pre živnostníkov | keď bude v pilote prvý |
| kalendár sviatkov | v pilote stačí ručne zavrieť deň |
| tabuľa, história, štatistiky | neskôr, nič neblokujú |

**Preview zostáva vyvesené a ukazuje celý cieľový stav.** Slúži ďalej na ukazovanie predákom a mzdárke; appka ho dobieha.

---

## Ako sa to stavia

**Server vykresľuje HTML, žiadny front-endový rámec.** Preview je obyčajné HTML, CSS a trocha JavaScriptu — to isté sa použije v appke. Vzhľad tak bude zhodný s tým, čo už videli predáci, a nasadenie ostane `git pull` bez zostavovania.

| | |
|---|---|
| Beh | Node.js, server-rendered HTML |
| Databáza | PostgreSQL vo vlastnom zväzku |
| Okolie | Docker Compose + Caddy *(už beží)* |
| Prihlásenie | relácia v cookie, heslá cez argon2id |
| Nasadenie | `git pull` + `docker compose up -d` |

**Bez zostavovacieho kroku, bez balíčkovača, bez SPA.** Pri stovke používateľov a jednom vývojárovi je každá ďalšia vrstva len ďalšie miesto, kde sa dá pokaziť nasadenie.

---

## V akom poradí

Každý krok končí niečím, čo sa dá otvoriť v prehliadači a vyskúšať.

1. ~~**Kostra a databáza** — schéma, Docker, prázdna appka s prihlásením~~ **hotové**
2. ~~**Číselníky a ľudia** — import menoslovu, hromadné väzby~~ **hotové**
3. ~~**Menu a matica predáka** — jadro appky~~ **hotové**
4. ~~**Uzávierka týždňa a odoslanie objednávky** — prvá vec, čo ide von~~ **hotové**
5. ~~**Spätný zápis** — dopísanie augusta~~ **hotové**
6. **Mesačná uzávierka a mzdový podklad**
7. **Zálohy a upozornenia** — beží od prvého dňa, dolaďuje sa priebežne

### Čo je hotové po kroku 5

August sa dá dopísať od prvého, takže mesiac bude celý.

| | |
|---|---|
| Spätný zápis | mesačná mriežka *ľudia × dni*, len uplynulé dni, len správca, len do otvoreného mesiaca |
| Dôvod | povinný, uloží sa ku každému dopísanému dňu |
| Príznak | ostáva na dni natrvalo — vidno ho aj v matici predáka (`S`), nielen tam, kde vznikol |
| Objednávka | **spätný zápis dodávateľovi nikdy nič neposiela** a nepýta si ani opravu; do počtov na odoslanie sa neráta |
| Počty | uzávierka týždňa aj obrazovka mesiaca ukazujú, koľko porcií appka nikdy neobjednala |

Zámok mesiaca (`mesiac_stav`) už platí, hoci obrazovka mesačnej uzávierky je až
krok 6 — inak by sa dal mesiac dopisovať aj potom, čo z neho odišiel mzdový podklad.

### Čo je hotové po kroku 4

Objednávka vie odísť do kuchyne — nateraz na adresu správcu, kým sa to odladí.

| | |
|---|---|
| Menu na týždeň | príloha od dodávateľa, názvy jedál, čítanie názvov z prílohy aj z vloženého textu |
| Matica predáka | trojstavový deň, viac jedální na človeka, neprítomnosti, hromadné odhlásenie |
| Uzávierka týždňa | počty po jedlách, menovitý zoznam nerozhodnutých, znenie správy pred odoslaním |
| Objednávka | e-mail s počtami v tele správy aj so zošitom v prílohe, na adresu z karty jedálne |
| Záznam | čo presne odišlo, komu a kedy — aj keď odoslanie zlyhalo, aj s dôvodom |
| Potvrdenie | odkaz bez prihlásenia; zapíše ho až stlačenie tlačidla, nie otvorenie odkazu |

**Adresa jedálne je jediné, čo treba prepnúť pri ostrom spustení.** Berie sa
z karty jedálne v Číselníkoch; kým sa ladí, je v nej adresa správcu.

### Čo je hotové po kroku 2

Pilot sa dá celý pripraviť v appke — bez zásahu do databázy.

| | |
|---|---|
| Prihlásenie | osobným číslom a heslom; heslá cez scrypt |
| Roly | predák a správca, strážené pri každej ceste |
| Číselníky | firmy, prevádzky, tímy, jedálne — zakladanie aj úpravy |
| Ľudia | import menoslovu, zaradenie, hromadné priradenie väzieb |
| Pravidlo o pôvode | ručne zadané meno import neprepíše (1.3b) |
| Zmena firmy | uprostred mesiaca sa odmieta, dá sa k prvému (1.3b) |
| `/zdravie` | overenie po nasadení; `deploy.sh` sa naň pýta a pri tichu vracia predchádzajúcu verziu |

Appka beží na `obedy.ahafarma.sk`, **preview sa presunulo na `obedy.ahafarma.sk/preview/`** a vozí sa priamo z repozitára — po `git pull` je aktuálne aj ono.

Overené v prehliadači, nie odhadom: dvadsať skúšok cez Chromium (prihlásenie, roly, import s tabulátorom aj bodkočiarkou, úvodné nuly, pravidlo o pôvode, hromadné priradenie, odmietnutie zmeny firmy, ochrana posledného správcu).

---

Body 1–4 stačia na to, aby predák začal objednávať. Bod 5 je hotový, takže august sa dá dopísať od prvého. **Bod 6 musí byť hotový pred koncom augusta**, inak sa mesiac neuzavrie.

---

## Čo sa rieši priebežne, nie pred spustením

- **Zálohovanie na NAS** — nočná záloha na serveri je súčasťou bodu 7 a beží od prvého dňa; sťahovanie na NAS sa doplní, keď bude technik pripravený
- **Odblokovanie IP** u mailového servera
- **SMS brána** a registrácia odosielateľa
- **Údaje od dodávateľov** okrem e-mailu — dopĺňajú sa v nastaveniach

---

## Jediné, čo blokuje spustenie pilotu

**E-mailová adresa aspoň jednej jedálne na objednávky.** Všetko ostatné sa dá nastaviť za behu alebo počká.
