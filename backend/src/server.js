import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { load, save, id } from './store.js';
import { seedIfNeeded } from './seed.js';
import { isoWeek } from './week.js';
import {
  sendWhatsApp,
  notifyAdmin,
  buildConfirmationMessage,
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
  const { errors, order } = validateOrder(req.body, data.products);
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });

  const now = new Date();
  const record = {
    id: id('o_'),
    ...order,
    status: 'confirmed',
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

// ---- Servírovanie statického frontendu (po `npm run build`) ----
const FRONTEND_DIST = join(__dirname, '..', '..', 'frontend', 'dist');
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (_req, res) => res.sendFile(join(FRONTEND_DIST, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Mlieko API beží na http://localhost:${PORT}`);
  console.log(`WhatsApp režim: ${whatsappEnabled ? 'LIVE (Twilio)' : 'DEV (výpis do konzoly)'}`);
});
