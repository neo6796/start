-- Firma dostáva skratku — krátky stály kód, ktorý sa nemení pri premenovaní.
--
-- Prečo nie `id`: to je poradové číslo, ktoré si prideľuje databáza pri
-- zakladaní. V dvoch inštanciách tej istej appky znamená tá istá dvojka inú
-- firmu — overené, na serveri a v skúšobnej databáze to tak naozaj bolo.
-- Menoslov s `--- 3 ---` by ľudí ticho zaradil do zlej firmy, a firma delí
-- peniaze. Názov zlyhá nahlas („firma nie je známa"), číslo ticho.
--
-- Skratka to rieši inak: je to údaj, ktorý určuje človek, nie databáza.
-- Prežije premenovanie obchodného názvu aj nasadenie nanovo. Prevádzky ju
-- majú od začiatku (`OFF`, `AGR`, `FAR`), firma nie — dorovnáva sa to.

ALTER TABLE firma ADD COLUMN IF NOT EXISTS skratka text;

-- Jednoznačná, ale nepovinná: v databáze môžu byť firmy, ktoré sme
-- nezakladali my, a nútiť pri migrácii hodnotu by ju zhodilo. Čo ostane
-- prázdne, doplní sa v Číselníkoch.
CREATE UNIQUE INDEX IF NOT EXISTS firma_skratka_uniq
  ON firma (upper(skratka)) WHERE skratka IS NOT NULL;

-- Štyri firmy, ktoré appka zakladá sama. Páruje sa na začiatok názvu, nie na
-- celý: v čase tejto migrácie môžu byť ešte pod starými názvami („Cronus")
-- alebo už pod obchodnými („Cronus s.r.o.") a musí sadnúť oboje.
UPDATE firma SET skratka = 'PDV' WHERE skratka IS NULL AND nazov ILIKE 'Poľnohospodárske%';
UPDATE firma SET skratka = 'CRO' WHERE skratka IS NULL AND nazov ILIKE 'Cronus%';
UPDATE firma SET skratka = 'AD1' WHERE skratka IS NULL AND nazov ILIKE 'Adiumentum%';
UPDATE firma SET skratka = 'HBE' WHERE skratka IS NULL AND nazov ILIKE 'HBE%';
