# adiumentum.sk — nový web

Statický web sociálneho podniku **ADIUMENTUM 01, s. r. o.** (Vráble).
Bez frameworkov, bez build-kroku, bez závislostí — čisté HTML, CSS a niekoľko
riadkov JavaScriptu. Súbory stačí nahrať na hosting a web funguje.

---

## 1. Čo web obsahuje

| Súbor                   | Stránka                                                          |
|-------------------------|------------------------------------------------------------------|
| `index.html`            | Domov — reťazec šiestich fáz, služby, segmenty klientov, ESG      |
| `sluzby.html`           | Šesť fáz životného cyklu + dva podporné piliere, ceny             |
| `socialny-podnik.html`  | Intelektuálny sociálny podnik, náhradné plnenie, ESG, FAQ         |
| `nasa-vizia.html`       | Vízia, tri piliere a časová os míľnikov rozvoja                   |
| `o-nas.html`            | Príbeh, hodnoty, etymológia názvu, poradný výbor, údaje o podniku |
| `kariera.html`          | Práca u nás, voľné pozície, ako sa prihlásiť                      |
| `dokumenty.html`        | Dokumenty, výročné správy, povinné zverejňovanie, GDPR            |
| `kontakt.html`          | Kontaktný formulár, kontaktné a fakturačné údaje                  |
| `404.html`              | Stránka pre neexistujúce adresy                                   |

Podporné súbory:

```
assets/css/style.css     všetka grafika webu (farby, typografia, komponenty)
assets/js/main.js        mobilné menu, rok v pätičke, odoslanie formulára
assets/img/              logo, favicon, obrázok pre náhľad na sociálnych sieťach
dokumenty/               sem patria PDF súbory (pozri dokumenty/README.md)
docs/OBSAH-NA-DOPLNENIE.md   zoznam všetkého, čo treba doplniť pred spustením
robots.txt, sitemap.xml  podklady pre vyhľadávače
```

---

## 2. Než web spustíte

V texte sú miesta, ktoré musí doplniť alebo overiť niekto z podniku — sú
**farebne zvýraznené priamo v prehliadači** (žltý rámik). Kompletný zoznam
nájdete v `docs/OBSAH-NA-DOPLNENIE.md`.

Rýchla kontrola, či ešte niečo zostalo:

```bash
grep -rn 'class="todo"' *.html | wc -l     # počet zvyšných miest
grep -rn 'TODO:' *.html                    # poznámky pre správcu webu
```

Keď je hodnota doplnená, zmažte iba obal `<span class="todo">…</span>`
a nechajte samotný text.

---

## 3. Ako upraviť texty

Otvorte príslušný `.html` súbor v ľubovoľnom textovom editore (Poznámkový blok,
VS Code, Notepad++) a prepíšte text medzi značkami. Značky `<p>`, `<h2>` a pod.
nechajte na mieste.

```html
<h2>Starý nadpis</h2>        <!-- upravíte na -->
<h2>Nový nadpis</h2>
```

**Hlavička a pätička sa opakujú v každom súbore.** Ak meníte položku menu alebo
telefónne číslo, urobte tú istú zmenu vo všetkých deviatich `.html` súboroch.
Pomôže hromadné nahradenie v editore (Ctrl+Shift+H vo VS Code).

Farby webu sú na jednom mieste — na začiatku `assets/css/style.css` v sekcii
`:root`. Zmena jednej hodnoty prefarbí celý web.

---

## 4. Kontaktný formulár

Statický web nemá vlastný server, takže e-maily neodošle sám. Kým nie je
nastavená formulárová služba, formulár otvorí návštevníkovi jeho e-mailový
program s predvyplnenou správou — funguje, ale nie je to ideálne.

Odporúčaný postup (zdarma, cca 10 minút):

1. Zaregistrujte sa na [Formspree](https://formspree.io) alebo
   [Web3Forms](https://web3forms.com).
2. Vytvorte formulár a skopírujte adresu, ktorú služba vygeneruje.
3. V `kontakt.html` nájdite `<form … action="">` a adresu vložte:

   ```html
   <form class="form" data-kontakt-formular action="https://formspree.io/f/VAS-KOD" method="post">
   ```

4. Odošlite testovací dopyt a skontrolujte, či e-mail dorazil.

Formulár už obsahuje skrytú pascu na roboty (pole `webova-adresa`) aj
zaškrtávacie políčko so súhlasom podľa GDPR.

---

## 5. Nasadenie na hosting

**Bežný hosting (Websupport, WebHouse, vlastný server) —** cez FTP nahrajte
obsah tohto priečinka do koreňového priečinka webu (`/www`, `/public_html`
alebo `/htdocs`). Nič sa nekompiluje.

**GitHub Pages —** v repozitári *Settings → Pages* zvoľte vetvu a priečinok
`/ (root)`. Web bude dostupný do niekoľkých minút.

**Netlify / Vercel —** priečinok stačí pretiahnuť do okna prehliadača
(*drag & drop deploy*), build príkaz sa nezadáva.

Po nasadení nezabudnite:

- nastaviť presmerovanie z `www.adiumentum.sk` na `adiumentum.sk` (alebo naopak),
- vynútiť HTTPS,
- nastaviť `404.html` ako chybovú stránku (na Apache: `ErrorDocument 404 /404.html`),
- overiť web v [PageSpeed Insights](https://pagespeed.web.dev/).

---

## 6. Lokálne otvorenie

Súbory sa dajú otvoriť priamo dvojklikom. Ak chcete vernejšie prostredie:

```bash
python3 -m http.server 8000
# potom otvorte http://localhost:8000
```

---

## 7. Na čom web funguje

- Chrome, Edge, Firefox a Safari v aktuálnych aj o dve roky starších verziách.
- Mobil, tablet aj počítač — rozloženie sa prispôsobuje.
- Bez JavaScriptu zostáva celý obsah čitateľný; nefunguje len rozbaľovacie
  mobilné menu a odoslanie formulára.
- Prispôsobuje sa tmavému režimu operačného systému.
- Rešpektuje nastavenie „obmedziť pohyb“ v systéme.
- Kontrasty spĺňajú WCAG 2.1 na úrovni AA, stránka je ovládateľná klávesnicou.
- Neobsahuje cookies, analytiku ani skripty tretích strán — nie je potrebná
  cookie lišta.
