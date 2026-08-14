-- Predáctvo patrí tímu, nie karte človeka.
--
-- Doteraz to bolo na dvoch miestach naraz: `tim.predak_id` hovoril, kto tím
-- vedie, a `osoba.je_predak` hovoril, že niekto je predák. Dve pravdy o tej
-- istej veci sa raz rozídu — človek s odškrtnutým `je_predak` ostal predákom
-- tímu a appka mu ponuku predáka schovala, hoci maticu mal viesť.
--
-- Predákom je odteraz ten, kto je pri niektorom tíme zapísaný. Nič sa nikde
-- nedrží zvlášť, takže sa nemá čo rozísť. Zároveň to dovoľuje to, čo život
-- aj tak robí: viac predákov na tíme (predák a jeho zástupca) a jedného
-- predáka na viacerých tímoch.

CREATE TABLE tim_predak (
  tim_id    int NOT NULL REFERENCES tim(id) ON DELETE CASCADE,
  osoba_id  int NOT NULL REFERENCES osoba(id) ON DELETE CASCADE,
  -- Zástupca má tie isté práva; rozdiel je v tom, koho sa pýtať ako prvého.
  zastupca  boolean NOT NULL DEFAULT false,
  pridal_id int REFERENCES osoba(id),
  kedy      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tim_id, osoba_id)
);
CREATE INDEX ON tim_predak (osoba_id);

INSERT INTO tim_predak (tim_id, osoba_id)
SELECT id, predak_id FROM tim WHERE predak_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Kto bol označený ako predák a pritom žiadny tím nevedie, by po tejto zmene
-- ponuku predáka stratil. To je správne — nemal čo viesť — ale nech to nie je
-- ticho: zapíše sa to do denníka.
INSERT INTO audit (co, detail)
SELECT 'migracia.predak-bez-timu',
       jsonb_build_object('osoba_id', o.id, 'meno', o.priezvisko || ' ' || o.meno)
  FROM osoba o
 WHERE o.je_predak AND NOT EXISTS (SELECT 1 FROM tim_predak tp WHERE tp.osoba_id = o.id);

ALTER TABLE tim   DROP COLUMN IF EXISTS predak_id;
ALTER TABLE osoba DROP COLUMN IF EXISTS je_predak;
-- `osoba.predak_id` bol pozostatok spred rozhodnutia 1.2 a už ho nikto nečítal.
ALTER TABLE osoba DROP COLUMN IF EXISTS predak_id;
