# 🥛 Objednávanie mlieka

Interná webová appka na objednávanie mlieka vo firme. Zamestnanec si vyklikne,
čo a koľko chce, a dostane **potvrdenie cez WhatsApp**. Nákupca vidí súhrnný
nákupný zoznam za celý týždeň.

## Čo appka vie

- 📋 **Katalóg** druhov mlieka (kravské, bezlaktózové, rastlinné) – dá sa rozšíriť cez API.
- 🛒 **Objednávka** s výberom množstva, poznámkou a menom.
- 💬 **WhatsApp potvrdenie** zamestnancovi po odoslaní objednávky (cez Twilio).
- 🔔 **Upozornenie nákupcovi** o každej novej objednávke (voliteľné).
- 📊 **Súhrn pre nákupcu** – koľko čoho treba nakúpiť za daný ISO týždeň.

## Architektúra

```
frontend/   React + Vite  (UI v prehliadači, PC aj mobil)
backend/    Node.js + Express  (REST API, JSON úložisko, Twilio WhatsApp)
```

Dáta sa ukladajú do `backend/data/db.json` (žiadna databáza netreba). Pre reálnu
prevádzku sa úložisko dá vymeniť za SQLite/Postgres bez zásahu do API vrstvy.

## Rýchly štart (vývoj)

```bash
# 1. inštalácia závislostí
npm run install:all

# 2. spusti backend (terminál A) – beží na http://localhost:3001
npm run dev:backend

# 3. spusti frontend (terminál B) – beží na http://localhost:5173
npm run dev:frontend
```

Otvor `http://localhost:5173`. API požiadavky sa automaticky preposielajú na backend.

## Produkčné spustenie (jeden proces)

```bash
npm run install:all
npm run build      # vytvorí frontend/dist
npm start          # backend servíruje API aj hotový frontend na porte 3001
```

Otvor `http://localhost:3001`.

## Zapnutie WhatsApp (Twilio)

Bez konfigurácie appka beží v **DEV režime** – WhatsApp správy sa iba vypíšu do
konzoly backendu, takže si celý tok vyskúšaš aj bez účtu.

Pre reálne posielanie:

1. Vytvor si účet na [Twilio](https://www.twilio.com) a v konzole aktivuj
   **Messaging → Try WhatsApp** (Sandbox na testovanie, alebo schválené firemné
   číslo pre ostrú prevádzku).
2. Skopíruj `backend/.env.example` do `backend/.env` a doplň:

   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ADMIN_WHATSAPP_TO=whatsapp:+421900000000   # voliteľné – číslo nákupcu
   ```

3. Reštartuj backend. Badge v hlavičke appky sa prepne na **„WhatsApp: aktívne"**.

> **Dôležité (produkcia):** Meta vyžaduje pre správy, ktoré firma posiela ako
> prvá (napr. potvrdenie objednávky), **vopred schválené šablóny** a overenie
> firmy. Na testovanie cez Twilio Sandbox to netreba – stačí, aby sa každý
> príjemca raz pripojil k sandboxu.

## API prehľad

| Metóda | Endpoint | Popis |
|--------|----------|-------|
| GET | `/api/products` | Zoznam produktov |
| POST | `/api/products` | Pridať produkt |
| DELETE | `/api/products/:id` | Skryť produkt (soft delete) |
| GET | `/api/orders?week=YYYY-Www` | Objednávky (voliteľne za týždeň) |
| POST | `/api/orders` | Vytvoriť objednávku + poslať WhatsApp |
| GET | `/api/summary?week=YYYY-Www` | Nákupný súhrn za týždeň |
| GET | `/api/current-week` | Aktuálny ISO týždeň |
| GET | `/api/health` | Stav + WhatsApp režim |

## Ďalšie možné kroky

- Prihlásenie zamestnancov (napr. cez firemné SSO) namiesto ručného mena.
- Uzávierka objednávok k deadline-u (napr. štvrtok 12:00) + automatická
  pripomienka cez WhatsApp deň vopred.
- Export nákupného zoznamu do PDF/Excelu pre nákupcu.
- Prepnutie JSON úložiska na skutočnú databázu.
