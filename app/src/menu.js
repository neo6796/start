/* Menu na týždeň.

   Koncept 18: názvy jedál sú voliteľné, príloha je plnohodnotná. Jedálne
   posielajú lístok ako PDF a prepisovať ho do appky je práca navyše —
   predákovi stačí, keď si ho otvorí. Názvy sa dopĺňajú vtedy, keď niekomu
   stojí za to ich napísať; matica funguje aj bez nich, lebo označenia
   (1–5, A–E) určuje jedáleň, nie menu. */

import { stranka, esc, mnoho } from "./html.js";
import { bazen, jeden, vsetky, zapis } from "./db.js";
import { DNI, dnes, pondelok, dniTyzdna, denMesiac, tyzdenPopis, oznacenie } from "./datum.js";

const LIMIT_PRILOHY = 8 * 1024 * 1024;
const POVOLENE = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function posunTyzden(po, dni) {
  const d = new Date(po + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
}

/* Menu týždňa aj s jedlami. Používa to matica, tak je to tu raz. */
export async function menuTyzdna(poskytovatelId, po) {
  const m = await jeden(
    `SELECT id, priloha_nazov, priloha_typ, octet_length(priloha_data) AS priloha_velkost
       FROM menu_tyzden WHERE poskytovatel_id = $1 AND pondelok = $2`, [poskytovatelId, po]);
  if (!m) return null;
  const jedla = await vsetky(
    "SELECT den, poradie, nazov FROM menu_jedlo WHERE menu_id = $1", [m.id]);
  const podla = new Map(jedla.map(j => [`${j.den}|${j.poradie}`, j.nazov]));
  return { ...m, nazov: (den, poradie) => podla.get(`${den}|${poradie}`) ?? null };
}

/* ---------- obrazovka ---------- */

export async function zobraz(k) {
  const po = pondelok(k.url.searchParams.get("tyzden") || dnes());
  const jedalne = await vsetky("SELECT * FROM poskytovatel WHERE aktivny ORDER BY nazov");
  if (!jedalne.length)
    return k.html(k.odp, 200, stranka({
      titulok: "Menu", osoba: k.osoba, cesta: "/menu", verzia: k.verzia,
      obsah: `<section class="wrap"><div class="screen-head"><h2>Menu na týždeň</h2></div>
        <div class="card"><p style="margin:0">Zatiaľ nie je žiadna jedáleň.
        Založí sa v <a href="/ciselniky">Číselníkoch</a>.</p></div></section>`
    }));

  const vybrana = jedalne.find(j => j.id === Number(k.url.searchParams.get("jedalen"))) ?? jedalne[0];
  const m = await menuTyzdna(vybrana.id, po);
  const dni = dniTyzdna(po);
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");
  const smieMenit = k.osoba.je_admin;

  const odkaz = (t, popis) =>
    `<a class="btn" href="/menu?jedalen=${vybrana.id}&tyzden=${t}">${esc(popis)}</a>`;

  k.html(k.odp, 200, stranka({
    titulok: "Menu na týždeň", osoba: k.osoba, cesta: "/menu", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Menu na týždeň</h2>
    <span class="who">${esc(vybrana.nazov)}</span>
  </div>

  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  <div class="deadline">
    <span class="lbl">Týždeň</span>
    <span class="val">${tyzdenPopis(po)}</span>
    <span style="margin-left:auto" class="btn-row">
      ${odkaz(posunTyzden(po, -7), "← predchádzajúci")}
      ${odkaz(pondelok(dnes()), "tento týždeň")}
      ${odkaz(posunTyzden(po, 7), "nasledujúci →")}
    </span>
  </div>

  ${jedalne.length > 1 ? `<div class="btn-row" style="margin-bottom:18px">
    ${jedalne.map(j => `<a class="btn"${j.id === vybrana.id ? ' aria-pressed="true"' : ""}
      href="/menu?jedalen=${j.id}&tyzden=${po}">${esc(j.nazov)}</a>`).join("")}
  </div>` : ""}

  <form method="post" action="/menu" enctype="multipart/form-data" class="card">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <input type="hidden" name="jedalen" value="${vybrana.id}">
    <input type="hidden" name="tyzden" value="${po}">

    <div class="card-head"><h3>Jedálny lístok</h3></div>
    ${m?.priloha_nazov
      ? `<p style="margin:0 0 12px">Priložené:
          <a href="/menu/priloha?jedalen=${vybrana.id}&tyzden=${po}">${esc(m.priloha_nazov)}</a>
          <span class="hint">(${Math.round(m.priloha_velkost / 1024)} kB)</span></p>`
      : `<p class="hint" style="margin:0 0 12px">Zatiaľ bez prílohy.</p>`}
    ${smieMenit ? `
      <div class="field">
        <label for="p-priloha">Nahrať lístok (PDF alebo fotka)</label>
        <input type="file" id="p-priloha" name="priloha" accept=".pdf,image/*">
        <p class="hint">Nahratím sa nahradí ten predchádzajúci. Najviac 8 MB.</p>
      </div>` : ""}

    <div class="card-head" style="margin-top:22px"><h3>Názvy jedál</h3>
      <span class="hint">nepovinné</span></div>
    <div class="scroll-x"><table class="data menu-mriezka">
      <thead><tr><th></th>
        ${dni.map((d, i) => `<th>${DNI[i]}<span class="podriadok">${denMesiac(d)}</span></th>`).join("")}
      </tr></thead>
      <tbody>
        ${Array.from({ length: vybrana.pocet_jedal }, (_, poradie) => `<tr>
          <th class="oznak">${esc(oznacenie(vybrana.znacenie, poradie))}</th>
          ${dni.map((_, den) => `<td>
            <input type="text" name="j-${den}-${poradie}"
                   value="${esc(m?.nazov(den, poradie) ?? "")}"
                   ${smieMenit ? "" : "readonly"}
                   aria-label="${DNI[den]}, jedlo ${esc(oznacenie(vybrana.znacenie, poradie))}">
          </td>`).join("")}
        </tr>`).join("")}
      </tbody>
    </table></div>
    <p class="swipe-hint">Tabuľka sa posúva vbok</p>

    ${smieMenit ? `<div class="btn-row" style="margin-top:16px">
      <button class="btn primary" type="submit">Uložiť</button>
    </div>` : `<p class="hint" style="margin-top:16px">Menu zadáva správca.</p>`}

    <div class="note">
      <strong>Názvy sú nepovinné.</strong> Označenia jedál určuje jedáleň
      (${esc(vybrana.nazov)}: ${dni.length ? esc(Array.from({ length: vybrana.pocet_jedal },
        (_, i) => oznacenie(vybrana.znacenie, i)).join(" ")) : ""}), takže matica funguje aj
      bez nich. Vypĺňajú sa vtedy, keď stojí za to, aby predák nemusel otvárať prílohu.
    </div>
  </form>
</section>`
  }));
}

/* ---------- uloženie ---------- */

export async function uloz(k) {
  const po = pondelok(k.data.tyzden || dnes());
  const jedalenId = Number(k.data.jedalen);
  const spat = (kluc, t) =>
    k.inam(k.odp, `/menu?jedalen=${jedalenId}&tyzden=${po}&${kluc}=` + encodeURIComponent(t));

  const j = await jeden("SELECT * FROM poskytovatel WHERE id = $1", [jedalenId]);
  if (!j) return k.inam(k.odp, "/menu");

  const priloha = k.subory?.priloha;
  if (priloha) {
    if (priloha.data.length > LIMIT_PRILOHY) return spat("chyba", "Príloha má viac než 8 MB.");
    if (priloha.typ && !POVOLENE.includes(priloha.typ.split(";")[0].trim()))
      return spat("chyba", `Typ ${priloha.typ} sa nedá priložiť. Použite PDF alebo fotku.`);
  }

  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    const m = (await klient.query(
      `INSERT INTO menu_tyzden (poskytovatel_id, pondelok) VALUES ($1,$2)
       ON CONFLICT (poskytovatel_id, pondelok) DO UPDATE SET pondelok = EXCLUDED.pondelok
       RETURNING id`, [jedalenId, po])).rows[0];

    if (priloha)
      await klient.query(
        "UPDATE menu_tyzden SET priloha_nazov = $2, priloha_typ = $3, priloha_data = $4 WHERE id = $1",
        [m.id, priloha.nazov, priloha.typ ?? "application/octet-stream", priloha.data]);

    /* Názvy sa prepíšu nanovo — je ich najviac dvadsaťpäť a rozlišovať,
       ktorý sa zmenil, by bolo viac kódu než úžitku. */
    await klient.query("DELETE FROM menu_jedlo WHERE menu_id = $1", [m.id]);
    let kolko = 0;
    for (let den = 0; den < 5; den++)
      for (let poradie = 0; poradie < j.pocet_jedal; poradie++) {
        const nazov = (k.data[`j-${den}-${poradie}`] ?? "").trim();
        if (!nazov) continue;
        await klient.query(
          "INSERT INTO menu_jedlo (menu_id, den, poradie, nazov) VALUES ($1,$2,$3,$4)",
          [m.id, den, poradie, nazov]);
        kolko++;
      }
    await klient.query("COMMIT");
    await zapis(k.osoba.id, "menu.ulozene",
                { jedalen: j.nazov, tyzden: po, nazvov: kolko, priloha: priloha?.nazov ?? null });

    const casti = [];
    if (priloha) casti.push(`príloha ${priloha.nazov}`);
    casti.push(mnoho(kolko, ["názov jedla", "názvy jedál", "názvov jedál"]));
    return spat("sprava", `Uložené: ${casti.join(", ")}.`);
  } catch (e) {
    await klient.query("ROLLBACK");
    return spat("chyba", "Neuložilo sa nič: " + e.message);
  } finally {
    klient.release();
  }
}

/* ---------- príloha ---------- */

export async function priloha(k) {
  const po = pondelok(k.url.searchParams.get("tyzden") || dnes());
  const jedalenId = Number(k.url.searchParams.get("jedalen"));
  const m = await jeden(
    `SELECT priloha_nazov, priloha_typ, priloha_data FROM menu_tyzden
      WHERE poskytovatel_id = $1 AND pondelok = $2`, [jedalenId, po]);
  if (!m?.priloha_data) return k.inam(k.odp, "/menu");

  /* Príloha prichádza od dodávateľa, teda zvonku. Prehliadač ju preto
     nesmie zobraziť ako stránku na našej doméne — inak by sa cez podvrhnuté
     „PDF" dalo spustiť čokoľvek v mene prihláseného používateľa. */
  k.odp.writeHead(200, {
    "content-type": m.priloha_typ ?? "application/octet-stream",
    "content-length": m.priloha_data.length,
    "content-disposition": `inline; filename="${m.priloha_nazov.replace(/["\\]/g, "")}"`,
    "content-security-policy": "sandbox; default-src 'none'",
    "x-content-type-options": "nosniff",
    "cache-control": "private, max-age=300"
  });
  k.odp.end(m.priloha_data);
}
