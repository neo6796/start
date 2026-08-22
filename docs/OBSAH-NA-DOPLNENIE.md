# Čo treba doplniť pred spustením webu

Zoznam vznikol automaticky zo všetkých miest označených v texte žltým rámikom.
Keď údaj doplníte, zmažte v HTML iba obal `<span class="todo">…</span>` a nechajte text.

```bash
grep -rn 'class="todo"' *.html     # priebežná kontrola
```

---

## A. Overené — netreba riešiť

Doložené originálom osvedčenia alebo vaším pôvodným webom:

| Údaj | Hodnota |
|---|---|
| Číslo osvedčenia | 647/2023_RSP |
| Druh podniku | integračný podnik |
| Vydalo | MPSVR SR, Bratislava, 29. novembra 2023 |
| Obchodné meno | ADIUMENTUM 01 s. r. o. |
| Sídlo | Levická 1600, 952 01 Vráble |
| IČO | 55 406 432 |
| E-mail | adiumentum01@gmail.com |
| Slogan | … meníme Slovensko k lepšiemu |

---

## B. Rozpory, ktoré musíte rozhodnúť

**Daňové číslo.** Váš pôvodný web uvádzal „DRČ: SK 712 000 2076", v obchodných registroch
je pri IČO 55406432 vedené DIČ 2121977242. Čísla si nezodpovedajú — jedno je preklep.
Overte podľa osvedčenia od daňového úradu a doplňte aj informáciu o platiteľstve DPH.

**Telefónne čísla.** Podľa vašej odpovede slúži každé na inú vec. Na stránke Kontakt sú obe
uvedené s miestom na popis — doplňte, ktoré je na čo (napr. „zákazky a ponuky" / „personálne veci").

---

## C. Jedna formulácia, ktorú som zámerne zmiernil

Vo vašom podklade stálo, že klient si môže *„uplatniť 100 % hodnoty našich služieb v rámci
náhradného plnenia"*. Na web som to takto nedal.

Náhradné plnenie sa podľa zákona č. 5/2004 Z. z. počíta podľa vzorca naviazaného na cenu
zákazky bez DPH a na počet zamestnancov so zdravotným postihnutím u dodávateľa — nie ako
priame „100 % faktúry = splnená povinnosť". Web preto hovorí, že **odberom služieb si povinný
podiel plníte namiesto odvodu štátu**, a presný prepočet ponúka individuálne. Vecne to hovorí
to isté, ale ustojí to kontrolu aj námietku konkurencie.

Ak vám daňový poradca potvrdí, že vo vašom prípade je 100 % formulácia obhájiteľná, rád
ju sprísnim späť — pošlite mi to stanovisko.

---

## D. Zoznam označených miest


### Domov (`index.html`)

| Riadok | Čo doplniť |
|---|---|
| 419, 426, 433 | Miesto pre referenciu klienta — 2 až 3 vety o tom, čo sme dodali a ako spolupráca prebiehala. |
| 421, 428, 435 | Meno a priezvisko |
| 422, 429, 436 | Pozícia, organizácia |

### Služby (`sluzby.html`)

| Riadok | Čo doplniť |
|---|---|
| 341 | doplniť — áno / nie, prípadne IČ DPH |

### Vízia (`nasa-vizia.html`)

| Riadok | Čo doplniť |
|---|---|
| 175 | Doplniť pripravované úrovne rozvoja — rozsah a orientačné obdobie. |

### O nás (`o-nas.html`)

| Riadok | Čo doplniť |
|---|---|
| 192 | Doplniť mená a postavenie členov — zástupca zamestnancov, zástupca vedenia, prípadne externý člen. |
| 194 | Doplniť, ako často výbor zasadá a kde sa zverejňujú závery. |
| 238, 247, 256 | Meno a priezvisko |
| 239, 248, 257 | Pracovná pozícia |
| 240, 249, 258 | Jedna až dve vety — čo má na starosti a na čo sa naňho môže klient obrátiť. |
| 275 | doplniť — na webe máte uvedené SK 712 000 2076, v registroch je DIČ 2121977242; údaje si nezodpovedajú |
| 275 | Okresný súd Nitra, oddiel: Sro, vložka č. — doplniť |
| 275 | meno konateľa / konateľov — doplniť |
| 275 | aktuálny počet — doplniť |

### Kariéra (`kariera.html`)

| Riadok | Čo doplniť |
|---|---|
| 129, 141 | Miesto výkonu práce |
| 130, 142 | Úväzok |
| 132, 144 | Názov pracovnej pozície |
| 133, 145 | Krátky popis náplne práce — 2 až 3 vety zrozumiteľným jazykom, bez odborných skratiek. |
| 134, 146 | suma v EUR brutto — zo zákona povinný údaj |
| 175 | doplniť — napr. 6 mesiacov |

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
| 173, 175 | doplniť, na čo slúži toto číslo |
| 179 | Po – Pi, 8:00 – 16:00 — upraviť podľa skutočnosti |
| 191 | doplniť — na webe máte SK 712 000 2076, v registroch DIČ 2121977242 |
| 193 | doplniť číslo účtu |

---

## E. Čo web ešte potrebuje od vás

### Grafika — vyriešená bez fotografií

Web zámerne neobsahuje fotografie ľudí. Pri tíme, ktorého znevýhodnenie nie je zvonku
viditeľné, by portréty buď nič nepovedali, alebo by z ľudí urobili ilustráciu diagnózy.
Namiesto toho má web **vlastný ilustračný systém**: osem technických čiarových kresieb
na milimetrovom papieri — pozemok s lomovými bodmi a kótou, pohľad na budovu s rastrom
okien, rozostavaná stavba so žeriavom, finančný výkaz s grafom, reklamný pútač, dom
s kľúčom, zväzok dokumentov s pečiatkou a recepčný pult.

Sú napísané priamo v kóde ako SVG, takže:

- nepotrebujú licenciu, súhlas ani fotografa,
- prispôsobujú sa svetlému aj tmavému režimu,
- ostanú ostré na akomkoľvek displeji aj v tlači,
- dajú sa kedykoľvek prefarbiť zmenou jednej premennej v `assets/css/style.css`.

Sekcia **Tím** neobsahuje portréty — ukazuje, kto za čo zodpovedá. Doplniť stačí mená
kontaktných osôb; meno je pri B2B klientele dôležitejšie než tvár.

### Čo by grafiku ešte posunulo (bez fotenia ľudí)

1. **Vlastné 3D vizualizácie projektov.** Dodávate ich ako službu vo fáze 05, takže sú
   zároveň najlepšou referenciou na túto službu. Ideálne 3 – 5 kusov na šírku.
2. **Fotografie hotových stavieb a interiérov.** Budovy námietky nemajú.
3. **Skeny výkresov, situácií a pôdorysov.** V technickom webe pôsobia výborne — stačí
   zakryť mená a podpisy v rohovej pečiatke.
4. **Detailné zábery bez tvárí:** ruky nad výkresom, obrazovka s 3D modelom, meter
   a projekt na stavenisku, kľúče na stole. Nikoho neidentifikujú a doplnia web o „ľudský"
   rozmer, ktorý ilustrácie samy nedajú.

Ak by ste sa niekedy pre fotografie zamestnancov rozhodli, platia dve pravidlá:
vyžiadajte si **písomný súhlas so zverejnením podobizne** a **nikdy nespájajte konkrétnu
tvár so zmienkou o znevýhodnení** — ani nepriamo umiestnením fotky do sekcie, ktorá o ňom hovorí.

### Referencie

Tri prázdne miesta na domovskej stránke. Pri B2B klientele stačia tri vety od jedného
investora — váži viac než celá stránka textu. Ak referencie nemáte, sekciu nahraďte
prehľadom realizovaných projektov.

### Mená do sekcie Tím a Poradný výbor

Šesť rolí je popísaných, chýbajú len mená kontaktných osôb. Pri poradnom výbore doplňte
zloženie a to, ako často zasadá. Na starom webe boli položky *Team* a *História* prázdne
(odkazovali na `#`) — teraz majú na stránke *O nás* pripravené miesto.

### Voľné pozície

Na stránke *Kariéra* sú dve zástupné karty. Pri odbornej pozícii je zo zákona povinný údaj
o ponúkanej mzde. Ak práve neobsadzujete, karty odstráňte — v HTML je pripravená náhradná
formulácia v komentári.

### Kontaktný formulár

Bez prepojenia na formulárovú službu sa dopyty neodošlú. Postup v `README.md`, kapitola 4.

### Dokumenty

Pozri `dokumenty/README.md`. Osvedčenie je už na webe ako obrázok, ostatné PDF doplňte.

### Projekt ALTRUA

Podľa vašej inštrukcie na web nejde. Na starom webe naň odkazovalo menu na `altrua.sk`
a roadmapa ho uvádza ako tretiu a štvrtú úroveň rozvoja. Keď bude pripravený, pridáme
stránku aj s odkazom.

---

## F. Po spustení

- [ ] Presmerovať `www` → hlavná doména a vynútiť HTTPS.
- [ ] Nastaviť presmerovania zo starých adries — bez nich stratíte pozície vo vyhľadávaní:
      `/sample-page/` → `/socialny-podnik.html`, `/nasa-vizia/` → `/nasa-vizia.html`,
      `/o-nas-2/` → `/o-nas.html`, `/poradny-vybor/` → `/o-nas.html#poradny-vybor`,
      `/vyrocne-spravy/` → `/dokumenty.html#vyrocne-spravy`,
      `/privacy-policy/` → `/dokumenty.html#gdpr`.
- [ ] Rozhodnúť o Google Analytics. Starý web ich mal (G-RKL9CRHV5C), nový ich zámerne nemá —
      preto nepotrebuje cookie lištu. Ak analytiku chcete späť, treba doplniť aj súhlas.
- [ ] Odoslať `sitemap.xml` do Google Search Console.
- [ ] Aktualizovať odkaz na web v registri sociálnych podnikov a v katalógoch. Zároveň tam
      opravte popis činnosti — dielne.sk vás vedie ako marketingovú a webovú agentúru,
      čo už nezodpovedá skutočnosti.
- [ ] Raz ročne doplniť novú výročnú správu do priečinka `dokumenty/`.
