// WhatsApp notifikácie cez Twilio.
// Ak nie sú nastavené Twilio premenné, appka NEPADNE – správu iba vypíše do
// konzoly (dev režim). Po doplnení kľúčov sa začne posielať reálne.
//
// Potrebné env premenné pre reálne posielanie:
//   TWILIO_ACCOUNT_SID   – SID účtu z Twilio konzoly
//   TWILIO_AUTH_TOKEN    – auth token
//   TWILIO_WHATSAPP_FROM – odosielacie číslo, napr. "whatsapp:+14155238886"
//   ADMIN_WHATSAPP_TO    – (voliteľné) číslo nákupcu, napr. "whatsapp:+421900000000"

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
  ADMIN_WHATSAPP_TO,
} = process.env;

export const whatsappEnabled = Boolean(
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM
);

function normalizeTo(phone) {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  if (trimmed.startsWith('whatsapp:')) return trimmed;
  return `whatsapp:${trimmed}`;
}

async function sendViaTwilio(to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const form = new URLSearchParams({ To: to, From: TWILIO_WHATSAPP_FROM, Body: body });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio ${res.status}: ${text}`);
  }
  return res.json();
}

// Odošle jednu WhatsApp správu. Vracia { ok, dev } – nikdy nehádže hore,
// aby zlyhanie notifikácie nezhodilo vytvorenie objednávky.
export async function sendWhatsApp(to, body) {
  const target = normalizeTo(to);
  if (!target) return { ok: false, reason: 'no-recipient' };

  if (!whatsappEnabled) {
    console.log(`\n[WhatsApp DEV] → ${target}\n${body}\n`);
    return { ok: true, dev: true };
  }

  try {
    await sendViaTwilio(target, body);
    return { ok: true, dev: false };
  } catch (err) {
    console.error('[WhatsApp] chyba pri odoslaní:', err.message);
    return { ok: false, reason: err.message };
  }
}

// Text potvrdenia objednávky pre zamestnanca.
export function buildConfirmationMessage(order, products) {
  const lines = order.items.map((it) => {
    const p = products.find((x) => x.id === it.productId);
    return `• ${p ? p.name : it.productId} — ${it.qty}× (${p?.unit || 'ks'})`;
  });
  return [
    `✅ Objednávka mlieka prijatá`,
    ``,
    `Meno: ${order.employeeName}`,
    `Týždeň: ${order.weekOf}`,
    ``,
    lines.join('\n'),
    order.note ? `\nPoznámka: ${order.note}` : '',
    ``,
    `Ďakujeme! 🥛`,
  ]
    .filter((l) => l !== null && l !== undefined)
    .join('\n');
}

// Notifikuje nákupcu o novej objednávke (ak je ADMIN_WHATSAPP_TO nastavené).
export async function notifyAdmin(order, products) {
  if (!ADMIN_WHATSAPP_TO) return { ok: false, reason: 'no-admin' };
  const count = order.items.reduce((s, it) => s + it.qty, 0);
  const body = `🛒 Nová objednávka mlieka od ${order.employeeName} (${count} ks, týždeň ${order.weekOf}).`;
  return sendWhatsApp(ADMIN_WHATSAPP_TO, body);
}
