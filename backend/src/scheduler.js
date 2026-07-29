// Plánovač pripomienok. Každú minútu skontroluje, či je čas poslať pripomienku
// (deň pred uzávierkou). Pošle WhatsApp tým, ktorí v minulosti už objednávali,
// ale tento týždeň si ešte neobjednali. Za týždeň sa pošle najviac raz.
import { config } from './config.js';
import { isReminderWindow, deadlineStatus } from './deadline.js';
import { sendWhatsApp } from './notify.js';

function normPhone(p) {
  return String(p || '').trim().replace(/^whatsapp:/i, '').replace(/\s+/g, '');
}

// Kontakty = poslední ľudia podľa telefónu, ktorí niekedy objednávali.
function buildContacts(orders) {
  const contacts = new Map(); // phone -> name
  const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const o of sorted) {
    const phone = normPhone(o.employeePhone);
    if (!phone) continue;
    contacts.set(phone, o.employeeName || ''); // neskorší záznam prepíše meno – berieme najnovšie
  }
  return contacts;
}

function reminderMessage() {
  const d = deadlineStatus();
  const link = config.publicUrl ? `\n\nObjednaj tu: ${config.publicUrl}` : '';
  return `🥛 Pripomienka: objednávky mlieka na tento týždeň sa uzatvárajú v ${d.label}. Ak chceš mlieko, objednaj si, prosím, ešte dnes.${link}`;
}

export async function runReminderTick(data, save, now = new Date()) {
  const win = isReminderWindow(now);
  if (!win.active) return { sent: 0, reason: 'not-window' };

  data.meta = data.meta || {};
  data.meta.remindedWeeks = data.meta.remindedWeeks || {};
  if (data.meta.remindedWeeks[win.week]) return { sent: 0, reason: 'already-sent' };

  // Označ hneď (a ulož), aby sa pri reštarte v okne pripomienka neposlala znova.
  data.meta.remindedWeeks[win.week] = now.toISOString();
  save(data);

  const orderedThisWeek = new Set(
    data.orders.filter((o) => o.weekOf === win.week).map((o) => normPhone(o.employeePhone)).filter(Boolean)
  );
  const contacts = buildContacts(data.orders);
  const targets = [...contacts.entries()].filter(([phone]) => !orderedThisWeek.has(phone));

  const body = reminderMessage();
  let sent = 0;
  for (const [phone] of targets) {
    const res = await sendWhatsApp(phone, body);
    if (res.ok) sent += 1;
  }
  console.log(`[Pripomienka] týždeň ${win.week}: oslovených ${targets.length}, odoslaných ${sent}.`);
  return { sent, targets: targets.length, week: win.week };
}

// Spustí periodickú kontrolu každých 60 sekúnd.
export function startScheduler(getData, save) {
  const tick = () => {
    try {
      runReminderTick(getData(), save);
    } catch (err) {
      console.error('[Pripomienka] chyba v plánovači:', err.message);
    }
  };
  tick(); // skús hneď pri štarte (pokrýva reštart počas okna)
  const timer = setInterval(tick, 60 * 1000);
  timer.unref?.(); // nech plánovač nedrží proces zbytočne nažive
  return timer;
}
