# Nasadenie na Windows Server

Máš dve možnosti. Pre firemný Windows Server odporúčam **možnosť A (natívne)** —
je ľahšia a bez licenčných otáznikov Docker Desktopu.

---

## Možnosť A — natívne (Node + Caddy ako Windows služby) ✅ odporúčané

Appka a HTTPS proxy bežia ako **Windows služby**, takže po reštarte servera
nabehnú samé.

### Čo treba nainštalovať (raz)
1. **Node.js LTS** — https://nodejs.org (inštalátor `.msi`).
2. **Caddy pre Windows** — https://caddyserver.com/download → stiahni `caddy.exe`
   (napr. do `C:\caddy\caddy.exe`). Zabezpečuje automatické HTTPS.
3. **NSSM** — https://nssm.cc → rozbaľ a pridaj `nssm.exe` do PATH. Slúži na
   spustenie appky ako služby.

### Kroky
```powershell
# 1) stiahni projekt (Git alebo ZIP) a otvor PowerShell v jeho priečinku
cd C:\apps\milk

# 2) konfigurácia – skopíruj a uprav (uzávierka, Twilio)
copy backend\.env.example backend\.env
notepad backend\.env

# 3) zostavenie (závislosti + build frontendu)
powershell -ExecutionPolicy Bypass -File deploy\windows\build.ps1

# 4a) RÝCHLY TEST v popredí (http://localhost:3001)
powershell -ExecutionPolicy Bypass -File deploy\windows\run.ps1

# 4b) alebo rovno ako SLUŽBY s HTTPS (spusti ako Administrátor)
powershell -ExecutionPolicy Bypass -File deploy\windows\install-services.ps1 `
    -SiteAddress "mlieko.ahafarma.sk" -CaddyPath "C:\caddy\caddy.exe"
```

Appka potom beží na `https://mlieko.ahafarma.sk`. Certifikát vybaví Caddy sám.

### Správa služieb
```powershell
nssm restart MilkApp        # reštart appky (napr. po aktualizácii)
nssm restart MilkCaddy
nssm stop MilkApp
nssm remove MilkApp confirm # odinštalovanie
```
Logy appky: `backend\logs\app.log`.

### Aktualizácia po zmene kódu
```powershell
git pull
powershell -ExecutionPolicy Bypass -File deploy\windows\build.ps1
nssm restart MilkApp
```

---

## Možnosť B — Docker Desktop

Ak už na serveri Docker používate, funguje presne setup z hlavného `README.md`:
```powershell
copy .env.example .env
notepad .env
docker compose up -d --build
```
> Pozn.: **Docker Desktop je pre väčšie firmy platený** a na Windows Serveri
> vyžaduje WSL2/kontajnery. Preto je pre bežný firemný server jednoduchšia
> možnosť A.

---

## Sieť a doména (platí pre obe možnosti)

- **Doména:** nasmeruj **A záznam** (napr. `mlieko.ahafarma.sk`) na verejnú IP
  servera. Caddy potom vydá HTTPS certifikát automaticky.
- **Firewall:** na serveri povoľ prichádzajúce porty **80** a **443**
  (Windows Firewall → Inbound Rules). Port 80 je potrebný na vydanie certifikátu.
- **Server bez verejnej IP** (len vnútrofiremný):
  - **Cloudflare Tunnel** — vystaví appku na HTTPS bez otvárania portov.
  - **Firemná VPN / len LAN** — spusti s `SITE_ADDRESS=:80` (bez verejného HTTPS),
    appka bude dostupná na `http://<názov-servera>` zvnútra siete.
- **IIS už bežíte na 80/443?** Buď nechaj HTTPS na IIS (reverse proxy cez
  *URL Rewrite + ARR* na `http://localhost:3001`) a Caddy nepoužívaj, alebo daj
  Caddy na iné porty. Ak chceš, pripravím konfiguráciu aj pre IIS.

---

## Ktorý smer zvoliť
- **Bežný firemný Windows Server, chcem to len rozbehnúť** → možnosť A.
- **Už máme Docker a tím ho pozná** → možnosť B.
- **Už tam beží IIS a chceme cezeň** → napíš, doplním IIS návod.
