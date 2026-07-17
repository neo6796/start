import { DatabaseSync } from 'node:sqlite';
import { DB_PATH } from './config.js';

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS centers (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS caterers (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  active    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'diner',   -- 'admin' | 'diner'
  center_id     INTEGER REFERENCES centers(id),
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id           INTEGER PRIMARY KEY,
  caterer_id   INTEGER NOT NULL REFERENCES caterers(id),
  service_date TEXT NOT NULL,                     -- YYYY-MM-DD
  label        TEXT NOT NULL,                     -- napr. "Menu A"
  name         TEXT NOT NULL,
  description  TEXT,
  price_cents  INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_menu_items_date ON menu_items(service_date);

CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
  service_date TEXT NOT NULL,
  quantity     INTEGER NOT NULL DEFAULT 1,
  status       TEXT NOT NULL DEFAULT 'ordered',   -- 'ordered' | 'cancelled'
  is_faulty    INTEGER NOT NULL DEFAULT 0,
  faulty_note  TEXT,
  created_by   INTEGER NOT NULL REFERENCES users(id),
  created_at   TEXT NOT NULL,
  UNIQUE(user_id, service_date)
);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(service_date);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);

CREATE TABLE IF NOT EXISTS absences (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  from_date  TEXT NOT NULL,
  to_date    TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_absences_user ON absences(user_id);

CREATE TABLE IF NOT EXISTS date_deadlines (
  service_date TEXT PRIMARY KEY,
  deadline_at  TEXT NOT NULL                       -- ISO timestamp
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`);

// ---- settings helpers ----
const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare(
  'INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
);

export function getSetting(key, fallback = null) {
  const row = getSettingStmt.get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  setSettingStmt.run(key, String(value));
}

// Defaults: order by 10:00, one day before the service date.
if (getSetting('cutoff_days_before') === null) setSetting('cutoff_days_before', '1');
if (getSetting('cutoff_time') === null) setSetting('cutoff_time', '10:00');
