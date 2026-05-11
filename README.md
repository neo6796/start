# 🍲 Obedy

Aplikácia na **centralizované objednávanie obedov** pre cca 50 ľudí v organizácii.

## Funkcie

- **Prihlásenie cez email** (magic link, žiadne heslá)
- **Denné menu** s tlačidlom *Objednať / Zmeniť / Zrušiť* (1 obed na osobu na deň)
- **Uzávierka** podľa hodiny nastavenej na reštaurácii
- **Admin sekcia**:
  - Ručné pridávanie menu na ľubovoľný deň
  - Automatický **scraper** menu z webu reštaurácie (gastroabm.sk a podobné)
  - Denný prehľad objednávok (kto čo má, súhrn pre kuchyňu)
  - **Evidencia dlhov** – kto koľko dlhuje, evidencia platieb
  - Správa reštaurácií a používateľov
- **PWA** – inštalovateľná na mobil, push notifikácie pred uzávierkou

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind v4 · Prisma + SQLite · Auth.js v5 (Nodemailer) · web-push · cheerio.

## Štart

```bash
pnpm install
cp .env .env.local        # uprav podľa potreby
pnpm db:migrate
pnpm db:seed              # demo dáta (voliteľné)
pnpm vapid:generate       # vygeneruj VAPID kľúče, vlož do .env
pnpm dev
```

Otvor http://localhost:3000.

## Konfigurácia (.env)

| Premenná | Účel |
| --- | --- |
| `DATABASE_URL` | SQLite súbor (`file:./dev.db`) |
| `AUTH_SECRET` | náhodný reťazec, min. 32 znakov (`openssl rand -base64 32`) |
| `EMAIL_SERVER_*`, `EMAIL_FROM` | SMTP server pre magic link emaily |
| `ADMIN_EMAILS` | čiarkou oddelené emaily, ktoré sa pri prvom prihlásení stanú adminmi |
| `VAPID_*`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | kľúče pre Web Push (vygeneruj `pnpm vapid:generate`) |
| `CRON_SECRET` | token pre Authorization header pri volaní `/api/scrape` a `/api/push/remind` |
| `SCRAPER_USER_AGENT` | User-Agent pre scraper |

Bez SMTP appka v dev móde vypisuje magic linky do konzoly servera.

## Prihlásenie

1. Otvor `/login`, zadaj email.
2. Klikni na odkaz v emaili (alebo skopíruj z konzoly).
3. Prvý email v `ADMIN_EMAILS` sa stane adminom automaticky.

## Scraper

Scraper je nastavený pre **gastroabm.sk** ale je dostatočne defenzívny aj na podobné stránky:

- Najprv hľadá nadpisy obsahujúce dátum, pod nimi zoznam/tabuľku položiek
- Druhý fallback: jedna tabuľka na stránke = dnešné menu

Spustenie:

- **Manuálne**: Admin → Scraper → *Spustiť scraping*
- **CLI**: `pnpm scrape:once`
- **HTTP/cron**: `POST /api/scrape` s hlavičkou `Authorization: Bearer $CRON_SECRET`

Príklad linux crontab (každý deň o 7:00):
```
0 7 * * * curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://obedy.firma.sk/api/scrape
```

## Push notifikácie

Endpoint `POST /api/push/remind` pošle notifikáciu každému, kto má aktívnu push subscription a dnes ešte neobjednal. Nastav cron napr. 30 minút pred uzávierkou:
```
30 9 * * 1-5 curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://obedy.firma.sk/api/push/remind
```

## Štruktúra projektu

```
prisma/
  schema.prisma          # User, Restaurant, MenuDay, MenuItem, Order, Payment, PushSubscription
  seed.ts                # demo dáta
src/
  app/
    page.tsx             # denné menu + objednávky (homepage)
    moje-objednavky/     # história objednávok + saldo
    admin/               # admin tabule
    api/                 # auth, scrape (cron), push subscribe/remind
    actions/             # server actions
    login/               # magic-link prihlásenie
  components/            # MenuDayCard, MenuDayEditor, DebtsTable, PushButton, ...
  lib/                   # prisma, dates, scraper, push
  auth.ts                # Auth.js konfigurácia
scripts/
  generate-vapid.ts      # VAPID kľúče pre push
  scrape-once.ts         # CLI scraper
public/
  manifest.webmanifest   # PWA manifest
  sw.js                  # service worker (push + install)
```

## Produkčné nasadenie (Docker)

Pre 50 ľudí postačí 1 vCPU / 1 GB RAM. Najjednoduchšie cez Docker:

```bash
cp .env.production.example .env.production
# vyplň AUTH_SECRET (openssl rand -base64 32), SMTP, ADMIN_EMAILS, VAPID, CRON_SECRET
docker compose up -d --build
```

App beží na `http://localhost:3000`. Pred verejné nasadenie postav reverse proxy
(Caddy/nginx/Traefik) s HTTPS – Web Push aj magic-link odkazy potrebujú HTTPS.

**Volume**: SQLite DB sa drží v dockerovskom volume `obedy-data` (mount na `/data`).
Migrácie sa automaticky aplikujú pri štarte kontajnera (entrypoint volá
`prisma migrate deploy`).

**Záloha DB** (jednoduchý nightly cron):
```bash
docker run --rm -v obedy_obedy-data:/src -v $(pwd)/backup:/dst alpine \
  sh -c "cp /src/dev.db /dst/dev-$(date +%Y%m%d).db"
```

Pre kontinuálnu replikáciu (point-in-time recovery) odporúčam
[Litestream](https://litestream.io) ako sidecar kontajner.

**Cron-y** mimo Dockera (na hostiteľovi):
```cron
# Pripomienka pred uzávierkou (Po-Pi 9:30)
30 9 * * 1-5 curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://obedy.firma.sk/api/push/remind

# Scraping (až to neskôr zapneš)
0 7 * * 1-5 curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://obedy.firma.sk/api/scrape
```

### Alternatíva: bez Dockera

```bash
pnpm build
DATABASE_URL=file:./prod.db pnpm prisma migrate deploy
NODE_ENV=production pnpm start
```

## Ďalšie nápady

- Hlasovanie o reštaurácii pre nasledujúci týždeň
- Slack / Teams bot ako tenká vrstva nad rovnakým API
- Doplnenie scrapera pre gastroabm.sk (kód je pripravený, len treba odomknúť v UI)
