-- Komu jedáleň fakturuje porcie živnostníkov (koncept 6.3, posledná poznámka).
--
-- Bez tohto údaja sa nedá povedať, aká suma má prísť na firemnú faktúru:
-- buď je v nej všetko a firma porcie živnostníkov preúčtuje, alebo jedáleň
-- fakturuje živnostníkovi priamo a vo firemnej faktúre jeho porcie nie sú.
-- Rozdiel je celý mesiac porcií — kontrola faktúry by inak hlásila nesúlad
-- každý mesiac a rýchlo by sa prestala čítať.
--
-- Prázdne = nevieme. To je dnes pravdivý stav (otázka je v hárku pre
-- dodávateľov) a appka to má priznať, nie si vybrať za nich.

ALTER TABLE poskytovatel ADD COLUMN IF NOT EXISTS fakturuje_zivnostnikom text;

ALTER TABLE poskytovatel DROP CONSTRAINT IF EXISTS poskytovatel_fakturuje_chk;
ALTER TABLE poskytovatel ADD CONSTRAINT poskytovatel_fakturuje_chk
  CHECK (fakturuje_zivnostnikom IS NULL
         OR fakturuje_zivnostnikom IN ('firme', 'priamo'));
