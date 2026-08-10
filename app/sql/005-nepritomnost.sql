-- Neprítomnosť — jeden záznam, tri použitia (koncept 1.4).
--
-- Ten istý záznam „kto je preč, od–do, prečo" obsluhuje:
--   1. zastupovanie   — preč je predák, zapne sa zástupca (príde neskôr)
--   2. maticu predáka — dni sa nastavia na „bez obeda" a je vidieť prečo
--   3. kontrolu cez dochádzku — neprítomnosť je očakávaná, takže sa
--      pri uzávierke nehlási ako nález
--
-- Tretí bod je hlavný dôvod, prečo to má zmysel viesť. Bez neho by pri
-- uzávierke vypadol zoznam, v ktorom je polovica ľudí na dovolenke — a taký
-- zoznam nikto po druhýkrát neotvorí.
--
-- Nič neblokuje: deň označený neprítomnosťou sa dá kedykoľvek prebiť.
-- Je to predvolená hodnota, nie zámok.

CREATE TABLE nepritomnost (
  id        serial PRIMARY KEY,
  osoba_id  int  NOT NULL REFERENCES osoba(id) ON DELETE CASCADE,
  od        date NOT NULL,
  do_       date NOT NULL,
  dovod     text NOT NULL CHECK (dovod IN ('dovolenka', 'pn', 'skolenie', 'ine')),
  zadal_id  int  REFERENCES osoba(id),
  kedy      timestamptz NOT NULL DEFAULT now(),
  CHECK (do_ >= od)
);
CREATE INDEX ON nepritomnost (osoba_id, od, do_);
