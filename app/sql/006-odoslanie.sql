-- Čo presne odišlo dodávateľovi.
--
-- Uložiť len počty by nestačilo. Keď sa raz kuchyňa ozve, že dostala niečo
-- iné, musí sa dať ukázať presné znenie správy aj adresa, na ktorú šla —
-- nie to, čo by sa z dnešných údajov vyrobilo znova. Adresa sa navyše mení:
-- počas ladenia chodí objednávka na adresu správcu a až potom do jedálne.

ALTER TABLE odoslanie ADD COLUMN IF NOT EXISTS komu     text;
ALTER TABLE odoslanie ADD COLUMN IF NOT EXISTS kopia    text;
ALTER TABLE odoslanie ADD COLUMN IF NOT EXISTS predmet  text;
ALTER TABLE odoslanie ADD COLUMN IF NOT EXISTS telo     text;
ALTER TABLE odoslanie ADD COLUMN IF NOT EXISTS zadal_id int REFERENCES osoba(id);

-- Potvrdzuje sa cez odkaz bez prihlásenia, tak sa podľa tokenu hľadá.
CREATE INDEX IF NOT EXISTS odoslanie_token ON odoslanie(token);
