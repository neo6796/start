import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { load, save, id } from './store.js';
import { seedIfNeeded } from './seed.js';
import { isoWeek } from './week.js';
import { config } from './config.js';
import { deadlineStatus, nextDeliveryDateISO, deliveryLabel } from './deadline.js';
import { startScheduler } from './scheduler.js';
import {
  sendWhatsApp,
  notifyAdmin,
  buildConfirmationMessage,
  buildProcessedMessage,
  buildDeliveredMessage,
  whatsappEnabled,
} from './notify.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

// Načítaj dáta a naseeduj katalóg pri prvom spustení.
let data = load();
data = seedIfNeeded(data, save);

// ---- Zdravie / konfigurácia ----
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, whatsapp: whatsappEnabled ? 'live' : 'dev' });
});

// Stav uzávierky pre frontend (otvorené/zatvorené, kedy je deadline).
app.get('/api/config', (_req, res) => {
  res.json({ deadline: deadlineStatus(), whatsapp: whatsappEnabled ? 'live' : 'dev' });
});

// ---- Produkty (katalóg) ----
app.get('/api/products', (_req, res) => {
  res.json(data.products.filter((p) => p.active !== false));
});

app.post('/api/products', (req, res) => {
  const { name, description = '', unit = '1 l', category = 'Ostatné' } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Chýba názov produktu.' });
  }
  const product = {
    id: id('p_'),
    name: name.trim(),
    description: String(description).trim(),
    unit: String(unit).trim() || '1 l',
    category: String(category).trim() || 'Ostatné',
    active: true,
  };
  data.products.push(product);
  save(data);
  res.status(201).json(product);
});

app.delete('/api/products/:id', (req, res) => {
  const p = data.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Produkt nenájdený.' });
  p.active = false; // soft delete – zachováme históriu objednávok
  save(data);
  res.json({ ok: true });
});

// ---- Objednávky ----
function validateOrder(body, products) {
  const errors = [];
  const employeeName = String(body?.employeeName || '').trim();
  const employeePhone = String(body?.employeePhone || '').trim();
  const note = String(body?.note || '').trim();
  const rawItems = Array.isArray(body?.items) ? body.items : [];

  if (!employeeName) errors.push('Chýba meno.');

  const items = [];
  for (const it of rawItems) {
    const qty = Number(it?.qty);
    const product = products.find((p) => p.id === it?.productId && p.active !== false);
    if (!product) continue;
    if (!Number.isFinite(qty) || qty <= 0) continue;
    items.push({ productId: product.id, qty: Math.min(Math.floor(qty), 999) });
  }
  if (items.length === 0) errors.push('Objednávka neobsahuje žiadne platné položky.');

  return { errors, order: { employeeName, employeePhone, note, items } };
}

app.get('/api/orders', (req, res) => {
  const week = req.query.week;
  let orders = [...data.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (week) orders = orders.filter((o) => o.weekOf === week);
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  // Uzávierka: po deadline-e sa na tento týždeň už objednávať nedá.
  const dl = deadlineStatus();
  if (config.enforceDeadline && !dl.open) {
    return res.status(409).json({
      error: `Objednávky na tento týždeň sú už uzavreté (uzávierka bola ${dl.label}). Skús to znova budúci týždeň.`,
      deadline: dl,
    });
  }

  const { errors, order } = validateOrder(req.body, data.products);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const now = new Date();
  const record = {
    id: id('o_'),
    ...order,
    status: 'received', // po uzávierke ju nákupca potvrdí (confirmed/partially_confirmed)
    weekOf: isoWeek(now),
    createdAt: now.toISOString(),
  };
  data.orders.push(record);
  save(data);

  // Notifikácie – nezhodia request ak zlyhajú.
  const confirmation = buildConfirmationMessage(record, data.products);
  const employeeResult = record.employeePhone
    ? await sendWhatsApp(record.employeePhone, confirmation)
    : { ok: false, reason: 'no-phone' };
  const adminResult = await notifyAdmin(record, data.products);

  res.status(201).json({
    order: record,
    notifications: { employee: employeeResult, admin: adminResult },
  });
});

// ---- Súhrn pre nákupcu: koľko čoho treba nakúpiť za daný týždeň ----
app.get('/api/summary', (req, res) => {
  const week = req.query.week || isoWeek(new Date());
  const weekOrders = data.orders.filter((o) => o.weekOf === week);

  const totals = new Map();
  for (const o of weekOrders) {
    for (const it of o.items) {
      totals.set(it.productId, (totals.get(it.productId) || 0) + it.qty);
    }
  }

  const items = [...totals.entries()].map(([productId, qty]) => {
    const p = data.products.find((x) => x.id === productId);
    return {
      productId,
      name: p ? p.name : '(zmazaný produkt)',
      unit: p?.unit || 'ks',
      qty,
    };
  });
  items.sort((a, b) => b.qty - a.qty);

  res.json({
    week,
    ordersCount: weekOrders.length,
    totalUnits: items.reduce((s, i) => s + i.qty, 0),
    items,
  });
});

app.get('/api/current-week', (_req, res) => {
  res.json({ week: isoWeek(new Date()) });
});

// ---- Spracovanie po uzávierke (nákupca) a deň D (kuriér) ----

function requireAdmin(req, res) {
  if (!config.adminPin) return true;
  if (String(req.headers['x-admin-pin'] || '') === config.adminPin) return true;
  res.status(401).json({ error: 'Nesprávny PIN.' });
  return false;
}

// Naskladnenie: potvrdené objednávky týždňa → delivered + WhatsApp „tovar je v boxe".
// Idempotentné – už doručené objednávky sa preskočia.
async function markDelivered(week) {
  const targets = data.orders.filter(
    (o) => o.weekOf === week && ['confirmed', 'partially_confirmed'].includes(o.status)
  );
  const now = new Date().toISOString();
  let notified = 0;
  for (const o of targets) {
    o.status = 'delivered';
    o.deliveredAt = now;
    if (o.employeePhone) {
      const r = await sendWhatsApp(o.employeePhone, buildDeliveredMessage(o, data.products));
      if (r.ok) notified += 1;
    }
  }
  save(data);
  return { delivered: targets.length, notified };
}

// Info pre admin záložku (bez PIN-u – neobsahuje citlivé dáta).
app.get('/api/admin/info', (_req, res) => {
  res.json({
    pinRequired: Boolean(config.adminPin),
    courierLinkEnabled: Boolean(config.courierToken),
    suggestedDeliveryDate: nextDeliveryDateISO(),
    week: isoWeek(new Date()),
  });
});

// Potvrdenie objednávok / ich častí + deň doručenia. Spracuje objednávky
// v stave "received" za aktuálny týždeň a pošle WhatsApp potvrdenia.
app.post('/api/admin/process', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  const deliveryDate = String(req.body?.deliveryDate || '').trim() || nextDeliveryDateISO();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
    return res.status(400).json({ error: 'Neplatný dátum doručenia (očakávam YYYY-MM-DD).' });
  }
  const unavailable = new Set(
    Array.isArray(req.body?.unavailableProductIds) ? req.body.unavailableProductIds : []
  );

  const week = isoWeek(new Date());
  const targets = data.orders.filter((o) => o.weekOf === week && o.status === 'received');
  if (targets.length === 0) {
    return res.json({ processed: 0, week, message: 'Žiadne nespracované objednávky.' });
  }

  const label = deliveryLabel(deliveryDate);
  let notified = 0;
  const counts = { confirmed: 0, partially_confirmed: 0, unavailable: 0 };
  for (const o of targets) {
    for (const it of o.items) it.unavailable = unavailable.has(it.productId);
    const confirmedCount = o.items.filter((it) => !it.unavailable).length;
    o.status =
      confirmedCount === 0 ? 'unavailable'
      : confirmedCount === o.items.length ? 'confirmed'
      : 'partially_confirmed';
    o.deliveryDate = confirmedCount > 0 ? deliveryDate : null;
    counts[o.status] += 1;
    if (o.employeePhone) {
      const r = await sendWhatsApp(o.employeePhone, buildProcessedMessage(o, data.products, label));
      if (r.ok) notified += 1;
    }
  }
  data.meta.deliveryByWeek = { ...(data.meta.deliveryByWeek || {}), [week]: deliveryDate };
  save(data);

  res.json({ processed: targets.length, notified, counts, week, deliveryDate, deliveryLabel: label });
});

// Deň D – tlačidlo v admin záložke.
app.post('/api/admin/delivered', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const result = await markDelivered(isoWeek(new Date()));
  res.json({ ...result, week: isoWeek(new Date()) });
});

// Deň D – bezpečný odkaz pre kuriéra (bez prihlásenia, chránený tokenom).
app.post('/api/courier/delivered', async (req, res) => {
  if (!config.courierToken) {
    return res.status(404).json({ error: 'Kuriérsky odkaz nie je nakonfigurovaný (COURIER_TOKEN).' });
  }
  if (String(req.body?.token || '') !== config.courierToken) {
    return res.status(401).json({ error: 'Neplatný kuriérsky token.' });
  }
  const result = await markDelivered(isoWeek(new Date()));
  res.json({ ...result, week: isoWeek(new Date()) });
});

// ---- Servírovanie statického frontendu (po `npm run build`) ----
const FRONTEND_DIST = join(__dirname, '..', '..', 'frontend', 'dist');
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (_req, res) => res.sendFile(join(FRONTEND_DIST, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const dl = deadlineStatus();
  console.log(`Mlieko API beží na http://localhost:${PORT}`);
  console.log(`WhatsApp režim: ${whatsappEnabled ? 'LIVE (Twilio)' : 'DEV (výpis do konzoly)'}`);
  console.log(`Uzávierka objednávok: ${dl.deadlineDayName} ${dl.deadlineTime} (TZ ${config.tz}), enforcovanie: ${config.enforceDeadline ? 'áno' : 'nie'}`);

  // Spusti plánovač pripomienok (deň pred uzávierkou).
  startScheduler(() => data, save);
});
