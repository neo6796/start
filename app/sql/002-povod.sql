-- Pravidlo o pôvode údaja (koncept 1.3b):
-- import vyplní prázdne, prepíše predchádzajúci import, ručne zadané nikdy.
--
-- Import nesie len identitu — osobné číslo, priezvisko, meno. Pravidlo sa
-- teda týka práve mena; väzby (firma, tím, prevádzka, jedáleň) sú vždy ručné,
-- import sa ich nedotýka a stĺpec na ne netreba.

ALTER TABLE osoba ADD COLUMN povod_mena text NOT NULL DEFAULT 'rucne'
  CHECK (povod_mena IN ('import', 'rucne'));

-- Kedy naposledy prišiel človek importom — na kontrolu, koho import nevidel.
ALTER TABLE osoba ADD COLUMN import_kedy timestamptz;
