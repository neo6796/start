import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { PORT, HOST, PUBLIC_DIR, SESSION_TTL_MS } from './config.js';
import { db, getSetting, setSetting } from './db.js';
import { hashPassword, verifyPassword, createToken, verifyToken } from './auth.js';
import {
  periodRange, todayStr, isPastDeadline, deadlineFor, centsToStr, toCsv, parseCsv, addDays,
} from './util.js';
import { ensureSeed } from './seed.js';

ensureSeed();

// ---------- tiny router ----------
const routes = [];
function route(method, pattern, handler, opts = {}) {
  const keys = [];
  const regex = new RegExp(
    '^' + pattern.replace(/:[^/]+/g, (m) => { keys.push(m.slice(1)); return '([^/]+)'; }) + '$'
  );
  routes.push({ method, regex, keys, handler, admin: !!opts.admin, auth: opts.auth !== false });
}

// ---------- helpers ----------
function send(res, status, body, headers = {}) {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(data);
}
function sendCsv(res, filename, csv) {
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  res.end('﻿' + csv); // BOM for Excel diacritics
}
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 5_000_000) reject(new HttpError(413, 'Príliš veľké telo požiadavky'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// ---------- statements ----------
const userById = db.prepare('SELECT * FROM users WHERE id = ?');
const userByName = db.prepare('SELECT * FROM users WHERE username = ?');

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, username: u.username, full_name: u.full_name, role: u.role, center_id: u.center_id, active: !!u.active };
}

// ==================== AUTH ====================
route('POST', '/api/login', async (req, res, ctx) => {
  const { username, password } = ctx.body || {};
  const u = userByName.get(String(username || '').trim());
  if (!u || !u.active || !verifyPassword(password, u.password_hash)) {
    throw new HttpError(401, 'Nesprávne meno alebo heslo');
  }
  const token = createToken(u.id);
  send(res, 200, publicUser(u), {
    'Set-Cookie': `sid=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  });
}, { auth: false });

route('POST', '/api/logout', async (req, res) => {
  send(res, 200, { ok: true }, { 'Set-Cookie': 'sid=; HttpOnly; Path=/; Max-Age=0' });
}, { auth: false });

route('GET', '/api/me', async (req, res, ctx) => send(res, 200, publicUser(ctx.user)));

// ==================== CENTERS ====================
route('GET', '/api/centers', async (req, res) =>
  send(res, 200, db.prepare('SELECT * FROM centers ORDER BY name').all()));
route('POST', '/api/centers', async (req, res, ctx) => {
  const name = String(ctx.body.name || '').trim();
  if (!name) throw new HttpError(400, 'Názov strediska je povinný');
  const info = db.prepare('INSERT INTO centers(name) VALUES(?)').run(name);
  send(res, 201, db.prepare('SELECT * FROM centers WHERE id=?').get(info.lastInsertRowid));
}, { admin: true });
route('PATCH', '/api/centers/:id', async (req, res, ctx) => {
  const { name, active } = ctx.body;
  db.prepare('UPDATE centers SET name=COALESCE(?,name), active=COALESCE(?,active) WHERE id=?')
    .run(name ?? null, active === undefined ? null : active ? 1 : 0, ctx.params.id);
  send(res, 200, db.prepare('SELECT * FROM centers WHERE id=?').get(ctx.params.id));
}, { admin: true });

// ==================== CATERERS ====================
route('GET', '/api/caterers', async (req, res) =>
  send(res, 200, db.prepare('SELECT * FROM caterers ORDER BY name').all()));
route('POST', '/api/caterers', async (req, res, ctx) => {
  const name = String(ctx.body.name || '').trim();
  if (!name) throw new HttpError(400, 'Názov partnera je povinný');
  const info = db.prepare('INSERT INTO caterers(name) VALUES(?)').run(name);
  send(res, 201, db.prepare('SELECT * FROM caterers WHERE id=?').get(info.lastInsertRowid));
}, { admin: true });
route('PATCH', '/api/caterers/:id', async (req, res, ctx) => {
  const { name, active } = ctx.body;
  db.prepare('UPDATE caterers SET name=COALESCE(?,name), active=COALESCE(?,active) WHERE id=?')
    .run(name ?? null, active === undefined ? null : active ? 1 : 0, ctx.params.id);
  send(res, 200, db.prepare('SELECT * FROM caterers WHERE id=?').get(ctx.params.id));
}, { admin: true });

// ==================== USERS (stravníci) ====================
route('GET', '/api/users', async (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.role, u.center_id, u.active, c.name AS center_name
    FROM users u LEFT JOIN centers c ON c.id = u.center_id
    ORDER BY u.full_name`).all();
  send(res, 200, rows.map((r) => ({ ...r, active: !!r.active })));
}, { admin: true });

route('POST', '/api/users', async (req, res, ctx) => {
  const { username, full_name, password, role, center_id } = ctx.body;
  if (!username || !full_name || !password) throw new HttpError(400, 'Meno, celé meno a heslo sú povinné');
  if (userByName.get(String(username).trim())) throw new HttpError(409, 'Prihlasovacie meno už existuje');
  const info = db.prepare(`INSERT INTO users(username, full_name, password_hash, role, center_id, created_at)
    VALUES(?,?,?,?,?,?)`).run(
    String(username).trim(), String(full_name).trim(), hashPassword(password),
    role === 'admin' ? 'admin' : 'diner', center_id || null, new Date().toISOString());
  send(res, 201, publicUser(userById.get(info.lastInsertRowid)));
}, { admin: true });

route('PATCH', '/api/users/:id', async (req, res, ctx) => {
  const { full_name, password, role, center_id, active } = ctx.body;
  const u = userById.get(ctx.params.id);
  if (!u) throw new HttpError(404, 'Stravník nenájdený');
  db.prepare(`UPDATE users SET
      full_name = COALESCE(?, full_name),
      password_hash = COALESCE(?, password_hash),
      role = COALESCE(?, role),
      center_id = ?,
      active = COALESCE(?, active)
    WHERE id = ?`).run(
    full_name ?? null,
    password ? hashPassword(password) : null,
    role ?? null,
    center_id === undefined ? u.center_id : (center_id || null),
    active === undefined ? null : active ? 1 : 0,
    ctx.params.id);
  send(res, 200, publicUser(userById.get(ctx.params.id)));
}, { admin: true });

// ==================== SETTINGS & DEADLINES ====================
route('GET', '/api/settings', async (req, res) => {
  send(res, 200, {
    cutoff_days_before: Number(getSetting('cutoff_days_before', '1')),
    cutoff_time: getSetting('cutoff_time', '10:00'),
  });
});
route('PUT', '/api/settings', async (req, res, ctx) => {
  const { cutoff_days_before, cutoff_time } = ctx.body;
  if (cutoff_days_before !== undefined) setSetting('cutoff_days_before', Number(cutoff_days_before));
  if (cutoff_time !== undefined) setSetting('cutoff_time', String(cutoff_time));
  send(res, 200, {
    cutoff_days_before: Number(getSetting('cutoff_days_before', '1')),
    cutoff_time: getSetting('cutoff_time', '10:00'),
  });
}, { admin: true });

route('PUT', '/api/deadlines', async (req, res, ctx) => {
  const { service_date, deadline_at } = ctx.body;
  if (!service_date || !deadline_at) throw new HttpError(400, 'service_date a deadline_at sú povinné');
  db.prepare(`INSERT INTO date_deadlines(service_date, deadline_at) VALUES(?,?)
    ON CONFLICT(service_date) DO UPDATE SET deadline_at=excluded.deadline_at`).run(service_date, deadline_at);
  send(res, 200, { service_date, deadline_at });
}, { admin: true });
route('DELETE', '/api/deadlines/:date', async (req, res, ctx) => {
  db.prepare('DELETE FROM date_deadlines WHERE service_date=?').run(ctx.params.date);
  send(res, 200, { ok: true });
}, { admin: true });

// ==================== MENU ====================
const deadlineByDate = db.prepare('SELECT deadline_at FROM date_deadlines WHERE service_date=?');

route('GET', '/api/menu', async (req, res, ctx) => {
  const from = ctx.query.from || todayStr();
  const to = ctx.query.to || addDays(from, 30);
  const rows = db.prepare(`
    SELECT m.*, c.name AS caterer_name
    FROM menu_items m JOIN caterers c ON c.id = m.caterer_id
    WHERE m.service_date BETWEEN ? AND ?
    ORDER BY m.service_date, c.name, m.label`).all(from, to);
  send(res, 200, rows.map((r) => ({ ...r, active: !!r.active, price: centsToStr(r.price_cents) })));
});

route('POST', '/api/menu', async (req, res, ctx) => {
  const { caterer_id, service_date, label, name, description, price } = ctx.body;
  if (!caterer_id || !service_date || !label || !name) throw new HttpError(400, 'caterer_id, service_date, label a name sú povinné');
  const price_cents = Math.round(Number(price || 0) * 100);
  const info = db.prepare(`INSERT INTO menu_items(caterer_id, service_date, label, name, description, price_cents)
    VALUES(?,?,?,?,?,?)`).run(caterer_id, service_date, label, name, description || null, price_cents);
  send(res, 201, db.prepare('SELECT * FROM menu_items WHERE id=?').get(info.lastInsertRowid));
}, { admin: true });

route('PATCH', '/api/menu/:id', async (req, res, ctx) => {
  const { label, name, description, price, active } = ctx.body;
  const price_cents = price === undefined ? null : Math.round(Number(price) * 100);
  db.prepare(`UPDATE menu_items SET
      label=COALESCE(?,label), name=COALESCE(?,name), description=COALESCE(?,description),
      price_cents=COALESCE(?,price_cents), active=COALESCE(?,active) WHERE id=?`)
    .run(label ?? null, name ?? null, description ?? null, price_cents,
      active === undefined ? null : active ? 1 : 0, ctx.params.id);
  send(res, 200, db.prepare('SELECT * FROM menu_items WHERE id=?').get(ctx.params.id));
}, { admin: true });

route('DELETE', '/api/menu/:id', async (req, res, ctx) => {
  const used = db.prepare('SELECT COUNT(*) n FROM orders WHERE menu_item_id=?').get(ctx.params.id).n;
  if (used > 0) throw new HttpError(409, 'Položku nemožno zmazať, existujú objednávky. Deaktivujte ju.');
  db.prepare('DELETE FROM menu_items WHERE id=?').run(ctx.params.id);
  send(res, 200, { ok: true });
}, { admin: true });

// ==================== ORDERS ====================
const menuItemById = db.prepare('SELECT * FROM menu_items WHERE id=?');
const existingOrder = db.prepare("SELECT * FROM orders WHERE user_id=? AND service_date=? AND status='ordered'");

function placeOrder({ user_id, menu_item_id, created_by, allowPastDeadline }) {
  const item = menuItemById.get(menu_item_id);
  if (!item || !item.active) throw new HttpError(400, 'Neplatná položka menu');
  const service_date = item.service_date;
  if (!allowPastDeadline) {
    const ov = deadlineByDate.get(service_date)?.deadline_at;
    if (isPastDeadline(service_date, ov)) throw new HttpError(403, 'Termín na objednanie/odhlásenie už uplynul');
  }
  if (existingOrder.get(user_id, service_date)) throw new HttpError(409, 'Na tento deň už objednávka existuje (bez možnosti spätnej zmeny)');
  const info = db.prepare(`INSERT INTO orders(user_id, menu_item_id, service_date, created_by, created_at)
    VALUES(?,?,?,?,?)`).run(user_id, menu_item_id, service_date, created_by, new Date().toISOString());
  return db.prepare('SELECT * FROM orders WHERE id=?').get(info.lastInsertRowid);
}

// Diner: place own order
route('POST', '/api/orders', async (req, res, ctx) => {
  const { menu_item_id } = ctx.body;
  const order = placeOrder({ user_id: ctx.user.id, menu_item_id, created_by: ctx.user.id });
  send(res, 201, order);
});

// Admin bulk order for many diners at once
route('POST', '/api/orders/bulk', async (req, res, ctx) => {
  const { menu_item_id, user_ids, allow_past_deadline } = ctx.body;
  if (!menu_item_id || !Array.isArray(user_ids) || user_ids.length === 0)
    throw new HttpError(400, 'menu_item_id a zoznam user_ids sú povinné');
  const results = { created: 0, skipped: [], };
  const tx = db.prepare('SELECT 1'); // noop to show intent; we loop manually
  for (const uid of user_ids) {
    try {
      placeOrder({ user_id: uid, menu_item_id, created_by: ctx.user.id, allowPastDeadline: !!allow_past_deadline });
      results.created++;
    } catch (e) {
      results.skipped.push({ user_id: uid, reason: e.message });
    }
  }
  send(res, 200, results);
}, { admin: true });

// Diner: cancel own order — only before deadline (acts as odhlásenie for that day)
route('DELETE', '/api/orders/:id', async (req, res, ctx) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(ctx.params.id);
  if (!o) throw new HttpError(404, 'Objednávka nenájdená');
  const isAdmin = ctx.user.role === 'admin';
  if (!isAdmin && o.user_id !== ctx.user.id) throw new HttpError(403, 'Nie je vaša objednávka');
  if (!isAdmin) {
    const ov = deadlineByDate.get(o.service_date)?.deadline_at;
    if (isPastDeadline(o.service_date, ov)) throw new HttpError(403, 'Termín uplynul, objednávku už nemožno zrušiť');
  }
  db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(o.id);
  send(res, 200, { ok: true });
});

// Diner: my orders (read-only history)
route('GET', '/api/orders/mine', async (req, res, ctx) => {
  const from = ctx.query.from || addDays(todayStr(), -30);
  const to = ctx.query.to || addDays(todayStr(), 30);
  const rows = db.prepare(`
    SELECT o.*, m.name AS item_name, m.label, m.price_cents, cat.name AS caterer_name
    FROM orders o JOIN menu_items m ON m.id=o.menu_item_id JOIN caterers cat ON cat.id=m.caterer_id
    WHERE o.user_id=? AND o.service_date BETWEEN ? AND ?
    ORDER BY o.service_date DESC`).all(ctx.user.id, from, to);
  send(res, 200, rows.map((r) => ({ ...r, is_faulty: !!r.is_faulty, price: centsToStr(r.price_cents) })));
});

// Admin: orders view — individual or aggregated
route('GET', '/api/orders', async (req, res, ctx) => {
  const { period, ref, center_id, user_id, group } = ctx.query;
  let { from, to } = ctx.query;
  if (period) ({ from, to } = periodRange(period, ref));
  from = from || todayStr(); to = to || from;

  const where = ['o.service_date BETWEEN ? AND ?', "o.status='ordered'"];
  const args = [from, to];
  if (center_id) { where.push('u.center_id = ?'); args.push(center_id); }
  if (user_id) { where.push('o.user_id = ?'); args.push(user_id); }
  const W = where.join(' AND ');

  if (group && group !== 'none') {
    const groupCol = {
      user: 'u.full_name', center: 'c.name', date: 'o.service_date', caterer: 'cat.name',
    }[group];
    if (!groupCol) throw new HttpError(400, 'Neplatné zoskupenie');
    const rows = db.prepare(`
      SELECT ${groupCol} AS grp, COUNT(*) AS count,
             SUM(m.price_cents) AS total_cents,
             SUM(o.is_faulty) AS faulty_count
      FROM orders o
      JOIN users u ON u.id=o.user_id
      JOIN menu_items m ON m.id=o.menu_item_id
      JOIN caterers cat ON cat.id=m.caterer_id
      LEFT JOIN centers c ON c.id=u.center_id
      WHERE ${W}
      GROUP BY ${groupCol} ORDER BY ${groupCol}`).all(...args);
    return send(res, 200, {
      from, to, group,
      rows: rows.map((r) => ({ label: r.grp, count: r.count, faulty_count: r.faulty_count, total: centsToStr(r.total_cents || 0) })),
    });
  }

  const rows = db.prepare(`
    SELECT o.id, o.service_date, o.quantity, o.is_faulty, o.faulty_note,
           u.full_name, u.id AS user_id, c.name AS center_name,
           m.label, m.name AS item_name, m.price_cents, cat.name AS caterer_name
    FROM orders o
    JOIN users u ON u.id=o.user_id
    JOIN menu_items m ON m.id=o.menu_item_id
    JOIN caterers cat ON cat.id=m.caterer_id
    LEFT JOIN centers c ON c.id=u.center_id
    WHERE ${W}
    ORDER BY o.service_date, u.full_name`).all(...args);
  send(res, 200, { from, to, rows: rows.map((r) => ({ ...r, is_faulty: !!r.is_faulty, price: centsToStr(r.price_cents) })) });
}, { admin: true });

// Admin: flag faulty order/delivery
route('PATCH', '/api/orders/:id/faulty', async (req, res, ctx) => {
  const { is_faulty, note } = ctx.body;
  db.prepare('UPDATE orders SET is_faulty=?, faulty_note=? WHERE id=?')
    .run(is_faulty ? 1 : 0, note || null, ctx.params.id);
  send(res, 200, db.prepare('SELECT * FROM orders WHERE id=?').get(ctx.params.id));
}, { admin: true });

// ==================== ABSENCES (odhlásenie na obdobie) ====================
route('GET', '/api/absences/mine', async (req, res, ctx) =>
  send(res, 200, db.prepare('SELECT * FROM absences WHERE user_id=? ORDER BY from_date DESC').all(ctx.user.id)));

route('POST', '/api/absences', async (req, res, ctx) => {
  const { from_date, to_date, note } = ctx.body;
  if (!from_date || !to_date) throw new HttpError(400, 'from_date a to_date sú povinné');
  const info = db.prepare('INSERT INTO absences(user_id, from_date, to_date, note, created_at) VALUES(?,?,?,?,?)')
    .run(ctx.user.id, from_date, to_date, note || null, new Date().toISOString());
  // Auto-cancel any of the user's future orders in that range that are still before deadline.
  const affected = db.prepare(`SELECT id, service_date FROM orders
    WHERE user_id=? AND status='ordered' AND service_date BETWEEN ? AND ?`).all(ctx.user.id, from_date, to_date);
  for (const o of affected) {
    const ov = deadlineByDate.get(o.service_date)?.deadline_at;
    if (!isPastDeadline(o.service_date, ov)) db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(o.id);
  }
  send(res, 201, db.prepare('SELECT * FROM absences WHERE id=?').get(info.lastInsertRowid));
});

route('DELETE', '/api/absences/:id', async (req, res, ctx) => {
  const a = db.prepare('SELECT * FROM absences WHERE id=?').get(ctx.params.id);
  if (!a) throw new HttpError(404, 'Nenájdené');
  if (ctx.user.role !== 'admin' && a.user_id !== ctx.user.id) throw new HttpError(403, 'Zakázané');
  db.prepare('DELETE FROM absences WHERE id=?').run(ctx.params.id);
  send(res, 200, { ok: true });
});

route('GET', '/api/absences', async (req, res) => {
  send(res, 200, db.prepare(`SELECT a.*, u.full_name FROM absences a JOIN users u ON u.id=a.user_id
    ORDER BY a.from_date DESC`).all());
}, { admin: true });

// ==================== REPORT / BILLING ====================
// Aggregated monthly (or any period) billing per user + center.
route('GET', '/api/report/billing', async (req, res, ctx) => {
  const { period = 'month', ref, center_id } = ctx.query;
  const { from, to } = periodRange(period, ref);
  const where = ['o.service_date BETWEEN ? AND ?', "o.status='ordered'"];
  const args = [from, to];
  if (center_id) { where.push('u.center_id=?'); args.push(center_id); }
  const rows = db.prepare(`
    SELECT u.id AS user_id, u.full_name, c.name AS center_name,
           COUNT(*) AS meals,
           SUM(o.is_faulty) AS faulty,
           SUM(CASE WHEN o.is_faulty=0 THEN m.price_cents ELSE 0 END) AS billable_cents,
           SUM(m.price_cents) AS gross_cents
    FROM orders o
    JOIN users u ON u.id=o.user_id
    JOIN menu_items m ON m.id=o.menu_item_id
    LEFT JOIN centers c ON c.id=u.center_id
    WHERE ${where.join(' AND ')}
    GROUP BY u.id ORDER BY c.name, u.full_name`).all(...args);
  const totalBillable = rows.reduce((s, r) => s + (r.billable_cents || 0), 0);
  send(res, 200, {
    period, from, to,
    total_billable: centsToStr(totalBillable),
    rows: rows.map((r) => ({
      ...r,
      billable: centsToStr(r.billable_cents || 0),
      gross: centsToStr(r.gross_cents || 0),
    })),
  });
}, { admin: true });

// ==================== EXPORT / IMPORT ====================
route('GET', '/api/export/orders.csv', async (req, res, ctx) => {
  let { from, to } = ctx.query;
  const { period, ref } = ctx.query;
  if (period) ({ from, to } = periodRange(period, ref));
  from = from || addDays(todayStr(), -365); to = to || todayStr();
  const rows = db.prepare(`
    SELECT o.service_date, u.username, u.full_name, c.name AS center, cat.name AS caterer,
           m.label, m.name AS item, m.price_cents, o.is_faulty, o.faulty_note, o.status
    FROM orders o
    JOIN users u ON u.id=o.user_id
    JOIN menu_items m ON m.id=o.menu_item_id
    JOIN caterers cat ON cat.id=m.caterer_id
    LEFT JOIN centers c ON c.id=u.center_id
    WHERE o.service_date BETWEEN ? AND ?
    ORDER BY o.service_date, u.full_name`).all(from, to);
  const csv = toCsv(rows, [
    { header: 'datum', value: 'service_date' },
    { header: 'login', value: 'username' },
    { header: 'stravnik', value: 'full_name' },
    { header: 'stredisko', value: 'center' },
    { header: 'partner', value: 'caterer' },
    { header: 'menu', value: 'label' },
    { header: 'nazov', value: 'item' },
    { header: 'cena', value: (r) => centsToStr(r.price_cents) },
    { header: 'chybna', value: (r) => (r.is_faulty ? 'ano' : 'nie') },
    { header: 'poznamka_chyba', value: 'faulty_note' },
    { header: 'stav', value: 'status' },
  ]);
  sendCsv(res, `objednavky_${from}_${to}.csv`, csv);
}, { admin: true });

route('GET', '/api/export/billing.csv', async (req, res, ctx) => {
  const { period = 'month', ref, center_id } = ctx.query;
  const { from, to } = periodRange(period, ref);
  const where = ['o.service_date BETWEEN ? AND ?', "o.status='ordered'"];
  const args = [from, to];
  if (center_id) { where.push('u.center_id=?'); args.push(center_id); }
  const rows = db.prepare(`
    SELECT u.full_name, c.name AS center, COUNT(*) AS meals, SUM(o.is_faulty) AS faulty,
           SUM(CASE WHEN o.is_faulty=0 THEN m.price_cents ELSE 0 END) AS billable_cents
    FROM orders o JOIN users u ON u.id=o.user_id JOIN menu_items m ON m.id=o.menu_item_id
    LEFT JOIN centers c ON c.id=u.center_id
    WHERE ${where.join(' AND ')} GROUP BY u.id ORDER BY c.name, u.full_name`).all(...args);
  const csv = toCsv(rows, [
    { header: 'stravnik', value: 'full_name' },
    { header: 'stredisko', value: 'center' },
    { header: 'pocet_obedov', value: 'meals' },
    { header: 'z_toho_chybne', value: 'faulty' },
    { header: 'suma_na_uctovanie', value: (r) => centsToStr(r.billable_cents || 0) },
  ]);
  sendCsv(res, `rozuctovanie_${from}_${to}.csv`, csv);
}, { admin: true });

// Import historical orders from CSV (columns: datum, login, partner, menu, nazov, cena[, chybna])
route('POST', '/api/import/orders', async (req, res, ctx) => {
  const records = parseCsv(ctx.rawBody || '');
  let imported = 0; const errors = [];
  const findCaterer = db.prepare('SELECT id FROM caterers WHERE name=?');
  const insCaterer = db.prepare('INSERT INTO caterers(name) VALUES(?)');
  const findItem = db.prepare('SELECT id FROM menu_items WHERE caterer_id=? AND service_date=? AND label=? AND name=?');
  const insItem = db.prepare('INSERT INTO menu_items(caterer_id, service_date, label, name, price_cents) VALUES(?,?,?,?,?)');
  for (const [i, rec] of records.entries()) {
    try {
      const date = rec.datum || rec.date || rec.service_date;
      const login = rec.login || rec.username;
      const u = userByName.get(String(login || '').trim());
      if (!date || !u) { errors.push(`riadok ${i + 2}: neznámy stravník alebo dátum`); continue; }
      const catName = rec.partner || rec.caterer || 'Import';
      let cat = findCaterer.get(catName);
      const catId = cat ? cat.id : insCaterer.run(catName).lastInsertRowid;
      const label = rec.menu || rec.label || 'Menu';
      const name = rec.nazov || rec.name || rec.item || label;
      const price_cents = Math.round(Number(String(rec.cena || rec.price || '0').replace(',', '.')) * 100);
      let item = findItem.get(catId, date, label, name);
      const itemId = item ? item.id : insItem.run(catId, date, label, name, price_cents).lastInsertRowid;
      const faulty = /^(ano|1|true|yes)$/i.test(String(rec.chybna || rec.is_faulty || ''));
      db.prepare(`INSERT INTO orders(user_id, menu_item_id, service_date, is_faulty, created_by, created_at)
        VALUES(?,?,?,?,?,?)
        ON CONFLICT(user_id, service_date) DO NOTHING`)
        .run(u.id, itemId, date, faulty ? 1 : 0, ctx.user.id, new Date().toISOString());
      imported++;
    } catch (e) {
      errors.push(`riadok ${i + 2}: ${e.message}`);
    }
  }
  send(res, 200, { imported, total: records.length, errors });
}, { admin: true });

// ==================== DINER: available menu with my status ====================
route('GET', '/api/menu/available', async (req, res, ctx) => {
  const from = ctx.query.from || todayStr();
  const to = ctx.query.to || addDays(from, 14);
  const items = db.prepare(`
    SELECT m.*, cat.name AS caterer_name FROM menu_items m JOIN caterers cat ON cat.id=m.caterer_id
    WHERE m.service_date BETWEEN ? AND ? AND m.active=1 AND cat.active=1
    ORDER BY m.service_date, cat.name, m.label`).all(from, to);
  const myOrders = db.prepare(`SELECT o.*, m.label, m.name AS item_name FROM orders o
    JOIN menu_items m ON m.id=o.menu_item_id
    WHERE o.user_id=? AND o.status='ordered' AND o.service_date BETWEEN ? AND ?`).all(ctx.user.id, from, to);
  const orderByDate = {};
  for (const o of myOrders) orderByDate[o.service_date] = o;
  const now = new Date();
  const byDate = {};
  for (const it of items) {
    const ov = deadlineByDate.get(it.service_date)?.deadline_at;
    (byDate[it.service_date] ||= {
      service_date: it.service_date,
      deadline: deadlineFor(it.service_date, ov).toISOString(),
      locked: isPastDeadline(it.service_date, ov, now),
      my_order: orderByDate[it.service_date]
        ? { id: orderByDate[it.service_date].id, menu_item_id: orderByDate[it.service_date].menu_item_id,
            label: orderByDate[it.service_date].label, name: orderByDate[it.service_date].item_name }
        : null,
      items: [],
    }).items.push({ ...it, price: centsToStr(it.price_cents) });
  }
  send(res, 200, Object.values(byDate));
});

// ==================== router dispatch ====================
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function serveStatic(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, html) =>
        e2 ? send(res, 404, { error: 'Not found' }) : (res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }), res.end(html)));
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res);

    const match = routes.find((r) => r.method === req.method && r.regex.test(url.pathname));
    if (!match) return send(res, 404, { error: 'Neznámy endpoint' });

    const ctx = { params: {}, query: Object.fromEntries(url.searchParams), user: null, body: {}, rawBody: '' };
    const m = url.pathname.match(match.regex);
    match.keys.forEach((k, i) => { ctx.params[k] = m[i + 1]; });

    if (match.auth) {
      const uid = verifyToken(parseCookies(req).sid);
      const u = uid ? userById.get(uid) : null;
      if (!u || !u.active) return send(res, 401, { error: 'Neprihlásený' });
      ctx.user = u;
      if (match.admin && u.role !== 'admin') return send(res, 403, { error: 'Vyžaduje sa administrátor' });
    }

    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const raw = await readBody(req);
      ctx.rawBody = raw;
      const ct = req.headers['content-type'] || '';
      if (ct.includes('application/json') && raw) {
        try { ctx.body = JSON.parse(raw); } catch { return send(res, 400, { error: 'Neplatný JSON' }); }
      }
    }

    await match.handler(req, res, ctx);
  } catch (err) {
    if (err instanceof HttpError) return send(res, err.status, { error: err.message });
    if (String(err.message).includes('UNIQUE')) return send(res, 409, { error: 'Konflikt: záznam už existuje' });
    console.error(err);
    send(res, 500, { error: 'Interná chyba servera' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Obedy beží na http://${HOST}:${PORT}`);
});
