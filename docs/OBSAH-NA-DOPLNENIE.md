# Čo treba doplniť pred spustením webu

Tento zoznam vznikol automaticky zo všetkých miest, ktoré sú v texte označené
žltým rámikom. Keď údaj doplníte, zmažte v HTML iba obal
`<span class="todo">…</span>` a nechajte samotný text.

Priebežnú kontrolu urobíte príkazom:

```bash
grep -rn 'class="todo"' *.html
```

---

## A. Overiť pred zverejnením — právne citlivé

Tieto údaje sme prevzali z verejných registrov a z katalógov sociálnych podnikov,
**nie z vašich originálnych dokladov.** Pred spustením webu ich prosím porovnajte
s papierom, ktorý máte v šanóne:

| Údaj | Hodnota na webe | Kde overiť |
|---|---|---|
| Číslo osvedčenia o štatúte RSP | 647/2023_RSP | originál osvedčenia z MPSVR SR |
| Dátum priznania štatútu | rok 2023 | originál osvedčenia |
| IČO | 55406432 | výpis z obchodného registra |
| DIČ | 2121977242 | osvedčenie o registrácii daňovníka |
| Sídlo | Levická 1600, 952 01 Vráble | výpis z obchodného registra |
| Telefón | +421 918 538 007 | interne |
| E-mail | adiumentum01@gmail.com | interne |
| Deň vzniku spoločnosti | 26. 4. 2023 | výpis z obchodného registra |

Ak sa niektorý údaj líši, opravte ho vo **všetkých** `.html` súboroch naraz
(hlavička a pätička sa opakujú na každej stránke) a tiež v štruktúrovaných
údajoch pre vyhľadávače na konci hlavičky súboru `index.html`.

### Odporúčanie k e-mailu

Adresa `adiumentum01@gmail.com` na webe registrovaného sociálneho podniku
pôsobí menej dôveryhodne, než by mohla. Ak k doméne `adiumentum.sk` máte
e-mailovú schránku, zvážte prechod na `info@adiumentum.sk` — je to jedna
z najlacnejších vecí, ktorá zvýši dôveryhodnosť pri komunikácii s obcami
a väčšími firmami.

### Odporúčanie k tvrdeniam o náhradnom plnení

Na stránke *Sociálny podnik* tvrdíme, že odberom vašich služieb si odberateľ
môže splniť povinný podiel zamestnávania občanov so zdravotným postihnutím.
Toto tvrdenie je pre predaj kľúčové — dajte ho prosím jednorazovo potvrdiť
vašim účtovníkom alebo príslušným úradom práce, aby ste ho vedeli obhájiť
pri každom rokovaní.

---

## B. Doplniť obsah — zoznam z webu


### Domov (`index.html`)

| Riadok | Čo doplniť |
|---|---|
| 123 | č. 647/2023_RSP — overiť |
| 296, 303, 310 | Miesto pre referenciu klienta — 2 až 3 vety o tom, čo sme dodali a ako spolupráca prebiehala. |
| 298, 305, 312 | Meno a priezvisko |
| 299, 306, 313 | Pozícia, organizácia |

### Služby (`sluzby.html`)

| Riadok | Čo doplniť |
|---|---|
| 240 | doplniť — áno / nie, prípadne IČ DPH |

### Sociálny podnik (`socialny-podnik.html`)

| Riadok | Čo doplniť |
|---|---|
| 98 | č. 647/2023_RSP — overiť podľa originálu |

### O nás (`o-nas.html`)

| Riadok | Čo doplniť |
|---|---|
| 183, 192, 201 | Meno a priezvisko |
| 184, 193, 202 | Pracovná pozícia |
| 185, 194, 203 | Jedna až dve vety — čo má na starosti a na čo sa naňho môže klient obrátiť. |
| 220 | doplniť — alebo uviesť „nie sme platiteľom DPH“ |
| 220 | Okresný súd Nitra, oddiel: Sro, vložka č. — doplniť |
| 220 | meno konateľa / konateľov — doplniť |
| 220 | č. 647/2023_RSP — overiť podľa originálu |
| 220 | aktuálny počet — doplniť |

### Kariéra (`kariera.html`)

| Riadok | Čo doplniť |
|---|---|
| 124, 136 | Miesto výkonu práce |
| 125, 137 | Úväzok |
| 127, 139 | Názov pracovnej pozície |
| 128, 140 | Krátky popis náplne práce — 2 až 3 vety zrozumiteľným jazykom, bez odborných skratiek. |
| 129, 141 | suma v EUR brutto — zo zákona povinný údaj |
| 170 | doplniť — napr. 6 mesiacov |

### Dokumenty (`dokumenty.html`)

| Riadok | Čo doplniť |
|---|---|
| 94, 104, 114, 124, 134, 144 | veľkosť a dátum doplniť |
| 185 | meno a kontakt, ak ste ju určili — inak celý riadok odstráňte |
| 191, 194 | doplniť lehotu |

### Kontakt (`kontakt.html`)

| Riadok | Čo doplniť |
|---|---|
| 174 | Po – Pi, 8:00 – 16:00 — upraviť podľa skutočnosti |
| 186 | doplniť alebo uviesť „neplatiteľ DPH“ |
| 188 | doplniť číslo účtu |

---

## C. Čo web ešte potrebuje od vás

### Fotografie (najdôležitejšia položka)

Web je momentálne bez fotografií a to je jeho najväčšia slabina. Ľudia si sociálny
podnik kúpia cez tváre, nie cez text. Potrebujeme:

1. **3 – 5 fotografií z prevádzky** — ľudia pri práci, nie prázdne priestory.
   Na šírku, aspoň 1600 px široké.
2. **Portréty kontaktných osôb** (stránka *O nás*, sekcia Tím) — postačí
   fotoaparát mobilu pri okne, na neutrálnom pozadí.
3. **Fotografie hotových zákaziek** — vytlačené letáky, zabalené zásielky,
   upratané priestory. Slúžia ako náhrada za chýbajúce referencie.

Pri fotografovaní zamestnancov si vopred vyžiadajte **písomný súhlas
so zverejnením podobizne**. Bez neho fotografiu nezverejňujte.

### Referencie

Na domovskej stránke sú tri prázdne miesta na referencie. Oslovte troch
odberateľov, s ktorými spolupráca dopadla dobre, a požiadajte ich o dve až tri
vety plus súhlas so zverejnením mena a organizácie. Ak referencie zatiaľ nemáte,
celú sekciu radšej odstráňte a nahraďte ju fotografiami realizácií — prázdna
sekcia škodí viac než žiadna.

### Dokumenty (PDF)

Pozrite `dokumenty/README.md` — je tam zoznam súborov aj s presnými názvami.

### Kontaktný formulár

Formulár treba prepojiť na formulárovú službu, inak sa dopyty nebudú odosielať.
Postup je v `README.md`, kapitola 4. Je to úkon na desať minút a bez neho web
nebude plniť svoj hlavný účel.

---

## D. Po spustení

- [ ] Nastaviť presmerovanie `www` → hlavná doména a vynútiť HTTPS.
- [ ] Zaregistrovať web do [Google Search Console](https://search.google.com/search-console)
      a odoslať `sitemap.xml`.
- [ ] Aktualizovať odkaz na web v profile na Facebooku, v registri sociálnych
      podnikov a v katalógoch (dielne.sk, Profesia a pod.).
- [ ] Skontrolovať web na mobile — hlavne kontaktný formulár a telefónne číslo.
- [ ] Raz ročne doplniť novú výročnú správu do priečinka `dokumenty/`.
