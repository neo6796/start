-- Stravník môže mať pridelených viac jedální.
--
-- Predvolene má jednu — tú v osoba.poskytovatel_id, ktorá ostáva jeho domovskou.
-- Admin alebo predák mu môže povoliť ďalšiu; vtedy má v matici ponuky pod sebou,
-- jeden riadok na jedáleň (preview, obrazovka Predák).
--
-- Krížik „nechcem obed" ostáva jeden na deň a nie je tu — je to rozhodnutie
-- o dni, nie o dodávateľovi.

CREATE TABLE osoba_jedalen (
  osoba_id        int NOT NULL REFERENCES osoba(id) ON DELETE CASCADE,
  poskytovatel_id int NOT NULL REFERENCES poskytovatel(id),
  pridal_id       int REFERENCES osoba(id),
  kedy            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (osoba_id, poskytovatel_id)
);

-- Domovská jedáleň patrí do zoznamu tiež, nech sa nikde nemusí riešiť zvlášť.
INSERT INTO osoba_jedalen (osoba_id, poskytovatel_id)
SELECT id, poskytovatel_id FROM osoba WHERE poskytovatel_id IS NOT NULL
ON CONFLICT DO NOTHING;
