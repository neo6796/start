-- Obedár — základná schéma
-- Pravidlá: nič sa nemaže, len sa ukončí platnosť. Ceny sa fotia na objednávku.

CREATE TABLE firma (
  id          serial PRIMARY KEY,
  nazov       text NOT NULL UNIQUE,
  aktivna     boolean NOT NULL DEFAULT true
);

CREATE TABLE prevadzka (
  id          serial PRIMARY KEY,
  nazov       text NOT NULL UNIQUE,
  skratka     text NOT NULL,
  aktivna     boolean NOT NULL DEFAULT true
);

CREATE TABLE poskytovatel (
  id            serial PRIMARY KEY,
  nazov         text NOT NULL UNIQUE,
  znacenie      text NOT NULL DEFAULT 'upper',   -- upper | lower | arabic | roman
  pocet_jedal   int  NOT NULL DEFAULT 5,
  email         text,
  telefon       text,
  -- cena s DPH je to, čo jedáleň vyhlási; čistá sa z nej odvodzuje v plnej presnosti
  cena_s_dph    numeric(8,4) NOT NULL,
  sadzba_dph    numeric(5,2) NOT NULL DEFAULT 19,
  model         text NOT NULL DEFAULT 'eko',     -- eko | std
  odhlasenie_do time NOT NULL DEFAULT '07:30',
  aktivny       boolean NOT NULL DEFAULT true
);

CREATE TABLE tim (
  id          serial PRIMARY KEY,
  nazov       text NOT NULL UNIQUE,
  aktivny     boolean NOT NULL DEFAULT true
);

-- Osoba. Vnútorný kľúč je id; dochádzkový kód je ÚDAJ, nie kľúč (koncept 1.3b).
CREATE TABLE osoba (
  id              serial PRIMARY KEY,
  kod_dochadzka   text UNIQUE,
  kod_mzdy        text,
  priezvisko      text NOT NULL,
  meno            text NOT NULL,
  firma_id        int REFERENCES firma(id),
  vztah           text,                          -- pp | zivnostnik
  platca_dph      boolean NOT NULL DEFAULT false,
  tim_id          int REFERENCES tim(id),
  predak_id       int REFERENCES osoba(id),
  prevadzka_id    int REFERENCES prevadzka(id),
  poskytovatel_id int REFERENCES poskytovatel(id),
  je_predak       boolean NOT NULL DEFAULT false,
  je_admin        boolean NOT NULL DEFAULT false,
  aktivny         boolean NOT NULL DEFAULT true,
  plati_od        date,
  plati_do        date,
  heslo_hash      text,
  vytvorene       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON osoba(tim_id) WHERE aktivny;
CREATE INDEX ON osoba(predak_id) WHERE aktivny;

-- Menu na týždeň. Názvy jedál sú voliteľné, príloha je plnohodnotná (rozhodnutie 18).
CREATE TABLE menu_tyzden (
  id              serial PRIMARY KEY,
  poskytovatel_id int NOT NULL REFERENCES poskytovatel(id),
  pondelok        date NOT NULL,
  priloha_nazov   text,
  priloha_typ     text,
  priloha_data    bytea,
  UNIQUE (poskytovatel_id, pondelok)
);

CREATE TABLE menu_jedlo (
  id          serial PRIMARY KEY,
  menu_id     int NOT NULL REFERENCES menu_tyzden(id) ON DELETE CASCADE,
  den         int NOT NULL CHECK (den BETWEEN 0 AND 4),
  poradie     int NOT NULL,
  nazov       text,
  UNIQUE (menu_id, den, poradie)
);

-- Objednávka na jeden deň jedného človeka.
-- jedlo: NULL = nerozhodnuté, -1 = bez obeda, 0..n = poradie jedla (koncept 4.6)
CREATE TABLE objednavka (
  id              serial PRIMARY KEY,
  osoba_id        int NOT NULL REFERENCES osoba(id),
  datum           date NOT NULL,
  jedlo           int,
  poskytovatel_id int REFERENCES poskytovatel(id),
  zadal_id        int REFERENCES osoba(id),
  zadane_ako      text,                          -- sam | predak | admin | spatne
  spatny_zapis    boolean NOT NULL DEFAULT false,
  dovod           text,
  -- cena odfotená v deň obeda; neskoršia zmena cenníka minulosť neprepíše (6.1)
  cena_bez_dph    numeric(8,4),
  sadzba_dph      numeric(5,2),
  prispevok_zl    numeric(8,4),
  socialny_fond   numeric(8,4),
  podiel_stravnik numeric(8,4),
  dph_stravnik    numeric(8,4),
  zmenene         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (osoba_id, datum)
);
CREATE INDEX ON objednavka(datum);

CREATE TABLE tyzden_stav (
  pondelok        date PRIMARY KEY,
  uzavrety        boolean NOT NULL DEFAULT false,
  uzavrel_id      int REFERENCES osoba(id),
  uzavrete_kedy   timestamptz
);

-- Mesiac má dva zámky, nie jeden (rozhodnutie 46)
CREATE TABLE mesiac_stav (
  mesiac              date PRIMARY KEY,          -- vždy prvý deň mesiaca
  mzdy_uzavrete       boolean NOT NULL DEFAULT false,
  mzdy_kedy           timestamptz,
  faktury_uzavrete    boolean NOT NULL DEFAULT false,
  faktury_kedy        timestamptz
);

-- Čo sa naozaj odoslalo dodávateľovi a či to potvrdil (koncept 7.2.1)
CREATE TABLE odoslanie (
  id              serial PRIMARY KEY,
  poskytovatel_id int NOT NULL REFERENCES poskytovatel(id),
  datum           date NOT NULL,
  druh            text NOT NULL,                 -- predpoved | objednavka
  poctov          jsonb NOT NULL,
  porcii          int NOT NULL,
  odoslane        timestamptz,
  stav            text,                          -- ok | zlyhalo
  chyba           text,
  potvrdene       timestamptz,
  token           text UNIQUE
);
CREATE INDEX ON odoslanie(datum);

-- Nastavenia s platnosťou od dátumu (6.1). Nikdy sa neprepisujú, pridáva sa riadok.
CREATE TABLE nastavenie (
  kluc      text NOT NULL,
  plati_od  date NOT NULL,
  hodnota   text NOT NULL,
  PRIMARY KEY (kluc, plati_od)
);

CREATE TABLE audit (
  id        bigserial PRIMARY KEY,
  kedy      timestamptz NOT NULL DEFAULT now(),
  kto_id    int REFERENCES osoba(id),
  co        text NOT NULL,
  detail    jsonb
);
CREATE INDEX ON audit(kedy DESC);

CREATE TABLE relacia (
  token     text PRIMARY KEY,
  osoba_id  int NOT NULL REFERENCES osoba(id),
  vytvorena timestamptz NOT NULL DEFAULT now(),
  plati_do  timestamptz NOT NULL
);

-- Východiskové hodnoty rozúčtovania (koncept 6.2, potvrdené 5. 8. 2026)
INSERT INTO nastavenie (kluc, plati_od, hodnota) VALUES
  ('prispevok_zl_pct',  '2026-01-01', '55'),
  ('stravnik_min_pct',  '2026-01-01', '35'),
  ('stravnik_max_pct',  '2026-01-01', '45'),
  ('dph_stravnik_pct',  '2026-01-01', '19'),
  ('stravne_5_12',      '2024-09-01', '8.30');
