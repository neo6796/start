-- Predák patrí tímu, nie osobe.
--
-- Koncept 1.2: „Tím = entita s prideleným predákom, nie pole »nadriadený«
-- na osobe." Prvá verzia to mala obrátene — predák visel na každom človeku
-- zvlášť, takže dvaja ľudia v tom istom tíme mohli mať dvoch rôznych predákov.
-- Taký stav nič neznamená a pri stavbe matice sa z neho nedá rozhodnúť,
-- čia je ktorá osoba.
--
-- Expand → migrate → contract (koncept 07): stĺpec na osobe sa teraz
-- nemaže. Najprv sa prestane používať a odstráni sa až v ďalšom kroku,
-- keď bude isté, že sa naň nič neviaže.

ALTER TABLE tim ADD COLUMN predak_id int REFERENCES osoba(id);

-- Ak už niekto väzby stihol vyplniť, prenesieme ich: tím dostane toho
-- predáka, ktorý je pri jeho ľuďoch najčastejší.
UPDATE tim t SET predak_id = (
  SELECT o.predak_id
    FROM osoba o
   WHERE o.tim_id = t.id AND o.predak_id IS NOT NULL
   GROUP BY o.predak_id
   ORDER BY count(*) DESC, o.predak_id
   LIMIT 1
) WHERE predak_id IS NULL;
