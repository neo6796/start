# Obedár — odovzdávací list

**Načo to je:** aby systém vedel prevziať niekto iný. Nie preto, že sa niečo stane — ale preto, že papier, ktorý si robíme až vtedy, keď ho treba, sa nikdy nespraví.

Stačí, aby bol Erik dva týždne mimo. Appka by bežala ďalej, ale **nikto by ju nevedel opraviť, obnoviť ani zastaviť.**

> ⚠️ **V tomto dokumente nie sú žiadne heslá ani kľúče.** Sú v správcovi hesiel pod záznamom **„Obedár — prístupy"**. Tento list hovorí, čo kde je a čo s tým robiť.

---

## 1. Čo je kde

| Čo | Kde | Kto sa tam dostane |
|---|---|---|
| **Aplikačný server** | Hetzner Cloud, projekt `obedy`, IP `46.225.236.143` | členovia projektu |
| **Prihlásenie na server** | SSH kľúčom, používateľ `aha` | kto má kľúč |
| **Databáza a prílohy** | na tom istom serveri, v Dockeri | cez SSH |
| **Heslá aplikácie** | konfiguračný súbor na serveri + správca hesiel | — |
| **Zálohy** | firemný NAS (alebo Hetzner Storage Box) | podľa `02-zadanie-pre-it.md` |
| **Doména `obedy.ahafarma.sk`** | Webglobe, DNS záznam typu A | správca domény |
| **Odosielanie pošty** | schránka `obedy@ahafarma.sk` na `mail.pdvrable.sk` | firemný IT technik |
| **Zdrojový kód** | GitHub, repozitár `neo6796/start` | vlastník repozitára |

---

## 2. Päť prístupov, ktoré musí mať aspoň jeden ďalší človek

Toto je jadro celého listu. **Ktorýkoľvek chýbajúci znamená, že sa systém prevziať nedá** — a nie je to zrejmé, kým sa o to niekto nepokúsi.

- [ ] **Hetzner** — pozvať druhého člena do projektu *(☰ → Members → Invite member, rola Admin)*
- [ ] **SSH kľúč na server** — pridať druhý verejný kľúč do `~/.ssh/authorized_keys`
- [ ] **Heslá aplikácie** — do správcu hesiel, zdieľané aspoň s jedným ďalším človekom
- [ ] **DNS u Webglobe** — prístup alebo aspoň meno človeka, ktorý ho má
- [ ] **GitHub** — pridať druhého spolupracovníka do repozitára

Prvý bod bez druhého je bezcenný: **admin projektu vidí server, ale bez SSH kľúča sa doň neprihlási.**

---

## 3. Keby bolo treba systém prevziať

### Appka nefunguje, ale server beží

```
ssh aha@46.225.236.143
cd ~/obedar
docker compose ps          # čo beží
docker compose logs --tail=100
docker compose restart     # najčastejšie stačí
```

### Server nereaguje vôbec

V Hetzner konzole → server → **Console** (prístup cez prehliadač, netreba SSH), prípadne **Power → Reset**.

### Server je stratený a treba postaviť nový

1. Nový server v Hetzneri, Debian, pridať SSH kľúč
2. Nainštalovať Docker, natiahnuť repozitár
3. Obnoviť poslednú zálohu databázy
4. Doplniť konfiguračný súbor s heslami *(zo správcu hesiel)*
5. Prehodiť DNS záznam `obedy.ahafarma.sk` na novú IP
6. Spustiť `docker compose up -d`; certifikát si Caddy vybaví sám

**Rádovo hodina práce**, ak sú po ruke prístupy z časti 2. Bez nich sa nedá začať.

### Uzávierka mesiaca a mzdový podklad

Termín je do **5.–6. dňa** nasledujúceho mesiaca. Postup je v appke na obrazovke *Uzávierka*; keď nie je po ruke nikto, kto to robil, mesiac sa dá nechať otvorený — čísla sa nestratia, len sa podklad odovzdá neskôr.

---

## 4. Čo sa deje samo a netreba na to myslieť

- **HTTPS certifikát** — Caddy si ho obnovuje sám
- **Nočná záloha** — server ju vyrába sám, NAS si ju sťahuje sám
- **Upozornenie, keď sa záloha zastaví** — príde e-mailom po 48 hodinách ticha

---

## 5. Kto je kto

| Rola | Meno | Kontakt |
|---|---|---|
| Vlastník systému | Erik Solár | |
| Zástupca *(doplniť)* | ……… | |
| Firemný IT technik | ……… | |
| Správca domény | ……… | |
| Mzdové oddelenie | ……… | |
| Dodávateľ 1 | GASTROGAL | |
| Dodávateľ 2 | GASTRO ABM | |

---

## 6. Kedy tento list prečítať znova

- keď pribudne alebo odíde človek z časti 5,
- keď sa presunie čokoľvek z časti 1,
- **raz ročne aj tak** — spolu s testom obnovy zálohy.

*Posledná aktualizácia: 7. 8. 2026*
