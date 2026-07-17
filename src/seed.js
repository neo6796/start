import { db } from './db.js';
import { hashPassword } from './auth.js';
import { addDays, todayStr } from './util.js';

// Seed an initial admin + demo data the first time the DB is created.
export function ensureSeed() {
  const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (count > 0) return;

  const now = new Date().toISOString();
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

  const centerA = db.prepare('INSERT INTO centers(name) VALUES(?)').run('Stredisko Bratislava').lastInsertRowid;
  const centerB = db.prepare('INSERT INTO centers(name) VALUES(?)').run('Stredisko Košice').lastInsertRowid;

  const cat1 = db.prepare('INSERT INTO caterers(name) VALUES(?)').run('Gastro Plus').lastInsertRowid;
  const cat2 = db.prepare('INSERT INTO caterers(name) VALUES(?)').run('Zdravá kuchyňa').lastInsertRowid;

  db.prepare('INSERT INTO users(username, full_name, password_hash, role, created_at) VALUES(?,?,?,?,?)')
    .run('admin', 'Administrátor', hashPassword(adminPass), 'admin', now);

  const diners = [
    ['jnovak', 'Ján Novák', centerA],
    ['mkovac', 'Mária Kováčová', centerA],
    ['phorvath', 'Peter Horváth', centerB],
  ];
  const insUser = db.prepare('INSERT INTO users(username, full_name, password_hash, role, center_id, created_at) VALUES(?,?,?,?,?,?)');
  for (const [u, n, c] of diners) insUser.run(u, n, hashPassword('heslo123'), 'diner', c, now);

  // A few days of demo menu
  const insItem = db.prepare('INSERT INTO menu_items(caterer_id, service_date, label, name, description, price_cents) VALUES(?,?,?,?,?,?)');
  for (let d = 0; d < 5; d++) {
    const date = addDays(todayStr(), d);
    insItem.run(cat1, date, 'Menu A', 'Vývar + Sviečková na smotane', 'Hovädzie, knedľa', 590);
    insItem.run(cat1, date, 'Menu B', 'Vývar + Vyprážaný syr', 'Hranolky, tatárska omáčka', 550);
    insItem.run(cat2, date, 'Menu C', 'Krémová polievka + Grilovaný losos', 'Zelenina, ryža', 720);
  }

  console.log(`Seed hotový. Admin: "admin" / heslo "${adminPass}". Stravníci: jnovak, mkovac, phorvath / "heslo123".`);
}
