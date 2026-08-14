/* Prihlásenie a relácie.

   Heslá: scrypt zo štandardnej knižnice Node. Koncept spomína argon2id;
   ten by znamenal balíček, ktorý sa pri inštalácii kompiluje. Celé nasadenie
   stojí na tom, že `git pull` nič nezostavuje — jedna natívna závislosť by to
   zrušila. scrypt je pamäťovo náročná funkcia z rovnakej rodiny a na sto
   používateľov je rozdiel akademický. Formát hashu si nesie parametre,
   takže sa dá kedykoľvek prejsť inam bez zásahu do databázy. */

import { scrypt, randomBytes, randomInt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { dopyt, jeden, zapis } from "./db.js";

const scryptA = promisify(scrypt);

const N = 16384, R = 8, P = 1, DLZKA = 32;
const PLATNOST_DNI = 30;

/* Najkratšie heslo podľa roly. Správca sa dostane ku všetkému a k mzdovému
   podkladu, predák objednáva za tridsať ľudí, stravník za seba. */
export const najmenejZnakov = o => o.je_admin ? 10 : o.je_predak ? 8 : 4;

/* Vygenerované heslo. Znaky, ktoré sa na papieri pletú (0 a O, 1 a l a I),
   v ňom nie sú — heslo sa bude prepisovať z lístka do telefónu a preklep
   v ňom vyzerá ako pokazená appka. Delí sa pomlčkou po štyroch, aby sa dalo
   nadiktovať aj cez telefón. */
const ZNAKY = "abcdefghijkmnpqrstuvwxyz23456789";
export function nahodneHeslo(najmenej = 8) {
  const blokov = Math.max(2, Math.ceil(najmenej / 4));
  const bloky = [];
  for (let b = 0; b < blokov; b++) {
    let blok = "";
    for (let i = 0; i < 4; i++) blok += ZNAKY[randomInt(ZNAKY.length)];
    bloky.push(blok);
  }
  return bloky.join("-");
}

export async function hashHesla(heslo) {
  const sol = randomBytes(16);
  const kluc = await scryptA(heslo.normalize("NFKC"), sol, DLZKA, { N, r: R, p: P });
  return ["scrypt", N, R, P, sol.toString("base64"), kluc.toString("base64")].join("$");
}

export async function sediHeslo(heslo, hash) {
  if (!hash) return false;
  const [druh, n, r, p, sol, kluc] = hash.split("$");
  if (druh !== "scrypt") return false;
  const cakane = Buffer.from(kluc, "base64");
  const skusene = await scryptA(heslo.normalize("NFKC"), Buffer.from(sol, "base64"),
                                cakane.length, { N: +n, r: +r, p: +p });
  return timingSafeEqual(cakane, skusene);
}

/* V databáze je odtlačok, nie samotný token. Kto sa dostane k výpisu tabuľky,
   nezíska tým prihlásenie. */
export const odtlacok = t => createHash("sha256").update(t).digest("hex");

export function csrf(token) {
  return createHash("sha256").update(token + "·csrf").digest("base64url").slice(0, 32);
}

export async function zaloz(osobaId) {
  const token = randomBytes(32).toString("base64url");
  await dopyt(
    `INSERT INTO relacia (token, osoba_id, plati_do) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [odtlacok(token), osobaId, String(PLATNOST_DNI)]
  );
  return token;
}

export async function podlaTokenu(token) {
  if (!token) return null;
  /* Predákom je ten, kto vedie aspoň jeden tím — nedrží sa to nikde zvlášť,
     takže sa to nemá ako rozísť so skutočnosťou (migrácia 007). */
  const r = await jeden(
    `SELECT o.*, EXISTS (SELECT 1 FROM tim_predak tp JOIN tim t ON t.id = tp.tim_id
                          WHERE tp.osoba_id = o.id AND t.aktivny) AS je_predak
       FROM relacia r JOIN osoba o ON o.id = r.osoba_id
      WHERE r.token = $1 AND r.plati_do > now() AND o.aktivny`,
    [odtlacok(token)]
  );
  return r;
}

/* Odhlási človeka zo všetkých zariadení okrem toho, z ktorého sa to robí.
   Bez tej výnimky by si správca zmenou vlastného hesla zavrel dvere. */
export async function zrusOstatne(osobaId, token) {
  await dopyt("DELETE FROM relacia WHERE osoba_id = $1 AND token <> $2",
              [osobaId, odtlacok(token ?? "")]);
}

export async function zrus(token) {
  if (token) await dopyt("DELETE FROM relacia WHERE token = $1", [odtlacok(token)]);
}

export async function upratRelacie() {
  const v = await dopyt("DELETE FROM relacia WHERE plati_do < now()");
  return v.rowCount;
}

/* Brzda proti hádaniu hesla.

   Mailový server nám v auguste zablokoval IP po dvoch nesprávnych heslách —
   nech sa naša appka správa aspoň tak obozretne. Držané v pamäti zámerne:
   po reštarte sa počítadlo vynuluje, čo útočníkovi nepomôže (reštart nevyvolá)
   a človeku, ktorý sa naozaj zamkol, pomôže. */
const pokusy = new Map();
const PRAH = 5, OKNO_MS = 15 * 60 * 1000;

export function jeZablokovany(kluc) {
  const z = pokusy.get(kluc);
  if (!z) return 0;
  if (Date.now() - z.kedy > OKNO_MS) { pokusy.delete(kluc); return 0; }
  if (z.pocet < PRAH) return 0;
  return Math.ceil((OKNO_MS - (Date.now() - z.kedy)) / 60000);
}

export function zlyhalo(kluc) {
  const z = pokusy.get(kluc);
  if (!z || Date.now() - z.kedy > OKNO_MS) pokusy.set(kluc, { pocet: 1, kedy: Date.now() });
  else { z.pocet++; z.kedy = Date.now(); }
}

export function podarilo(kluc) {
  pokusy.delete(kluc);
}

export async function prihlas(kod, heslo, ip) {
  const kluc = `${ip}|${kod}`;
  const minut = jeZablokovany(kluc);
  if (minut) return { chyba: `Priveľa pokusov. Skúste o ${minut} min.` };

  const osoba = await jeden(
    `SELECT o.*, EXISTS (SELECT 1 FROM tim_predak tp JOIN tim t ON t.id = tp.tim_id
                          WHERE tp.osoba_id = o.id AND t.aktivny) AS je_predak
       FROM osoba o WHERE o.kod_dochadzka = $1 AND o.aktivny`, [kod.trim()]
  );
  /* Overujeme aj pri neznámom kóde, aby sa z rýchlosti odpovede nedalo
     vyčítať, ktoré osobné čísla existujú. */
  const ok = await sediHeslo(heslo, osoba?.heslo_hash ?? "scrypt$16384$8$1$AAAA$AAAA");

  if (!osoba || !ok) {
    zlyhalo(kluc);
    await zapis(osoba?.id ?? null, "prihlasenie.zlyhalo", { kod, ip });
    return { chyba: "Nesprávne osobné číslo alebo heslo." };
  }
  podarilo(kluc);
  const token = await zaloz(osoba.id);
  await zapis(osoba.id, "prihlasenie.ok", { ip });
  return { osoba, token };
}
