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

1. **Kostra a databáza** — schéma, Docker, prázdna appka s prihlásením
2. **Číselníky a ľudia** — import menoslovu, hromadné väzby
3. **Menu a matica predáka** — jadro appky
4. **Uzávierka týždňa a odoslanie objednávky** — prvá vec, čo ide von
5. **Spätný zápis** — dopísanie augusta
6. **Mesačná uzávierka a mzdový podklad**
7. **Zálohy a upozornenia** — beží od prvého dňa, dolaďuje sa priebežne

Body 1–4 stačia na to, aby predák začal objednávať. **Body 5–6 musia byť hotové pred koncom augusta**, inak sa mesiac neuzavrie.

---

## Čo sa rieši priebežne, nie pred spustením

- **Zálohovanie na NAS** — nočná záloha na serveri je súčasťou bodu 7 a beží od prvého dňa; sťahovanie na NAS sa doplní, keď bude technik pripravený
- **Odblokovanie IP** u mailového servera
- **SMS brána** a registrácia odosielateľa
- **Údaje od dodávateľov** okrem e-mailu — dopĺňajú sa v nastaveniach

---

## Jediné, čo blokuje spustenie pilotu

**E-mailová adresa aspoň jednej jedálne na objednávky.** Všetko ostatné sa dá nastaviť za behu alebo počká.
