// Jednoduché JSON úložisko – žiadne natívne závislosti, beží kdekoľvek.
// Pre reálnu prevádzku sa dá bez zmeny API vrstvy vymeniť za SQLite/Postgres.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, '..', 'data');
const DB_FILE = join(DATA_DIR, 'db.json');

const DEFAULT_DATA = {
  products: [],
  orders: [],
  meta: { seeded: false },
};

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function load() {
  ensureDir();
  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
    return structuredClone(DEFAULT_DATA);
  }
  try {
    return JSON.parse(readFileSync(DB_FILE, 'utf8'));
  } catch {
    return structuredClone(DEFAULT_DATA);
  }
}

export function save(data) {
  ensureDir();
  writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Malý pomocník na generovanie ID bez externých závislostí.
export function id(prefix = '') {
  const rnd = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rnd}`;
}
