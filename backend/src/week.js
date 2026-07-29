// Výpočet ISO týždňa (napr. "2026-W31") – používame na zoskupovanie objednávok
// a na deadline typu "objednávky do štvrtka".
export function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // pondelok=1 ... nedeľa=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // posun na štvrtok toho týždňa
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
