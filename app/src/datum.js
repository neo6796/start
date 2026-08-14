/* Dátumy. Objednáva sa po týždňoch pondelok–piatok, takže sa všetko točí okolo
   pondelka. Dátumy sa držia ako reťazec `RRRR-MM-DD` — v databáze je to `date`
   bez času a časové pásmo do toho nemá čo hovoriť. Keby sa počítalo cez Date
   s časom, obed z piatka by sa v lete mohol prepočítať na štvrtok. */

export const DNI = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"];
export const DNI_SKRATKA = ["Po", "Ut", "St", "Št", "Pi"];

const MESIACE = ["januára", "februára", "marca", "apríla", "mája", "júna",
                 "júla", "augusta", "septembra", "októbra", "novembra", "decembra"];

/* Dnešok podľa miestneho času, nie podľa UTC. `toISOString` vracia UTC dátum,
   takže v lete by appka od polnoci do druhej v noci tvrdila, že je ešte včera —
   a uzávierka aj denný zámok by sa o deň pomýlili. Časové pásmo nastavuje
   docker-compose (TZ), aby sa server a appka zhodli. */
export function dnes() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${
    String(d.getDate()).padStart(2, "0")}`;
}

/* Miestny čas ako „HH:MM" — porovnáva sa s časom dennej uzávierky jedálne,
   ktorý je v databáze uložený rovnako. */
export function teraz() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/* Pondelok týždňa, na ktorý sa v ten deň objednáva.
   Cez pracovný týždeň je to pondelok toho istého týždňa. V sobotu a v nedeľu
   je bežný týždeň dávno uzavretý a jediné, čo sa dá ešte ovplyvniť, je ten
   nasledujúci — preto víkend ukazuje dopredu, nie dozadu. */
export function pondelok(iso) {
  const d = new Date(iso + "T12:00:00Z");
  const den = d.getUTCDay();                 // 0 = nedeľa, 6 = sobota
  const kolko = den === 0 ? 1 : den === 6 ? 2 : 1 - den;
  d.setUTCDate(d.getUTCDate() + kolko);
  return d.toISOString().slice(0, 10);
}

export function posun(iso, dni) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
}

export const dniTyzdna = po => [0, 1, 2, 3, 4].map(i => posun(po, i));

/* „8. 8." — v hlavičke matice, kde je nad tým názov dňa. */
export function denMesiac(iso) {
  const [, m, d] = iso.split("-");
  return `${Number(d)}. ${Number(m)}.`;
}

/* „8. augusta 2026" — do viet. */
export function dlhy(iso) {
  const [r, m, d] = iso.split("-");
  return `${Number(d)}. ${MESIACE[Number(m) - 1]} ${r}`;
}

/* „4. – 8. 8. 2026" — rozsah týždňa. */
export function tyzdenPopis(po) {
  const pi = posun(po, 4);
  const [r, , ] = pi.split("-");
  const [, mp, dp] = po.split("-");
  const [, mk, dk] = pi.split("-");
  return mp === mk
    ? `${Number(dp)}. – ${Number(dk)}. ${Number(mk)}. ${r}`
    : `${Number(dp)}. ${Number(mp)}. – ${Number(dk)}. ${Number(mk)}. ${r}`;
}

/* „august 2026" — do nadpisov a viet o mesiaci. */
export function mesiacPopis(prvy) {
  const [r, m] = prvy.split("-");
  /* Názvy mesiacov sú v druhom páde („8. augusta"); v nadpise treba prvý. */
  const prvyPad = { "januára": "január", "februára": "február", "marca": "marec",
    "apríla": "apríl", "mája": "máj", "júna": "jún", "júla": "júl",
    "augusta": "august", "septembra": "september", "októbra": "október",
    "novembra": "november", "decembra": "december" }[MESIACE[Number(m) - 1]];
  return `${prvyPad} ${r}`;
}

/* Prvý deň mesiaca, v ktorom dátum leží — `mesiac_stav` sa kľúčuje ním. */
export const prvyVMesiaci = iso => iso.slice(0, 7) + "-01";

export function posunMesiac(prvy, kolko) {
  const [r, m] = prvy.split("-").map(Number);
  const n = (r * 12 + (m - 1)) + kolko;
  return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}-01`;
}

/* Pracovné dni mesiaca (pondelok–piatok). Sviatky appka zatiaľ nevedie —
   deň, keď sa nevarilo, ostane jednoducho prázdny. */
export function pracovneDni(prvy) {
  const koniec = posunMesiac(prvy, 1);
  const von = [];
  for (let d = prvy; d < koniec; d = posun(d, 1)) {
    const den = new Date(d + "T12:00:00Z").getUTCDay();
    if (den >= 1 && den <= 5) von.push(d);
  }
  return von;
}

/* Označenie jedla podľa toho, ako ho značí jedáleň. Nemôže byť napevno:
   GASTROGAL čísluje 1–5, GASTRO ABM tie isté jedlá značí A–E. */
const RIMSKE = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function oznacenie(znacenie, i) {
  if (znacenie === "arabic") return String(i + 1);
  if (znacenie === "roman") return RIMSKE[i] ?? String(i + 1);
  if (znacenie === "lower") return String.fromCharCode(97 + i);
  return String.fromCharCode(65 + i);          // upper
}
