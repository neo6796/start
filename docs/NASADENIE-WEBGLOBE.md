# Nasadenie na Webglobe (výmena za WordPress)

Nový web je statický — žiadna databáza, žiadny WordPress, žiadne aktualizácie.
Súbory sa jednoducho nahrajú na hosting. Celé to trvá asi hodinu vrátane
zálohovania a testu.

> **Dva kroky, ktoré sa dajú ľahko prehliadnuť a rozbijú web:**
> súbor `.htaccess` (kvôli nemu sa načíta `index.html` namiesto WordPressu)
> a odstránenie starého `index.php`. Sú vysvetlené v kroku 5 a 6.

---

## 1. Najprv záloha. Bez výnimky

Kým sa čohokoľvek dotknete, urobte si zálohu — je to jediná poistka, ak by ste
sa chceli vrátiť.

**Súbory:** v administrácii Webglobe otvorte *Správcu súborov* (alebo sa
pripojte cez FTP) a stiahnite si celý obsah koreňového priečinka webu.
Prípadne priečinok zabaľte do ZIP priamo na serveri a stiahnite jeden súbor.

**Databáza:** v administrácii nájdite *phpMyAdmin*, vyberte databázu WordPressu
a cez *Export* si stiahnite SQL súbor. Bez databázy sa WordPress obnoviť nedá,
aj keby ste mali všetky súbory.

Zálohu si odložte mimo hostingu — na disk alebo do cloudu.

---

## 2. Nájdite koreňový priečinok webu

Ide o priečinok, do ktorého sa má obsah nahrať. U rôznych hostingov sa volá
rôzne (`www`, `web`, `public_html`, `httpdocs`, `domains/adiumentum.sk/public_html`).

**Spoľahlivé rozpoznanie:** je to ten priečinok, v ktorom leží súbor
`wp-config.php` a priečinky `wp-admin`, `wp-content`, `wp-includes`.
Tam patrí aj nový web.

Ak si nie ste istí, podpora Webglobe vám cestu povie obratom.

---

## 3. Prístup cez FTP

V administrácii Webglobe nájdite sekciu s FTP prístupom a vytvorte si (alebo
zobrazte) prihlasovacie údaje. Budete potrebovať:

- server (najčastejšie `ftp.adiumentum.sk` alebo adresa uvedená v administrácii),
- meno a heslo,
- port 21 pre FTP, prípadne 22 pre SFTP, ak ho hosting ponúka.

Ako program odporúčam **FileZilla** (zdarma, Windows aj Mac). Alternatívne
zvládnete všetko aj cez *Správcu súborov* priamo v administrácii — pri väčšom
počte súborov je však FTP rýchlejšie.

---

## 4. Vyskúšajte web najprv v podpriečinku

Neprepisujte fungujúci web naslepo. V koreňovom priečinku vytvorte podpriečinok
`novy` a nahrajte doň obsah nového webu:

```
index.html   sluzby.html   socialny-podnik.html   nasa-vizia.html
o-nas.html   kariera.html  dokumenty.html         kontakt.html
404.html     robots.txt    sitemap.xml            .htaccess
odoslat.php  assets/       dokumenty/
```

Priečinok `docs/` ani súbor `README.md` nahrávať netreba — sú to pracovné
podklady pre vás, nie súčasť webu.

Web si potom otvorte na adrese **adiumentum.sk/novy/**. Preklikajte všetky
stránky, menu, vyskúšajte to na mobile. Odkazy fungujú aj v podpriečinku,
pretože sú relatívne.

> V podpriečinku zatiaľ nebudú fungovať presmerovania zo starých adries —
> to je v poriadku, tie sa zapnú až po presune na hlavnú adresu.

---

## 5. Výmena za ostrý web

Keď ste s webom spokojní:

1. **Zmažte WordPress** z koreňového priečinka — súbory `index.php`,
   `wp-config.php`, `wp-login.php`, `xmlrpc.php`, `wp-*.php` a priečinky
   `wp-admin`, `wp-content`, `wp-includes`. Starý `.htaccess` tiež
   (v zálohe ho máte).
2. **Presuňte obsah priečinka `novy`** o úroveň vyššie, do koreňa. Prázdny
   priečinok `novy` potom zmažte.
3. Skontrolujte, že v koreni je súbor **`.htaccess`**. Ak ho FTP program
   nezobrazuje, zapnite v ňom zobrazovanie skrytých súborov — názvy začínajúce
   bodkou býva skryté.

**Prečo je `.htaccess` dôležitý:** server sa štandardne pozerá najprv po
súbore `index.php` a až potom po `index.html`. Bez tohto súboru by sa po
akomkoľvek zvyšku WordPressu načítal starý web. Súbor zároveň zabezpečuje
presmerovania zo starých adries, vynútenie HTTPS a chybovú stránku 404.

---

## 6. Kontrola po výmene

| Čo skontrolovať | Očakávaný výsledok |
|---|---|
| `adiumentum.sk` | nový web, nie WordPress |
| `adiumentum.sk/nasa-vizia/` | presmeruje na `/nasa-vizia.html` |
| `adiumentum.sk/o-nas-2/` | presmeruje na `/o-nas.html` |
| `adiumentum.sk/wp-admin/` | presmeruje na úvodnú stránku |
| `adiumentum.sk/neexistuje` | vlastná stránka 404 |
| `http://adiumentum.sk` | preskočí na `https://` |
| `www.adiumentum.sk` | preskočí na verziu bez `www` |

Ak sa načíta starý web, ide takmer vždy o jednu z dvoch vecí: v koreni zostal
`index.php`, alebo sa nenahral `.htaccess`.

Ak sa web tvári rozbito bez štýlov, prehliadač si drží starú verziu — skúste
`Ctrl+F5` (na Macu `Cmd+Shift+R`).

---

## 7. Sfunkčnenie kontaktného formulára

Webglobe podporuje PHP, takže formulár nepotrebuje žiadnu externú službu.

1. V administrácii Webglobe vytvorte e-mailovú schránku **`web@adiumentum.sk`**.
   Netreba ju čítať — musí len existovať, aby správy z webu prešli cez
   antispamové kontroly. Správa odoslaná z cudzej adresy končí v spame.
2. V súbore `odoslat.php` skontrolujte prvé dve nastavenia:
   `$prijemca` (kam sa dopyty doručia) a `$odosielatel` (adresa vytvorená
   v predchádzajúcom kroku).
3. V súbore `kontakt.html` nájdite riadok s `<form ... action="">`
   a doplňte doň adresu skriptu:

   ```html
   <form class="form" data-kontakt-formular data-email="adiumentum01@gmail.com" action="odoslat.php" method="post">
   ```

4. Odošlite skúšobný dopyt a overte, že e-mail dorazil — aj do priečinka
   nevyžiadanej pošty.

Ak by PHP na vašom programe nebolo dostupné, funguje aj bezplatná služba
Formspree alebo Web3Forms — postup je v `README.md`, kapitola 4. Vtedy však
treba do súboru `.htaccess` doplniť doménu služby do direktívy
`Content-Security-Policy` (časť `form-action`), inak ju prehliadač zablokuje.

---

## 8. Po spustení

- [ ] Odoslať `sitemap.xml` do [Google Search Console](https://search.google.com/search-console).
- [ ] Skontrolovať rýchlosť na [PageSpeed Insights](https://pagespeed.web.dev/).
- [ ] Zrušiť nepotrebnú databázu WordPressu — až po niekoľkých týždňoch
      bezproblémovej prevádzky a s odloženou zálohou.
- [ ] Zvážiť zníženie programu hostingu. Statický web nepotrebuje databázu
      ani vysoké limity PHP, takže vám môže stačiť lacnejšia varianta.
- [ ] Aktualizovať odkaz na web v registri sociálnych podnikov a v katalógoch.

---

## Čo už riešiť netreba

WordPress si vyžadoval pravidelné aktualizácie jadra, tém a doplnkov — a každá
vynechaná bola otvorenými dverami. Statický web nemá databázu, prihlasovanie
ani doplnky, takže nie je čo napadnúť a nie je čo aktualizovať.

Zmena textu = otvoriť `.html` súbor, prepísať vetu, nahrať späť cez FTP.
