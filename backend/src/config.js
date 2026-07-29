// Konfigurácia uzávierky objednávok a pripomienok – všetko cez env premenné,
// s rozumnými predvolenými hodnotami (štvrtok 12:00, pripomienka deň vopred).

function parseTime(str, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str || '').trim());
  if (!m) return fallback;
  const hh = Math.min(23, Number(m[1]));
  const mm = Math.min(59, Number(m[2]));
  return { hh, mm };
}

const DEADLINE_DAY = Math.min(7, Math.max(1, Number(process.env.DEADLINE_DAY) || 4)); // 1=Po … 7=Ne (4=Štvrtok)
const DEADLINE_TIME = parseTime(process.env.DEADLINE_TIME, { hh: 12, mm: 0 });
const REMINDER_TIME = parseTime(process.env.REMINDER_TIME, { hh: 12, mm: 0 });

export const config = {
  tz: process.env.TZ_NAME || 'Europe/Bratislava',
  deadlineDay: DEADLINE_DAY,
  deadlineTime: DEADLINE_TIME,
  // Pripomienka sa posiela deň pred deadline-om (offset v dňoch, default 1).
  reminderOffsetDays: Math.max(1, Number(process.env.REMINDER_OFFSET_DAYS) || 1),
  reminderTime: REMINDER_TIME,
  enforceDeadline: String(process.env.ENFORCE_DEADLINE ?? 'true').toLowerCase() !== 'false',
  // Verejná adresa appky – použije sa ako odkaz v pripomienke (voliteľné).
  publicUrl: (process.env.PUBLIC_URL || '').trim().replace(/\/$/, ''),
  // Predvolený deň doručenia: 1=Po … 7=Ne (5 = piatok). Nákupca ho môže zmeniť.
  deliveryDay: Math.min(7, Math.max(1, Number(process.env.DELIVERY_DAY) || 5)),
  // PIN pre admin záložku (Spracovanie). Prázdne = bez ochrany (interné použitie).
  adminPin: (process.env.ADMIN_PIN || '').trim(),
  // Tajný token pre kuriérsky odkaz. Prázdne = kuriérsky odkaz vypnutý.
  courierToken: (process.env.COURIER_TOKEN || '').trim(),
};

export const DAY_NAMES = ['', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota', 'nedeľa'];
export const DAY_NAMES_ACC = ['', 'pondelka', 'utorka', 'stredy', 'štvrtka', 'piatka', 'soboty', 'nedele'];
