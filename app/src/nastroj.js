/* Príkazy na správu z terminálu servera:

     docker compose exec -T app node src/nastroj.js spravca 4021 Solár Erik
     docker compose exec -T app node src/nastroj.js heslo 4021
     docker compose exec -T app node src/nastroj.js zaklad

   Heslo sa nikdy nezadáva ako argument — čítalo by sa z histórie shellu
   aj z výpisu bežiacich procesov. Príkaz si ho vypýta a prečíta zo vstupu. */

import { createInterface } from "node:readline/promises";
import { text } from "node:stream/consumers";
import { stdin, stdout } from "node:process";
import { migruj, bazen, dopyt, jeden, zapis } from "./db.js";
import { hashHesla } from "./relacia.js";
import { posli, postaJeNastavena } from "./posta.js";

/* Dva spôsoby čítania, lebo readline sa na rúre správa inak než na termináli:
   pri rúre si načíta celý blok naraz a všetky riadky vypustí hneď — druhá
   otázka by potom čakala na vstup, ktorý už prebehol. Preto sa pri rúre
   načíta všetko dopredu a rozdelí na riadky. */
let vstup = null, riadky = null, kde = 0;

async function precitajHeslo(vyzva) {
  if (stdin.isTTY) {
    vstup ??= createInterface({ input: stdin, output: stdout, terminal: true });
    const otazka = vstup.question(vyzva);
    vstup._writeToOutput = () => {};                 // písané znaky sa nezobrazujú
    const heslo = await otazka;
    vstup._writeToOutput = z => vstup.output.write(z);
    vstup.output.write("\n");
    return heslo;
  }
  if (riadky === null) riadky = (await text(stdin)).split(/\r?\n/);
  stdout.write(vyzva + "\n");
  return riadky[kde++] ?? "";
}

async function novéHeslo(minimum) {
  const a = await precitajHeslo("Heslo: ");
  if (!a) throw new Error("Nezadali ste nič.");
  if (a.length < minimum) throw new Error(`Heslo musí mať aspoň ${minimum} znakov.`);
  const b = await precitajHeslo("Ešte raz: ");
  if (a !== b) throw new Error("Heslá sa nezhodujú.");
  return a;
}

/* --- spravca: založí alebo povýši človeka na správcu a nastaví mu heslo --- */
async function spravca([kod, priezvisko, meno]) {
  if (!kod) throw new Error("Použitie: nastroj.js spravca <osobné číslo> [priezvisko] [meno]");
  const heslo = await novéHeslo(10);
  const hash = await hashHesla(heslo);

  const jestvuje = await jeden("SELECT * FROM osoba WHERE kod_dochadzka = $1", [kod]);
  if (jestvuje) {
    await dopyt("UPDATE osoba SET je_admin = true, aktivny = true, heslo_hash = $2 WHERE id = $1",
                [jestvuje.id, hash]);
    await zapis(null, "nastroj.spravca.upraveny", { kod });
    console.log(`Hotovo: ${jestvuje.priezvisko} ${jestvuje.meno} je správca a má nové heslo.`);
    return;
  }
  if (!priezvisko || !meno) throw new Error("Taký človek tu ešte nie je — doplňte priezvisko a meno.");
  const novy = await jeden(
    `INSERT INTO osoba (kod_dochadzka, priezvisko, meno, je_admin, heslo_hash)
     VALUES ($1,$2,$3,true,$4) RETURNING id`, [kod, priezvisko, meno, hash]);
  await zapis(null, "nastroj.spravca.zalozeny", { kod, osoba_id: novy.id });
  console.log(`Hotovo: založený správca ${priezvisko} ${meno} (${kod}).`);
}

/* --- heslo: nastaví nové heslo hocikomu --- */
async function heslo([kod]) {
  if (!kod) throw new Error("Použitie: nastroj.js heslo <osobné číslo>");
  const o = await jeden("SELECT * FROM osoba WHERE kod_dochadzka = $1", [kod]);
  if (!o) throw new Error(`Osobné číslo ${kod} tu nie je.`);
  const minimum = o.je_admin ? 10 : o.je_predak ? 8 : 4;
  const h = await hashHesla(await novéHeslo(minimum));
  await dopyt("UPDATE osoba SET heslo_hash = $2 WHERE id = $1", [o.id, h]);
  /* Staré prihlásenia po zmene hesla neplatia — inak by zmena hesla
     nepomohla proti niekomu, kto je práve prihlásený. */
  await dopyt("DELETE FROM relacia WHERE osoba_id = $1", [o.id]);
  await zapis(null, "nastroj.heslo", { kod });
  console.log(`Hotovo: ${o.priezvisko} ${o.meno} má nové heslo a je odhlásený zo všetkých zariadení.`);
}

/* --- zaklad: číselníky, ktoré vieme z 09-dodavatelia.md --- */
async function zaklad() {
  const vloz = async (sql, hodnoty, co) => {
    const r = await dopyt(sql, hodnoty);
    console.log(`${r.rowCount ? "pridané" : "už bolo"}: ${co}`);
  };
  for (const f of ["Poľnohospodárske družstvo vo Vrábľoch", "Adiumentum", "Cronus", "HBE"])
    await vloz("INSERT INTO firma (nazov) VALUES ($1) ON CONFLICT (nazov) DO NOTHING", [f], `firma ${f}`);

  await vloz(`INSERT INTO poskytovatel (nazov, znacenie, pocet_jedal, cena_s_dph, sadzba_dph, model, odhlasenie_do)
              VALUES ('GASTROGAL','arabic',5,6.30,19,'eko','07:30') ON CONFLICT (nazov) DO NOTHING`,
             [], "jedáleň GASTROGAL (6,30 € s dovozom)");
  await vloz(`INSERT INTO poskytovatel (nazov, znacenie, pocet_jedal, cena_s_dph, sadzba_dph, model, odhlasenie_do)
              VALUES ('GASTRO ABM','upper',5,7.20,19,'eko','07:30') ON CONFLICT (nazov) DO NOTHING`,
             [], "jedáleň GASTRO ABM (7,20 €)");

  console.log("\nPrevádzky, tímy a ľudia sa zakladajú v appke — tie sa z dokumentov odvodiť nedajú.");
}

/* --- posta: skúšobná správa, aby sa dalo overiť odosielanie --- */
async function posta([kam]) {
  if (!kam) throw new Error("Použitie: nastroj.js posta <adresa>");
  if (!postaJeNastavena())
    throw new Error("V .env chýba SMTP_HOST, SMTP_MENO alebo SMTP_HESLO.");

  console.log(`Posielam na ${kam} cez ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587} …`);
  try {
    const v = await posli({
      komu: kam,
      predmet: "Obedár — skúšobná správa",
      text: [
        "Toto je skúšobná správa z aplikácie Obedár.",
        "",
        `Server:  ${process.env.SMTP_HOST}`,
        `Meno:    ${process.env.SMTP_MENO}`,
        `Odosiela: ${process.env.SMTP_OD ?? "obedy@ahafarma.sk"}`,
        "",
        "Ak vám prišla, odosielanie objednávok bude fungovať.",
        "Skontrolujte aj to, či neskončila v priečinku nevyžiadanej pošty."
      ].join("\n")
    });
    console.log("Odoslané. Server odpovedal:", v.odpoved);
  } catch (e) {
    console.error("Nepodarilo sa:", e.message);
    if (e.prihlasenie) {
      console.error("");
      console.error("Zlyhalo prihlásenie. ĎALEJ TO NESKÚŠAJTE — po niekoľkých pokusoch");
      console.error("ochrana mailového servera zablokuje IP celého servera.");
      console.error("Overte SMTP_MENO a SMTP_HESLO v .env a skúste až potom.");
    }
    throw e;
  }
}

const PRIKAZY = { spravca, heslo, zaklad, posta };

const [prikaz, ...zvysok] = process.argv.slice(2);
if (!PRIKAZY[prikaz]) {
  console.error(`Príkazy: ${Object.keys(PRIKAZY).join(", ")}`);
  process.exit(2);
}

try {
  await migruj();
  await PRIKAZY[prikaz](zvysok);
  vstup?.close();
  await bazen.end();
} catch (e) {
  console.error("Chyba:", e.message);
  vstup?.close();
  await bazen.end();
  process.exit(1);
}
