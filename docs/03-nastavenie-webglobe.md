# Nastavenie servera — krok za krokom

> Postup platí pre Webglobe aj Hetzner. Kroky 1 a 5–6 sa robia na serveri, kroky 2–4 v paneli, kde je spravovaná doména `ahafarma.sk` a pošta.

Doména: **`obedy.ahafarma.sk`** · pošta: **`obedy@ahafarma.sk`**
Server: **`aha-apps`** u Hetznera, CPX22, Debian 13, IP **`46.225.236.143`**

## Stav

| Krok | Stav |
|---|---|
| 1 — VPS | ✅ hotovo — `aha-apps`, CPX22, Debian 13, Hetzner Nuremberg |
| 2 — DNS `obedy.ahafarma.sk` | ✅ hotovo a overené — `nslookup` vracia `46.225.236.143` |
| 3 — schránka `obedy@ahafarma.sk` | ⬜ čaká |
| 4 — SPF, DKIM, DMARC | ✅ už existujú na doméne, netreba pridávať |
| 5 — zabezpečenie servera | ✅ hotovo a overené (root aj heslá zablokované) |
| 6 — Docker | ✅ hotovo, `hello-world` prešiel |

Zostáva už len to, čo sa robí v paneli Webglobe: kroky 2 až 4.

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

## 3. Poštová schránka

**Zistené v DNS `ahafarma.sk`:** MX smeruje na `mail.ahafarma.sk` → `62.169.176.222`, teda firemná pošta beží u Webglobe. Existuje SPF `v=spf1 a mx a:mail.ahafarma.sk ip4:62.169.176.222 ~all`, DKIM (`default._domainkey`) aj DMARC (`p=none`).

**Dôsledok: podadresa pre poštu nie je potrebná a v DNS sa nemení nič.** Appka odosiela cez tie isté servery Webglobe, ktoré firemný SPF už povoľuje. Pôvodný plán s `noreply@obedy.ahafarma.sk` mal chrániť SPF hlavnej domény pred úpravou — keď ju netreba upravovať, stráca zmysel.

Založ schránku **`obedy@ahafarma.sk`**:

- heslo dlhé a náhodné, **odlož ho** — bude ho potrebovať aplikácia,
- `obedy@` namiesto `noreply@` zámerne: dodávateľ vidí zmysluplného odosielateľa a jeho odpoveď („nedostali sme", „14. nevaríme") dorazí niekam, kde ju človek prečíta.

SMTP: `mail.ahafarma.sk`, port 465 alebo 587, s autentifikáciou.

### ✅ Kontrola
Prihlás sa do webmailu ako `obedy@ahafarma.sk` a pošli testovací mail — viď kontrola v kroku 4.

---

## 4. SPF, DKIM a DMARC

Bez týchto troch záznamov Gmail aj Microsoft objednávky zahodia alebo hodia do spamu.

**Všetky tri už na doméne existujú** (viď krok 3), takže sa nepridáva nič. Táto kapitola ostáva ako popis, čo to je a čo robiť, keby test neprešiel.

`p=none` v existujúcom DMARC znamená **„len hlás, nič nezahadzuj"**. Nechaj to tak niekoľko týždňov. Až keď z hlásení vidno, že všetko prechádza, dá sa sprísniť na `p=quarantine`. Keby si nastavil prísny režim hneď a niečo by nesedelo, objednávky by sa prestali doručovať a nikto by nevedel prečo.

### ✅ Kontrola — táto je najdôležitejšia z celého návodu
Pošli z `obedy@ahafarma.sk` mail **na nejakú Gmail adresu**. V Gmaile ho otvor → tri bodky → **„Zobraziť originál"**.

Musíš vidieť **trikrát PASS**:
```
SPF:   PASS
DKIM:  PASS
DMARC: PASS
```
Ak niektorý chýba alebo je FAIL, ďalej nechoď — presne toto rozhoduje o tom, či objednávky dorazia dodávateľom. Pri zlyhaní SPF sa do existujúceho záznamu **pridá** odosielacia adresa Webglobe; existujúci obsah sa nikdy neprepisuje.

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

## 7. Čo mi pošli

- [ ] **IP adresa** VPS
- [ ] **SSH prístup** pre používateľa `aha` (alebo pridaj môj verejný kľúč)
- [ ] **SMTP údaje**: server `mail.webglobe.sk`, port 465 alebo 587, používateľ `noreply@obedy.ahafarma.sk`, heslo
- [ ] potvrdenie, že **trojitý PASS z kroku 4 prešiel**

Heslá neposielaj cez chat — daj ich radšej do správcu hesiel a zdieľaj odkazom, alebo mi ich nadiktuj.

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
| Mail nechodí | schránka nemá založenú doménu pre poštu (krok 3) |
| SPF FAIL | v SPF chýbajú servery Webglobe, alebo máš na doméne **dva SPF záznamy** — smie byť len jeden |
| DKIM FAIL | záznam nie je v DNS, alebo nesedí selektor |
| Vyzamkol som sa zo servera | konzola cez panel Webglobe funguje aj bez SSH — cez ňu sa vieš dostať späť |
