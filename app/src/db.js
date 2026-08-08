import pg from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const tu = dirname(fileURLToPath(import.meta.url));

/* Čísla z databázy chceme ako čísla, nie ako reťazce.
   numeric vracia pg predvolene ako text, aby sa nestratila presnosť —
   pri sumách v centoch nám to nehrozí a počítať s textom sa nedá. */
pg.types.setTypeParser(1700, v => v === null ? null : Number(v));

export const bazen = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 8
});

export const dopyt = (text, hodnoty) => bazen.query(text, hodnoty);
export const jeden = async (text, hodnoty) => (await dopyt(text, hodnoty)).rows[0] ?? null;
export const vsetky = async (text, hodnoty) => (await dopyt(text, hodnoty)).rows;

/* Migrácie: očíslované súbory v sql/, každý sa spustí raz.
   Expand → migrate → contract (koncept 07) — nikdy sa nemaže v tom istom kroku. */
export async function migruj() {
  await dopyt(`CREATE TABLE IF NOT EXISTS migracia (
    nazov text PRIMARY KEY, kedy timestamptz NOT NULL DEFAULT now())`);
  const hotove = new Set((await vsetky("SELECT nazov FROM migracia")).map(r => r.nazov));
  const subory = readdirSync(join(tu, "..", "sql")).filter(f => f.endsWith(".sql")).sort();
  for (const f of subory) {
    if (hotove.has(f)) continue;
    const klient = await bazen.connect();
    try {
      await klient.query("BEGIN");
      await klient.query(readFileSync(join(tu, "..", "sql", f), "utf8"));
      await klient.query("INSERT INTO migracia(nazov) VALUES ($1)", [f]);
      await klient.query("COMMIT");
      console.log("migrácia:", f);
    } catch (e) {
      await klient.query("ROLLBACK");
      throw new Error(`migrácia ${f} zlyhala: ${e.message}`);
    } finally {
      klient.release();
    }
  }
}

export async function zapis(ktoId, co, detail) {
  await dopyt("INSERT INTO audit(kto_id, co, detail) VALUES ($1,$2,$3)",
              [ktoId ?? null, co, detail ? JSON.stringify(detail) : null]);
}
