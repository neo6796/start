/* Tímy.

   Tím je entita, nie vlastnosť človeka (koncept 1.2). Preto sa tu nastavuje
   oboje naraz: kto tím vedie a kto v ňom je. Doteraz to bolo rozdelené —
   predák v Číselníkoch, ľudia po jednom v karte stravníka — a poskladať si
   z toho, ako tím vyzerá, vedel len ten, kto vedel, kam sa pozrieť.

   Predákov môže mať tím viac (predák a zástupca) a jeden človek môže viesť
   viac tímov. Práva majú rovnaké; zástupca je informácia o tom, koho sa
   pýtať ako prvého, nie iná rola. Predákom je človek presne dovtedy, kým je
   pri nejakom tíme zapísaný — nikde sa to nedrží zvlášť, tak sa to nemá ako
   rozísť so skutočnosťou. */

import { stranka, esc, mnoho } from "./html.js";
import { bazen, dopyt, jeden, vsetky, zapis } from "./db.js";

async function nacitaj() {
  const timy = await vsetky("SELECT * FROM tim ORDER BY aktivny DESC, nazov");
  const ludia = await vsetky(`
    SELECT id, priezvisko, meno, kod_dochadzka, tim_id, je_admin
      FROM osoba WHERE aktivny ORDER BY priezvisko, meno`);
  /* Poradie podľa priezviska, nie podľa toho, kto je zástupca. Keď sa triedilo
     podľa roly, označenie zástupcu človeka preplo naspodok zoznamu — odškrtol
     si políčko a mená sa ti pod rukou premiešali. */
  const predaci = new Map();
  for (const r of await vsetky(`
    SELECT tp.tim_id, tp.osoba_id, tp.zastupca, o.priezvisko, o.meno, o.kod_dochadzka
      FROM tim_predak tp JOIN osoba o ON o.id = tp.osoba_id
     ORDER BY o.priezvisko, o.meno`)) {
    if (!predaci.has(r.tim_id)) predaci.set(r.tim_id, []);
    predaci.get(r.tim_id).push(r);
  }
  return { timy, ludia, predaci };
}

/* Krátky prehľad na obrazovku Ľudia — kto tím vedie a koľkých má. */
export async function prehlad() {
  const { timy, ludia, predaci } = await nacitaj();
  const aktivne = timy.filter(t => t.aktivny);
  if (!aktivne.length)
    return `<div class="card"><div class="card-head"><h3>Tímy</h3></div>
      <p class="hint" style="margin:0">Zatiaľ žiadny tím. Tím určuje, kto za koho
      objednáva — založí sa v <a href="/timy">Tímoch</a>.</p></div>`;

  const bezTimu = ludia.filter(o => !o.tim_id).length;
  return `<div class="card">
    <div class="card-head"><h3>Tímy</h3>
      <span class="hint">${mnoho(aktivne.length, ["tím", "tímy", "tímov"])}</span>
      <a class="btn" href="/timy" style="margin-left:auto">Spravovať tímy</a></div>
    <div class="scroll-x"><table class="data">
      <thead><tr><th>Tím</th><th>Vedie</th><th class="num">Ľudí</th></tr></thead>
      <tbody>${aktivne.map(t => {
        const p = predaci.get(t.id) ?? [];
        const kolko = ludia.filter(o => o.tim_id === t.id).length;
        return `<tr>
          <td><a href="/timy#tim-${t.id}">${esc(t.nazov)}</a></td>
          <td>${p.length
            ? p.map(x => `${esc(x.priezvisko)} ${esc(x.meno)}${
                x.zastupca ? ' <span class="hint">(zástupca)</span>' : ""}`).join(" · ")
            : '<span class="hint">nikto — matica tohto tímu sa nikomu neukáže</span>'}</td>
          <td class="num">${kolko || '<span class="hint">0</span>'}</td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>
    ${bezTimu ? `<p class="hint" style="margin:12px 0 0">Bez tímu:
      ${mnoho(bezTimu, ["človek", "ľudia", "ľudí"])} — za nich neobjednáva nikto.
      <a href="/ludia?pohlad=bez-zaradenia">Zobraziť</a></p>` : ""}
  </div>`;
}

/* ---------- obrazovka ---------- */

export async function zoznam(k) {
  const { timy, ludia, predaci } = await nacitaj();
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");
  const otvor = Number(k.url.searchParams.get("otvor"));

  const karta = t => {
    const moji = ludia.filter(o => o.tim_id === t.id);
    const vedu = predaci.get(t.id) ?? [];
    const voľní = ludia.filter(o => !vedu.some(v => v.osoba_id === o.id));

    return `
<div class="card" id="tim-${t.id}">
  <div class="card-head">
    <h3>${esc(t.nazov)}</h3>
    <span class="hint">${mnoho(moji.length, ["človek", "ľudia", "ľudí"])}${
      t.aktivny ? "" : " · neaktívny"}</span>
    <form method="post" action="/timy/stav" class="riadok-akcia" style="margin-left:auto">
      <input type="hidden" name="znamka" value="${esc(k.csrf)}">
      <input type="hidden" name="id" value="${t.id}">
      <input type="hidden" name="na" value="${t.aktivny ? "0" : "1"}">
      <button class="btn" type="submit">${t.aktivny ? "Zneaktívniť" : "Obnoviť"}</button>
    </form>
  </div>

  <form method="post" action="/timy/uloz">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <input type="hidden" name="id" value="${t.id}">

    <div class="field" style="max-width:380px">
      <label for="t-nazov-${t.id}">Názov</label>
      <input type="text" id="t-nazov-${t.id}" name="nazov" value="${esc(t.nazov)}" required>
    </div>

    <div class="card-head" style="margin-top:18px"><h3>Kto tím vedie</h3>
      <span class="hint">predák objednáva za celý tím</span></div>
    ${vedu.length ? `
    <div class="scroll-x"><table class="data vedenie">
      <thead><tr><th>Priezvisko a meno</th><th>Osobné číslo</th>
        <th>Rola</th><th>Odobrať</th></tr></thead>
      <tbody>${vedu.map(v => `<tr>
        <td>${esc(v.priezvisko)} ${esc(v.meno)}</td>
        <td class="num">${esc(v.kod_dochadzka ?? "—")}</td>
        <td class="rola">
          <input type="hidden" name="vedie" value="${v.osoba_id}">
          <label class="check"><input type="radio" name="rola-${v.osoba_id}" value="predak"${
            v.zastupca ? "" : " checked"}><span>predák</span></label>
          <label class="check"><input type="radio" name="rola-${v.osoba_id}" value="zastupca"${
            v.zastupca ? " checked" : ""}><span>zástupca</span></label>
        </td>
        <td class="tick"><label class="check">
          <input type="checkbox" name="odobrat" value="${v.osoba_id}"
                 aria-label="Odobrať ${esc(v.priezvisko)} ${esc(v.meno)} z vedenia tímu"></label></td>
      </tr>`).join("")}</tbody>
    </table></div>
    <p class="hint" style="margin:10px 0 0">Zástupca má tie isté práva; rozdiel je
      v tom, koho sa pýtať ako prvého — preto aspoň jeden musí ostať predákom.
      Odobratie z vedenia človeka z tímu nevyhodí, len prestane zaň objednávať.</p>
    ` : `<div class="warnbox">Tím nikto nevedie — jeho matica sa nikomu neukáže
      a za týchto ľudí neobjedná nikto.</div>`}

    <div class="field" style="max-width:380px;margin-top:12px">
      <label for="t-novy-${t.id}">Pridať predáka</label>
      <select id="t-novy-${t.id}" name="novy_predak">
        <option value="">—</option>
        ${voľní.map(o => `<option value="${o.id}">${esc(o.priezvisko)} ${esc(o.meno)}</option>`).join("")}
      </select>
      <p class="hint">Predák nemusí byť členom tímu a môže viesť aj viac tímov.</p>
    </div>

    <div class="card-head" style="margin-top:22px"><h3>Kto je v tíme</h3>
      <span class="hint">zaškrtnite všetkých, ktorí doň patria</span></div>
    <div class="scroll-x" style="max-height:340px;overflow-y:auto">
      <table class="data">
        <thead><tr><th class="chk"></th><th>Priezvisko a meno</th>
          <th>Osobné číslo</th><th>Teraz v tíme</th></tr></thead>
        <tbody>${ludia.map(o => `<tr>
          <td class="chk"><label class="check">
            <input type="checkbox" name="clen" value="${o.id}"${o.tim_id === t.id ? " checked" : ""}
              aria-label="${esc(o.priezvisko)} ${esc(o.meno)}"></label></td>
          <td>${esc(o.priezvisko)} ${esc(o.meno)}</td>
          <td class="num">${esc(o.kod_dochadzka ?? "—")}</td>
          <td>${o.tim_id === t.id
            ? '<span class="hint">v tomto</span>'
            : o.tim_id
            ? `<span class="badge">${esc(timy.find(x => x.id === o.tim_id)?.nazov ?? "iný")}</span>`
            : '<span class="hint">bez tímu</span>'}</td>
        </tr>`).join("")}</tbody>
      </table>
    </div>
    <p class="hint" style="margin:10px 0 0">Kto je zaškrtnutý a patrí inam, sa sem presunie —
      človek je vždy len v jednom tíme.</p>

    <div class="btn-row" style="margin-top:16px">
      <button class="btn primary" type="submit">Uložiť ${esc(t.nazov)}</button>
    </div>
  </form>

  ${moji.length + vedu.length === 0 ? `
    <details style="margin-top:18px">
      <summary class="btn">Naozaj zmazať</summary>
      <form method="post" action="/timy/zmazat" style="margin-top:14px">
        <input type="hidden" name="znamka" value="${esc(k.csrf)}">
        <input type="hidden" name="id" value="${t.id}">
        <p style="margin:0 0 12px">Na tento tím nič neukazuje — nikto v ňom nie je a nikto
          ho nevedie — takže po ňom neostane diera. Typicky ide o preklep pri zakladaní.
          Zmazať <strong>${esc(t.nazov)}</strong>? Späť sa to vrátiť nedá.</p>
        <button class="btn primary" type="submit">Zmazať natrvalo</button>
      </form>
    </details>` : `
    <p class="hint" style="margin:18px 0 0">Zmazať sa nedá — ukazuje naň
      <strong>${mnoho(moji.length + vedu.length, ["záznam", "záznamy", "záznamov"])}</strong>.
      Tím, ktorý sa prestal používať, sa <em>zneaktívni</em> — prestane sa ponúkať,
      ale minulé objednávky ostanú čitateľné.</p>`}
</div>`;
  };

  k.html(k.odp, 200, stranka({
    titulok: "Tímy", osoba: k.osoba, cesta: "/timy", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Tímy</h2>
    <span class="who">${mnoho(timy.length, ["tím", "tímy", "tímov"])}</span>
  </div>
  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  <div class="card">
    <div class="card-head"><h3>Pridať tím</h3></div>
    <form method="post" action="/timy/pridat" class="pridat" style="max-width:420px">
      <input type="hidden" name="znamka" value="${esc(k.csrf)}">
      <div class="field"><label for="t-novy">Názov</label>
        <input type="text" id="t-novy" name="nazov" required></div>
      <button class="btn primary" type="submit">Uložiť</button>
    </form>
  </div>

  ${timy.map(karta).join("")}

  <div class="note">
    <strong>Predák je funkcia tímu, nie vlastnosť človeka.</strong> Kto vedie aspoň
    jeden tím, vidí obrazovku Môj tím a objednáva zaň; kto prestane viesť, ju stratí.
    Netreba to nikde odškrtávať zvlášť — a preto sa to ani nemá ako rozísť.
  </div>
</section>`
  }));
  if (otvor) { /* kotva #tim-N v adrese stačí; toto je len pre čitateľnosť volania */ }
}

/* ---------- zmeny ---------- */

export async function pridat(k) {
  const nazov = (k.data.nazov ?? "").trim();
  if (!nazov) return k.inam(k.odp, "/timy?chyba=" + encodeURIComponent("Názov treba vyplniť."));
  try {
    const r = await jeden("INSERT INTO tim (nazov) VALUES ($1) RETURNING id", [nazov]);
    await zapis(k.osoba.id, "tim.pridany", { nazov });
    return k.inam(k.odp, `/timy?sprava=${encodeURIComponent(`Tím ${nazov} je založený.`)}#tim-${r.id}`);
  } catch (e) {
    return k.inam(k.odp, "/timy?chyba=" + encodeURIComponent(
      e.code === "23505" ? `Tím ${nazov} už existuje.` : e.message));
  }
}

export async function stav(k) {
  const id = Number(k.data.id);
  await dopyt("UPDATE tim SET aktivny = $2 WHERE id = $1", [id, k.data.na === "1"]);
  await zapis(k.osoba.id, "tim.stav", { id, na: k.data.na });
  return k.inam(k.odp, "/timy?sprava=" + encodeURIComponent("Uložené."));
}

/* Kontrola sa robí znova tu. Tlačidlo na stránke je pohodlie, nie záruka —
   medzi zobrazením a kliknutím mohol niekto do tímu niekoho pridať, a formulár
   sa dá poslať aj bez toho tlačidla. */
export async function zmazat(k) {
  const id = Number(k.data.id);
  const t = await jeden("SELECT nazov FROM tim WHERE id = $1", [id]);
  if (!t) return k.inam(k.odp, "/timy");

  const p = await jeden(`
    SELECT (SELECT count(*) FROM osoba WHERE tim_id = $1)
         + (SELECT count(*) FROM tim_predak WHERE tim_id = $1) AS n`, [id]);
  if (Number(p.n) > 0)
    return k.inam(k.odp, `/timy?chyba=` + encodeURIComponent(
      `Medzitým na tím ${t.nazov} niečo ukázalo (${p.n}). Nezmazalo sa nič — použite Zneaktívniť.`));

  try {
    await dopyt("DELETE FROM tim WHERE id = $1", [id]);
  } catch (e) {
    /* Poistka na to, čo počítadlo nepokrýva: cudzí kľúč z databázy. */
    return k.inam(k.odp, "/timy?chyba=" + encodeURIComponent(
      "Databáza mazanie odmietla — na tím niečo ukazuje. Použite Zneaktívniť."));
  }
  await zapis(k.osoba.id, "tim.zmazany", { id, nazov: t.nazov });
  return k.inam(k.odp, "/timy?sprava=" + encodeURIComponent(`Zmazané: ${t.nazov}.`));
}

export async function uloz(k) {
  const id = Number(k.data.id);
  const t = await jeden("SELECT * FROM tim WHERE id = $1", [id]);
  if (!t) return k.inam(k.odp, "/timy?chyba=" + encodeURIComponent("Taký tím tu nie je."));
  const spat = (kluc, text) => k.inam(k.odp, `/timy?${kluc}=${encodeURIComponent(text)}#tim-${id}`);

  const nazov = (k.data.nazov ?? "").trim();
  if (!nazov) return spat("chyba", "Názov treba vyplniť.");

  const cisla = v => [].concat(k.data[v] ?? []).map(Number).filter(Number.isInteger);
  const clenovia = cisla("clen");

  /* Vedenie sa mení cielene, nie prepísaním celého zoznamu. Odobrať niekoho
     sa dá len tým, že sa to naozaj zaškrtne — nie ako vedľajší účinok toho,
     že políčko pri mene ostalo prázdne. Zároveň to znamená, že formulár
     z medzitým zastaranej stránky nezhodí predáka, o ktorom nevie. */
  const odobrat = new Set(cisla("odobrat"));
  const vedie = cisla("vedie").filter(x => !odobrat.has(x));
  const novy = Number(k.data.novy_predak);
  if (Number.isInteger(novy) && novy > 0 && !vedie.includes(novy)) vedie.push(novy);
  /* Novo pridaný predák nemá políčko roly — a zástupca bez predáka nedáva
     zmysel, tak začína ako predák. */
  const jeZastupca = osobaId => k.data[`rola-${osobaId}`] === "zastupca";

  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    await klient.query("UPDATE tim SET nazov = $2 WHERE id = $1", [id, nazov]);

    /* Členstvo: kto je zaškrtnutý, patrí sem; kto tu bol a zaškrtnutý nie je,
       ostáva bez tímu. Do iného tímu ho appka sama nepresunie — to by bola
       zmena, o ktorú nikto nežiadal. */
    await klient.query(
      "UPDATE osoba SET tim_id = NULL WHERE tim_id = $1 AND NOT (id = ANY($2::int[]))",
      [id, clenovia]);
    if (clenovia.length)
      await klient.query("UPDATE osoba SET tim_id = $1 WHERE id = ANY($2::int[])", [id, clenovia]);

    if (odobrat.size)
      await klient.query(
        "DELETE FROM tim_predak WHERE tim_id = $1 AND osoba_id = ANY($2::int[])",
        [id, [...odobrat]]);

    for (const osobaId of vedie)
      await klient.query(
        `INSERT INTO tim_predak (tim_id, osoba_id, zastupca, pridal_id)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (tim_id, osoba_id) DO UPDATE SET zastupca = EXCLUDED.zastupca`,
        [id, osobaId, jeZastupca(osobaId), k.osoba.id]);

    /* Zástupca zastupuje predáka. Tím, kde sú samí zástupcovia, je stav, ktorý
       nič neznamená — a vzniká ľahko, lebo označiť zástupcu je jedno kliknutie.
       Kontroluje sa to na výslednom stave, nie na formulári: len ten hovorí
       pravdu aj vtedy, keď medzitým niekto pridal predáka inde. */
    const { rows: [p] } = await klient.query(`
      SELECT count(*)::int AS spolu,
             count(*) FILTER (WHERE NOT zastupca)::int AS hlavnych
        FROM tim_predak WHERE tim_id = $1`, [id]);
    if (p.spolu > 0 && p.hlavnych === 0) {
      await klient.query("ROLLBACK");
      klient.release();
      return spat("chyba", "Zástupca zastupuje predáka, takže aspoň jeden musí ostať " +
        "predákom. Neuložilo sa nič — ak majú byť rovnocenní, nechajte oboch ako predákov.");
    }

    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    return spat("chyba", e.code === "23505" ? `Tím ${nazov} už existuje.` : "Neuložilo sa nič: " + e.message);
  }
  klient.release();

  await zapis(k.osoba.id, "tim.ulozeny",
              { id, nazov, clenov: clenovia.length, vedie: vedie.length, odobranych: odobrat.size });
  const casti = [`${mnoho(clenovia.length, ["človek", "ľudia", "ľudí"])}`];
  if (vedie.length) casti.push(`vedie ${mnoho(vedie.length, ["predák", "predáci", "predákov"])}`);
  if (odobrat.size) casti.push(`${mnoho(odobrat.size, ["predák odobraný", "predáci odobraní", "predákov odobraných"])}`);
  return spat("sprava", `${nazov}: ${casti.join(", ")}.`);
}
