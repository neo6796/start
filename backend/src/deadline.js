// Výpočty okolo uzávierky objednávok, korektne v nastavenej časovej zóne.
import { config, DAY_NAMES, DAY_NAMES_ACC } from './config.js';
import { isoWeek } from './week.js';

// Vráti údaje o "teraz" v cieľovej TZ: deň v týždni (1=Po..7=Ne), hodina, minúta
// a zložky dátumu. Vďaka Intl to funguje správne aj cez letný/zimný čas.
export function nowInTz(tz = config.tz, now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    weekday: weekdayMap[parts.weekday],
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === '24' ? '0' : parts.hour),
    minute: Number(parts.minute),
    week: isoWeek(now),
  };
}

// "Minúta v týždni" – jednoduché lineárne porovnanie bez dátumovej matematiky.
function minuteOfWeek(day, hh, mm) {
  return (day - 1) * 1440 + hh * 60 + mm;
}

// Dátum konkrétneho dňa v aktuálnom týždni (na zobrazenie deadline-u).
function dateOfWeekday(nowParts, targetDay) {
  // Poludnie v UTC daného dňa – bezpečné voči DST, slúži len na formátovanie dátumu.
  const base = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + (targetDay - nowParts.weekday));
  return base;
}

export function deadlineStatus(now = new Date()) {
  const t = nowInTz(config.tz, now);
  const nowMow = minuteOfWeek(t.weekday, t.hour, t.minute);
  const deadlineMow = minuteOfWeek(config.deadlineDay, config.deadlineTime.hh, config.deadlineTime.mm);
  const open = nowMow < deadlineMow;

  const deadlineDate = dateOfWeekday(t, config.deadlineDay);
  const dd = String(deadlineDate.getUTCDate()).padStart(2, '0');
  const mo = String(deadlineDate.getUTCMonth() + 1).padStart(2, '0');
  const timeStr = `${String(config.deadlineTime.hh).padStart(2, '0')}:${String(config.deadlineTime.mm).padStart(2, '0')}`;

  return {
    week: t.week,
    open,
    enforced: config.enforceDeadline,
    deadlineDay: config.deadlineDay,
    deadlineDayName: DAY_NAMES[config.deadlineDay],
    deadlineTime: timeStr,
    // Ľudský popis, napr. "štvrtok 12:00 (17.09.)"
    label: `${DAY_NAMES[config.deadlineDay]} ${timeStr} (${dd}.${mo}.)`,
    deadlineDateISO: `${deadlineDate.getUTCFullYear()}-${mo}-${dd}`,
  };
}

// Vráti true, ak práve nastal (alebo prešiel, ale ešte pred deadline-om) čas
// pripomienky pre aktuálny týždeň – používa plánovač.
export function isReminderWindow(now = new Date()) {
  const t = nowInTz(config.tz, now);
  const nowMow = minuteOfWeek(t.weekday, t.hour, t.minute);

  const reminderDay = config.deadlineDay - config.reminderOffsetDays;
  if (reminderDay < 1) return { active: false, week: t.week }; // pripomienka by padla pred pondelok – preskoč
  const reminderMow = minuteOfWeek(reminderDay, config.reminderTime.hh, config.reminderTime.mm);
  const deadlineMow = minuteOfWeek(config.deadlineDay, config.deadlineTime.hh, config.deadlineTime.mm);

  return {
    active: nowMow >= reminderMow && nowMow < deadlineMow,
    week: t.week,
    reminderDayName: DAY_NAMES[reminderDay],
  };
}

export { DAY_NAMES_ACC };
