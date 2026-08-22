# Čo treba doplniť pred spustením webu

Zoznam vznikol automaticky zo všetkých miest, ktoré sú v texte označené žltým rámikom.
Keď údaj doplníte, zmažte v HTML iba obal `<span class="todo">…</span>` a nechajte text.

```bash
grep -rn 'class="todo"' *.html     # priebežná kontrola
```

---

## A. Najdôležitejšie: rozsah služieb

**Stránka `sluzby.html` je pracovná verzia a v tejto podobe sa nesmie zverejniť.**

Zoznam služieb na nej pochádza z katalógu dielne.sk a z predmetu činnosti v obchodnom
registri — teda z druhej ruky. Váš vlastný web pritom uvádza úplne inú štruktúru činností:

| Zdroj | Uvádzané činnosti |
|---|---|
| adiumentum.sk (Naša vízia) | služby informátora, administratívne služby; stavebná a realitná činnosť, finalizácia stavieb |
| dielne.sk | marketing, tvorba web stránok, správa Facebooku, edukačné materiály, reklamné predmety, grafické práce |
| Obchodný register | poradenstvo, upratovacie služby a údržba, dokončovacie stavebné práce, inžinierska činnosť |

Pošlite mi prosím skutočný zoznam — pri každej službe stačí názov, jedna veta popisu
a pre koho je určená. Stránku prepíšem a pracovné upozornenie odstránim.

---

## B. Overené z osvedčenia a z vášho webu

Tieto údaje sú na webe uvedené natvrdo, lebo sú doložené originálom osvedčenia
(fotografia z vášho webu) alebo priamo vaším webom — nemusíte ich overovať:

| Údaj | Hodnota |
|---|---|
| Číslo osvedčenia | 647/2023_RSP |
| Druh podniku | integračný podnik |
| Vydalo | MPSVR SR, Bratislava, 29. novembra 2023 |
| Podpísala | Ing. Jana Halgašová, riaditeľka odboru sociálnej ekonomiky |
| Obchodné meno | ADIUMENTUM 01 s. r. o. |
| Sídlo | Levická 1600, 952 01 Vráble |
| IČO | 55 406 432 |
| E-mail | adiumentum01@gmail.com |
| Slogan | … meníme Slovensko k lepšiemu |

### Čo si naopak odporujeme

**Daňové číslo.** Na vašom webe je uvedené „DRČ: SK 712 000 2076", v obchodných
registroch je pri IČO 55406432 vedené DIČ 2121977242. Tieto dve čísla si nezodpovedajú —
jedno z nich je zrejme preklep. Overte podľa osvedčenia o registrácii od daňového úradu
a doplňte správne (aj s informáciou, či ste platiteľom DPH).

**Telefónne čísla.** Podľa vašej odpovede slúži každé na inú vec, ale neviem na akú.
Na stránke Kontakt sú obe uvedené s miestom na popis — doplňte napr. „zákazky a ponuky"
a „personálne veci".

---

## C. Zoznam označených miest


### Domov (`index.html`)

| Riadok | Čo doplniť |
|---|---|
| 304, 311, 318 | Miesto pre referenciu klienta — 2 až 3 vety o tom, čo sme dodali a ako spolupráca prebiehala. |
| 306, 313, 320 | Meno a priezvisko |
| 307, 314, 321 | Pozícia, organizácia |

### Služby (`sluzby.html`)

| Riadok | Čo doplniť |
|---|---|
| 253 | doplniť — áno / nie, prípadne IČ DPH |

### Vízia (`nasa-vizia.html`)

| Riadok | Čo doplniť |
|---|---|
| 175 | Doplniť pripravované úrovne rozvoja — rozsah a orientačné obdobie. |

### O nás (`o-nas.html`)

| Riadok | Čo doplniť |
|---|---|
| 190 | Doplniť mená a postavenie členov — zástupca zamestnancov, zástupca vedenia, prípadne externý člen. |
| 192 | Doplniť, ako často výbor zasadá a kde sa zverejňujú závery. |
| 234, 243, 252 | Meno a priezvisko |
| 235, 244, 253 | Pracovná pozícia |
| 236, 245, 254 | Jedna až dve vety — čo má na starosti a na čo sa naňho môže klient obrátiť. |
| 271 | doplniť — na webe máte uvedené SK 712 000 2076, v registroch je DIČ 2121977242; údaje si nezodpovedajú |
| 271 | Okresný súd Nitra, oddiel: Sro, vložka č. — doplniť |
| 271 | meno konateľa / konateľov — doplniť |
| 271 | aktuálny počet — doplniť |

### Kariéra (`kariera.html`)

| Riadok | Čo doplniť |
|---|---|
| 125, 137 | Miesto výkonu práce |
| 126, 138 | Úväzok |
| 128, 140 | Názov pracovnej pozície |
| 129, 141 | Krátky popis náplne práce — 2 až 3 vety zrozumiteľným jazykom, bez odborných skratiek. |
| 130, 142 | suma v EUR brutto — zo zákona povinný údaj |
| 171 | doplniť — napr. 6 mesiacov |

### Dokumenty (`dokumenty.html`)

| Riadok | Čo doplniť |
|---|---|
| 105, 115, 125, 135 | veľkosť a dátum doplniť |
| 162 | rok |
| 163 | Doplniť súbor do priečinka /dokumenty/ a upraviť odkaz. |
| 198 | meno a kontakt, ak ste ju určili — inak celý riadok odstráňte |
| 204, 207 | doplniť lehotu |

### Kontakt (`kontakt.html`)

| Riadok | Čo doplniť |
|---|---|
| 172, 174 | doplniť, na čo slúži toto číslo |
| 178 | Po – Pi, 8:00 – 16:00 — upraviť podľa skutočnosti |
| 190 | doplniť — na webe máte SK 712 000 2076, v registroch DIČ 2121977242 |
| 192 | doplniť číslo účtu |

---

## D. Čo web ešte potrebuje od vás

### Fotografie

Web je bez fotografií a je to jeho najväčšia slabina — sociálny podnik si ľudia kúpia
cez tváre, nie cez text. Fotografie na vašom starom webe boli stockové (podľa pätičky
z pngegg) a nové by mali byť vlastné:

1. **3 – 5 fotografií z prevádzky** — ľudia pri práci, na šírku, aspoň 1600 px.
2. **Portréty kontaktných osôb** pre stránku *O nás* a členov poradného výboru.
3. **Fotografie hotových zákaziek** — použiteľné namiesto chýbajúcich referencií.

Pri fotografovaní zamestnancov si vyžiadajte **písomný súhlas so zverejnením podobizne**.

### Logo

Súčasné logo (traja panáčikovia so srdiečkami) je stocková grafika z pngegg, nie vlastná
značka — pätička starého webu to aj priznáva („Image by png egg"). Na nový web som preto
pripravil vlastnú značku: monogram **A** s tyrkysovým brvnom, ktoré zároveň naznačuje
oporu. Ak si chcete ponechať pôvodné logo, overte si licenciu na komerčné použitie.

### Referencie

Na domovskej stránke sú tri prázdne miesta. Ak referencie zatiaľ nemáte, sekciu radšej
odstráňte a nahraďte fotografiami realizácií — prázdna sekcia škodí viac než žiadna.

### Kontaktný formulár

Bez prepojenia na formulárovú službu sa dopyty neodošlú. Postup je v `README.md`,
kapitola 4. Desať minút práce, bez ktorých web neplní svoj hlavný účel.

### Stránky, ktoré na starom webe chýbali

V pätičke starého webu odkazovali položky **Team**, **História** a **Facebook** na `#`,
teda nikam. Na novom webe majú Team aj História miesto na stránke *O nás* — doplňte obsah.
Ak Facebook stránku máte, pošlite adresu; ak nie, položku vynecháme.

### Projekt ALTRUA

Podľa vašej inštrukcie som ALTRUA na nový web nedal. Na starom webe naň odkazovalo menu
na `altrua.sk` a vaša roadmapa ho uvádza ako tretiu a štvrtú úroveň rozvoja
(synergická platforma zmysluplných benefitov, 2025 – ; ALTRUA BIOCHAR, 2026 –).
Keď bude projekt pripravený, pridáme stránku aj s odkazom.

---

## E. Po spustení

- [ ] Presmerovať `www` → hlavná doména a vynútiť HTTPS.
- [ ] Nastaviť presmerovania zo starých adries: `/sample-page/` → `/socialny-podnik.html`,
      `/nasa-vizia/` → `/nasa-vizia.html`, `/o-nas-2/` → `/o-nas.html`,
      `/poradny-vybor/` → `/o-nas.html#poradny-vybor`,
      `/vyrocne-spravy/` → `/dokumenty.html#vyrocne-spravy`,
      `/privacy-policy/` → `/dokumenty.html#gdpr`.
      Bez toho stratíte pozície vo vyhľadávaní na existujúce stránky.
- [ ] Rozhodnúť o Google Analytics. Starý web ich mal (G-RKL9CRHV5C), nový ich zámerne
      nemá — preto nepotrebuje cookie lištu. Ak analytiku chcete späť, treba k nej
      doplniť aj súhlas s cookies.
- [ ] Odoslať `sitemap.xml` do Google Search Console.
- [ ] Aktualizovať odkaz na web v registri sociálnych podnikov a v katalógoch.
- [ ] Raz ročne doplniť novú výročnú správu do priečinka `dokumenty/`.
