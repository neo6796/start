# Nastavenie servera — krok za krokom

> Postup platí pre Webglobe aj Hetzner. Kroky 1 a 5–6 sa robia na serveri, kroky 2–4 v paneli, kde je spravovaná doména `ahafarma.sk` a pošta.

Doména: **`obedy.ahafarma.sk`** · pošta: **`obedy@ahafarma.sk`**
Server: **`aha-apps`** u Hetznera, CPX22, Debian 13, IP **`46.225.236.143`**

## Stav

| Krok | Stav |
|---|---|
| 1 — VPS | ✅ hotovo — `aha-apps`, CPX22, Debian 13, Hetzner Nuremberg |
| 2 — DNS `obedy.ahafarma.sk` | ✅ hotovo a overené — `nslookup` vracia `46.225.236.143` |
| 3 — odosielanie pošty | ✅ Brevo, doména `obedy.ahafarma.sk` overená |
| 4 — DKIM a DMARC pre `obedy` | ✅ štyri záznamy pridané a overené, SPF hlavnej domény nedotknutý |
| 5 — zabezpečenie servera | ✅ hotovo a overené (root aj heslá zablokované) |
| 6 — Docker | ✅ hotovo, `hello-world` prešiel |
| 7 — preview naživo | ✅ `https://obedy.ahafarma.sk` beží, certifikát od Let's Encrypt vydaný |

**Infraštruktúra je hotová a overená celou cestou** — doména, HTTPS aj Caddy fungujú na skutočnej stránke, nie len na papieri. Ostrá appka sa nasadí do toho istého `docker-compose.yml`: v `Caddyfile` sa `file_server` zmení na `reverse_proxy app:3000` a pribudnú služby `app` a `db`.

Aktualizácia preview je odvtedy jeden príkaz z Macu:
```
scp ~/Downloads/index.html aha@46.225.236.143:~/obedar/site/index.html
```

---

Po každom kroku je **kontrola**. Nechoď ďalej, kým neprejde — chyba v treťom kroku sa hľadá oveľa horšie, keď je rozbitý aj prvý.

Názvy položiek v paneli Webglobe sa môžu mierne líšiť; nižšie je vždy uvedené, **čo hľadať**, nie na čo presne kliknúť.

---

## 1. Objednať VPS

V ponuke hľadaj **VPS s root prístupom**, nie webhosting.

| | |
|---|---|
| CPU / RAM | 2 vCPU, 4 GB |
| Disk | 40–80 GB SSD |
| Systém | **Debian 13** (alebo Ubuntu 26.04 LTS) |

Pri objednávke **nahraj svoj SSH kľúč**, ak to ponúka. Ak nie, príde ti root heslo mailom — to je v poriadku, kľúč nastavíme v kroku 5.

<details>
<summary><strong>Čo je SSH a prečo kľúč namiesto hesla</strong></summary>

SSH je spôsob, ako sa z vlastného počítača pripojíš na server a píšeš mu príkazy — vzdialená plocha bez obrázkov, celá šifrovaná.

Kľúč sú **dva súbory**, ktoré vzniknú naraz:

| Súbor | Čo to je | Čo s ním |
|---|---|---|
| `id_ed25519` | **súkromný** | ostáva na tvojom počítači, nikdy ho nikomu nedávaš |
| `id_ed25519.pub` | **verejný** | pokojne rozdávaš, vkladá sa na server |

Verejný je **zámok**, ktorý zavesíš na dvere servera — môže ho vidieť ktokoľvek. Súkromný je **kľúč vo vrecku** a otvorí len tvoj zámok; server ho nikdy neuvidí, len si overí, že ho máš.

Server na verejnej adrese dostane denne stovky pokusov o prihlásenie od automatov skúšajúcich bežné heslá. Kľúč sa uhádnuť nedá. Heslo poslané mailom navyše ostáva v schránke čitateľné navždy.

Vyrobíš ho na počítači (nie na telefóne):
```
ssh-keygen -t ed25519 -C "obedar"
```
Na všetky otázky Enter. Verejný kľúč je potom v `~/.ssh/id_ed25519.pub` (Windows: `C:\Users\Meno\.ssh\id_ed25519.pub`) a začína sa `ssh-ed25519 AAAA…`.

Keby si súkromný kľúč stratil, panel hostingu má webovú konzolu, ktorá funguje aj bez SSH — cez ňu nahráš nový.
</details>

**Zapíš si IPv4 adresu servera.** Budeme ju potrebovať v kroku 2.

### ✅ Kontrola
```
ssh root@46.225.236.143
```
Pri prvom pripojení potvrď odtlačok servera slovom `yes`. Ak si nahral SSH kľúč, nepýta si heslo.

---

## 2. DNS záznam pre `obedy.ahafarma.sk`

V paneli nájdi správu DNS pre doménu `ahafarma.sk` (býva pod *Domény* → *DNS záznamy*).

Pridaj:

| Typ | Názov | Hodnota | TTL |
|---|---|---|---|
| `A` | `obedy` | `46.225.236.143` | 300 |

Do políčka *Názov* píš len **`obedy`**, nie celé `obedy.ahafarma.sk` — panel si zvyšok doplní sám. Ak má server aj IPv6, pridaj rovnako záznam `AAAA`.

TTL 300 (päť minút) nastav zámerne — kým sa všetko ladí, zmeny sa prejavia rýchlo. Neskôr sa dá zvýšiť.

> **Nesiahaj na existujúce záznamy** `ahafarma.sk`. Pridávaš nový, nič neprepisuješ.

### ✅ Kontrola
Na svojom počítači (alebo na [dnschecker.org](https://dnschecker.org)):
```
nslookup obedy.ahafarma.sk
```
Musí vrátiť `46.225.236.143`. Ak ešte nie, počkaj pár minút.

---

## 3. Odosielanie pošty — Brevo

**Prečo nie u Webglobe ani na firemnom serveri:**

| Cesta | Prečo nie |
|---|---|
| Webglobe | e-mailová služba je pre doménu **vypnutá** a formulár ponúka len `@ahafarma.sk`; zapnutie by z Webglobe spravilo obsluhu pošty hlavnej domény, hoci MX smeruje na firemný server |
| Firemný server v technickej miestnosti | naviazalo by odosielanie objednávok na prúd a internet v závode; navyše treba otvárať odosielací port pre IP aplikačného servera |

**Zvolené: Brevo** — francúzska služba, dáta v EÚ, bezplatné pásmo 300 správ denne (my pošleme 10–20), hlási odrazy.

Nastavenie:
- odosielacia doména **`obedy.ahafarma.sk`** — overuje sa len podadresa, hlavná doména ostáva nedotknutá,
- odosielateľ **`objednavky@obedy.ahafarma.sk`**, zobrazované meno `AHAfarma — objednávky obedov`,
- **`Reply-To` na skutočnú firemnú schránku** — odosielacia služba vie len posielať, takže bez toho by odpovede dodávateľov zmizli. Cieľom je samostatná prijímacia schránka `obedy@ahafarma.sk` na firemnom serveri (`docs/02`); dovtedy platí `info@panskepole.sk`. **Odosielacia adresa ostáva `objednavky@obedy.ahafarma.sk`** — posielať ako `@ahafarma.sk` cez Brevo by nešlo, overená je podadresa, nie hlavná doména,
- **meranie preklikov vypnuté**, aby Brevo neprepisovalo odkaz „Potvrdiť prijatie" na svoju doménu,
- **odkaz na odhlásenie z odberu vypnutý** — viď nižšie, je to najdôležitejšie z týchto nastavení.

### ⚠️ Vypnúť „Neodoberať" v transakčných správach

Prvá skúšobná správa prišla do schránky správne, ale Gmail nad ňou zobrazil pruh *„Táto správa bola poslaná z databázy emailových adries"* s tlačidlom **Neodoberať**. Brevo do správy pridalo hlavičku `List-Unsubscribe`.

**Keby na to kuchár klikol, Brevo si jeho adresu zapíše medzi odhlásené a ďalšie objednávky mu už nepošle** — ticho, bez chybovej hlášky. Appka by odosielanie považovala za úspešné a chyba by sa prejavila až tým, že sa jedného dňa neuvarí.

Hľadaj v Brevo nastavenia **transakčných e-mailov** (*Transactional* → nastavenia, prípadne v nastaveniach účtu pri odosielateľoch) a možnosť pridávania odhlasovacieho odkazu vypni. Názov položky sa časom mení, hľadaj slovo *unsubscribe*.

Appka to prebiť nevie — hlavičku pridáva až relay po tom, čo mu správu odovzdáme.

### ✅ Kontrola
Doména musí byť v Brevo označená ako *authenticated*.

Po vypnutí pošli skúšobnú správu znova. **Pruh s tlačidlom Neodoberať už nesmie byť.**

---

## 4. DKIM a DMARC pre podadresu

Brevo overuje odosielanie cez **DKIM**, nie cez SPF — preto sa **SPF hlavnej domény vôbec nedotýkame**. To je oproti pôvodnému plánu podstatné zjednodušenie.

Štyri záznamy, všetky na podadrese `obedy`:

| # | Typ | Meno | Hodnota |
|---|---|---|---|
| 1 | `TXT` | `obedy` | `brevo-code:…` |
| 2 | `CNAME` | `brevo1._domainkey.obedy` | `b1.obedy-ahafarma-sk.dkim.brevo.com` |
| 3 | `CNAME` | `brevo2._domainkey.obedy` | `b2.obedy-ahafarma-sk.dkim.brevo.com` |
| 4 | `TXT` | `_dmarc.obedy` | `v=DMARC1; p=none; rua=…` |

Poznámky z nasadzovania:
- hodnoty **kopírovať tlačidlom**, na obrazovke sú skrátené,
- Webglobe pri každom novom zázname vracia *Typ* na `A` — treba ho zakaždým prepnúť,
- pri `CNAME` si Webglobe doplní bodku na koniec hodnoty sám,
- `p=none` v DMARC znamená „len hlás, nič nezahadzuj"; sprísniť na `p=quarantine` až po pár týždňoch, keď z hlásení vidno, že všetko prechádza.

### ✅ Kontrola
Po pridaní záznamov v Brevo **Verify records** → **Authenticate domain**.

Potom pošli skúšobnú správu **na Gmail adresu**, otvor ju → tri bodky → **„Zobraziť originál"**. Musíš vidieť:

```
DKIM:  PASS
DMARC: PASS
```

SPF sa bude vzťahovať na návratovú doménu Brevo, nie na našu — to je v poriadku. DMARC prejde vďaka DKIM.

---

## 5. Zabezpečenie servera

Prihlás sa ako root a spusti postupne:

```bash
# aktualizácia systému
apt update && apt upgrade -y

# vlastný používateľ namiesto roota
adduser aha
usermod -aG sudo aha

# prenos SSH kľúča na nového používateľa
rsync --archive --chown=aha:aha ~/.ssh /home/aha

# firewall — poradie je dôležité, SSH povoľ PRED zapnutím
apt install ufw -y
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# automatické bezpečnostné aktualizácie
apt install unattended-upgrades -y
dpkg-reconfigure --priority=low unattended-upgrades
```

### ⚠️ Teraz otvor **druhé okno terminálu** a vyskúšaj:
```
ssh aha@obedy.ahafarma.sk
```
**Až keď to funguje**, zakáž v prvom okne prihlásenie rootom a heslom:

```bash
nano /etc/ssh/sshd_config
```
Nastav:
```
PermitRootLogin no
PasswordAuthentication no
```
Ulož (`Ctrl+O`, `Enter`, `Ctrl+X`) a reštartuj:
```bash
systemctl restart ssh
```

> Kým DNS ešte nefunguje, použi v týchto príkazoch `46.225.236.143` namiesto doménového mena.

> Prvé okno **nezatváraj**, kým si v druhom nevyskúšal, že sa vieš prihlásiť. Toto je najčastejší spôsob, ako sa človek vyzamkne z vlastného servera.

### ✅ Kontrola
```
ssh aha@obedy.ahafarma.sk   # funguje
ssh root@obedy.ahafarma.sk     # odmietnuté — presne tak to má byť
sudo ufw status                # aktívne, otvorené 22, 80, 443
```

**Port databázy (5432) neotváraj.** Databáza bude bežať vnútri Dockeru a von sa dostávať nemá.

---

## 6. Docker

```bash
curl -fsSL https://get.docker.com | sh
usermod -aG docker aha
```
Odhlás sa a prihlás znova, aby sa členstvo v skupine prejavilo.

### ✅ Kontrola
```
docker run --rm hello-world
```
Vypíše „Hello from Docker!".

---

## 7. Odosielanie — firemný server, Brevo ako záloha

Po overení, že cez Brevo pošta chodí, sme sa rozhodli **skúsiť firemný mailový server**. Dôvod: jedno miesto namiesto dvoch, žiadny cudzí účet a zmizne hlavička `List-Unsubscribe`, ktorú Brevo pridávalo.

**Nastavenie v prevádzke:**

| | |
|---|---|
| Odosielateľ | `obedy@ahafarma.sk` — tá istá schránka aj prijíma, takže `Reply-To` netreba |
| SMTP | `mail.ahafarma.sk`, **port 465, implicitné SSL** *(nie STARTTLS ako pri Breve)* |
| Prihlasovacie meno | `obedy` |
| Heslo | v správcovi hesiel; na server sa vkladá raz, priamo do konfiguračného súboru |
| DKIM | podpisovanie potvrdené správcom |
| Firewall | TCP 465 povolený zo zdroja `46.225.236.143` |

**Brevo ostáva ako záložná cesta.** Účet, overená doména aj štyri DNS záznamy na podadrese `obedy` sa nerušia — nič nestoja a prepnutie späť je zmena piatich údajov. Cieľový stav je, aby appka skúsila firemný server a **pri zlyhaní automaticky prepla na Brevo**; objednávka tak neostane visieť ani pri výpadku prúdu v technickej miestnosti.

### Zostáva

- [ ] overiť odoslanie cez `mail.ahafarma.sk` skúšobnou správou zo servera
- [ ] potvrdiť **DKIM, SPF aj DMARC PASS** v Gmaile a že **nie je pruh „Neodoberať"**
- [ ] **prístup na NAS** pre zálohy — `docs/02-zadanie-pre-it.md`

Heslá a kľúče neposielaj cez chat — patria do správcu hesiel a odtiaľ priamo na server.

---

## Zhrnutie času

| Krok | Trvanie |
|---|---|
| 1 — objednávka VPS | 10 min + čakanie na sprístupnenie |
| 2 — DNS | 5 min + pár minút na prejavenie |
| 3 — schránka | 5 min |
| 4 — SPF, DKIM, DMARC | 20 min vrátane overenia |
| 5 — zabezpečenie | 15 min |
| 6 — Docker | 5 min |

Reálne **jedno popoludnie**, z toho polovica čakanie.

---

## Keď niečo nejde

| Problém | Kde hľadať |
|---|---|
| `nslookup` nevracia IP | zlý typ záznamu, alebo si do *Názov* napísal celé `obedy.ahafarma.sk` namiesto `obedy` |
| Mail nechodí | odosielacia adresa nie je v Brevo pridaná ako *Sender*, alebo je zlý SMTP kľúč |
| SPF ukazuje cudziu doménu | **tak to má byť** — Brevo overuje cez DKIM, návratová doména je jeho; DMARC prejde vďaka DKIM |
| DKIM FAIL | `CNAME` záznamy `brevo1`/`brevo2._domainkey.obedy` nie sú v DNS, alebo nesedí selektor |
| Vyzamkol som sa zo servera | konzola cez panel Webglobe funguje aj bez SSH — cez ňu sa vieš dostať späť |
