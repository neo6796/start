/* Číselníky — firmy, prevádzky, tímy, jedálne.

   Nič sa nemaže. Položka sa dá len zneaktívniť: v uzavretých mesiacoch na ňu
   ukazujú objednávky a zmazaním by sa minulosť prepísala (koncept 6.1).
   Upraviť sa dá čokoľvek — cenník, e-mail aj preklep v názve. */

import { stranka, esc, mnoho } from "./html.js";
import { dopyt, jeden, vsetky, zapis } from "./db.js";

const eur = v => Number(v).toFixed(2).replace(".", ",") + " €";

/* Čo sa dá zakladať a meniť. Jedna tabuľka pravidiel namiesto štyroch
   takmer rovnakých obsluh. */
const DRUHY = {
  firma: {
    tabulka: "firma", nazov: "Firmy", jednotne: "firma", stav: "aktivna",
    pouzitie: ["SELECT count(*)::int AS n FROM osoba WHERE firma_id = $1", "ľudí"],
    prazdne: "Zatiaľ žiadna firma. Zakladá sa ako prvá — bez nej sa nedá zaradiť človek.",
    polia: [["nazov", "Názov", "text", true]]
  },
  prevadzka: {
    tabulka: "prevadzka", nazov: "Prevádzky", jednotne: "prevádzka", stav: "aktivna",
    pouzitie: ["SELECT count(*)::int AS n FROM osoba WHERE prevadzka_id = $1", "ľudí"],
    prazdne: "Zatiaľ žiadna prevádzka.",
    polia: [["nazov", "Názov", "text", true], ["skratka", "Skratka", "text", true]]
  },
  /* Tím nesie predáka (koncept 1.2: „Tím = entita s prideleným predákom,
     nie pole »nadriadený« na osobe"). Keby predák visel na každom človeku
     zvlášť, dvaja ľudia v tom istom tíme by mohli mať dvoch rôznych — stav,
     ktorý nič neznamená a v matici sa nedá rozhodnúť. */
  tim: {
    tabulka: "tim", nazov: "Tímy", jednotne: "tím", stav: "aktivny",
    pouzitie: ["SELECT count(*)::int AS n FROM osoba WHERE tim_id = $1", "ľudí"],
    prazdne: "Zatiaľ žiadny tím. Tím určuje, kto za koho objednáva.",
    polia: [["nazov", "Názov", "text", true],
            ["predak_id", "Predák", "predak", false, null, "smie byť prázdne"]]
  },
  jedalen: {
    tabulka: "poskytovatel", nazov: "Jedálne", jednotne: "jedáleň", stav: "aktivny",
    pouzitie: [`SELECT (SELECT count(*) FROM osoba WHERE poskytovatel_id = $1)
                     + (SELECT count(*) FROM osoba_jedalen WHERE poskytovatel_id = $1)
                     + (SELECT count(*) FROM objednavka WHERE poskytovatel_id = $1)
                     + (SELECT count(*) FROM menu_tyzden WHERE poskytovatel_id = $1)
                     + (SELECT count(*) FROM odoslanie WHERE poskytovatel_id = $1) AS n`,
               "väzieb — ľudia, objednávky, menu alebo odoslané objednávky"],
    prazdne: "Zatiaľ žiadna jedáleň. Bez nej niet z čoho vyberať ani komu poslať objednávku.",
    polia: [
      ["nazov", "Názov", "text", true],
      ["cena_s_dph", "Cena s DPH", "cislo", true],
      ["sadzba_dph", "Sadzba DPH %", "cislo", false],
      ["pocet_jedal", "Počet jedál", "cislo", false],
      ["znacenie", "Značenie", "vyber", false,
        [["arabic", "čísla 1–5"], ["upper", "písmená A–E"], ["lower", "písmená a–e"], ["roman", "I–V"]]],
      ["model", "Model rozúčtovania", "vyber", false,
        [["eko", "ekonomický"], ["std", "štandardný"]]],
      ["odhlasenie_do", "Odhlásenie do", "cas", false],
      ["email", "E-mail na objednávky", "text", false, null, "smie byť prázdne"],
      ["telefon", "Telefón", "text", false, null, "smie byť prázdne"]
    ]
  }
};

/* Identifikátor nesie aj druh číselníka a účel formulára. Na stránke je päť
   formulárov a väčšina má pole „Názov" — bez rozlíšenia by všetky popisky
   ukazovali na to prvé a kliknutie na „Názov" pri tímoch by skočilo do firiem. */
function pole(predpona, [kluc, popis, druh, povinne, moznosti], hodnota, kontext) {
  const id = `p-${predpona}-${kluc}`;
  const spolocne = `id="${id}" name="${kluc}"${povinne ? " required" : ""}`;
  const v = hodnota ?? "";
  let vstup;
  if (druh === "vyber") {
    vstup = `<select ${spolocne}>${moznosti.map(([m, t]) =>
      `<option value="${esc(m)}"${String(v) === m ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  } else if (druh === "predak") {
    const zoznam = kontext?.predaci ?? [];
    vstup = `<select ${spolocne}>
      <option value="">—</option>
      ${zoznam.map(o => `<option value="${o.id}"${Number(v) === o.id ? " selected" : ""}>${esc(o.nazov)}</option>`).join("")}
    </select>`;
  } else if (druh === "cislo") {
    vstup = `<input type="number" step="0.01" min="0" ${spolocne} value="${esc(v)}">`;
  } else if (druh === "cas") {
    vstup = `<input type="time" ${spolocne} value="${esc(String(v).slice(0, 5))}">`;
  } else {
    vstup = `<input type="text" ${spolocne} value="${esc(v)}">`;
  }
  let pod = "";
  if (druh === "predak" && !(kontext?.predaci ?? []).length)
    pod = `<p class="hint">Zatiaľ nie je koho vybrať. Predák je stravník s príznakom —
           najprv ho označ v <a href="/ludia">Ľuďoch</a>.</p>`;
  return `<div class="field"><label for="${id}">${esc(popis)}</label>${vstup}${pod}</div>`;
}

function bunka([kluc, , dr, , moz], r, kontext) {
  let v = r[kluc];
  if (dr === "predak") v = r.predak_meno;
  if (v === null || v === undefined || v === "") return "—";
  if (kluc === "cena_s_dph") return eur(v);
  if (dr === "cas") return String(v).slice(0, 5);
  if (dr === "vyber") return (moz.find(m => m[0] === String(v)) ?? [, v])[1];
  return v;
}

/* Zložený tím sa zbalí do počtu; rozklikne sa, keď treba vidieť mená.
   Kto je neaktívny, je označený — v tíme ostáva, ale neobjednáva sa preň. */
function clenoviaBunka(ludia) {
  if (!ludia.length) return '<span class="hint">nikto</span>';
  return `<details class="clenovia">
    <summary class="btn">${mnoho(ludia.length, ["človek", "ľudia", "ľudí"])}</summary>
    <ul class="zoznam-clenov">
      ${ludia.map(o => `<li${o.aktivny ? "" : ' class="is-off"'}>${esc(o.meno)}
        <span class="hint">${esc(o.kod_dochadzka ?? "—")}${o.aktivny ? "" : " · neaktívny"}</span></li>`).join("")}
    </ul>
  </details>`;
}

function karta(druh, d, riadky, k, otvorene, kontext) {
  return `
<div class="card">
  <div class="card-head">
    <h3>${esc(d.nazov)}</h3>
    <span class="hint">${riadky.length}</span>
  </div>
  ${riadky.length === 0
    ? `<p class="hint" style="margin:0 0 14px">${esc(d.prazdne)}</p>`
    : `<div class="scroll-x"><table class="data">
        <thead><tr>${d.polia.map(p => `<th>${esc(p[1])}</th>`).join("")}
          ${druh === "tim" ? "<th>Ľudia</th>" : ""}<th>Stav</th><th></th></tr></thead>
        <tbody>${riadky.map(r => `<tr${r[d.stav] ? "" : ' class="is-off"'}>
          ${d.polia.map(p => `<td>${esc(bunka(p, r, kontext))}</td>`).join("")}
          ${druh === "tim" ? `<td>${clenoviaBunka(kontext.clenovia?.get(r.id) ?? [])}</td>` : ""}
          <td>${r[d.stav] ? "aktívna" : "neaktívna"}</td>
          <td class="akcie">
            <a class="btn" href="/ciselnik?druh=${esc(druh)}&id=${r.id}">Upraviť</a>
            <form method="post" action="/ciselniky/stav" class="riadok-akcia">
              <input type="hidden" name="znamka" value="${esc(k.csrf)}">
              <input type="hidden" name="druh" value="${esc(druh)}">
              <input type="hidden" name="id" value="${r.id}">
              <input type="hidden" name="na" value="${r[d.stav] ? "0" : "1"}">
              <button class="btn" type="submit">${r[d.stav] ? "Zneaktívniť" : "Obnoviť"}</button>
            </form>
          </td>
        </tr>`).join("")}</tbody>
       </table></div>`}

  <details${otvorene === druh ? " open" : ""}>
    <summary class="btn" style="display:inline-block;margin-top:4px">Pridať ${esc(d.jednotne)}</summary>
    <form method="post" action="/ciselniky/pridat" class="pridat" style="margin-top:14px;max-width:420px">
      <input type="hidden" name="znamka" value="${esc(k.csrf)}">
      <input type="hidden" name="druh" value="${esc(druh)}">
      ${d.polia.map(p => pole(druh, p, "", kontext)).join("")}
      <button class="btn primary" type="submit">Uložiť</button>
    </form>
  </details>
</div>`;
}

/* Koľko vecí na položku ukazuje. Nula znamená, že sa dá zmazať bez toho,
   aby po nej ostala diera. */
async function pocetPouziti(d, id) {
  const r = await jeden(d.pouzitie[0], [id]);
  return Number(r?.n ?? 0);
}

/* Predáci sa ponúkajú pri tímoch, tak ich načítame raz pre celú stránku.
   Spolu s nimi aj zloženie tímov: predák je v jednom stĺpci, ľudia v druhom,
   takže sa dá na jednej obrazovke skontrolovať, či je každý niekde zaradený
   a či má ten tím koho vedie. Inak by sa to dalo zistiť len prechádzaním
   zoznamu ľudí s filtrom po jednom tíme. */
async function kontextUdajov() {
  const predaci = await vsetky(
    "SELECT id, priezvisko || ' ' || meno AS nazov FROM osoba WHERE aktivny AND je_predak ORDER BY priezvisko");

  const clenovia = new Map();
  for (const r of await vsetky(`
    SELECT tim_id, priezvisko || ' ' || meno AS meno, kod_dochadzka, aktivny
      FROM osoba WHERE tim_id IS NOT NULL
     ORDER BY aktivny DESC, priezvisko, meno`)) {
    if (!clenovia.has(r.tim_id)) clenovia.set(r.tim_id, []);
    clenovia.get(r.tim_id).push(r);
  }
  return { predaci, clenovia };
}

function dotaz(d) {
  if (d.tabulka === "tim")
    return `SELECT t.*, p.priezvisko || ' ' || p.meno AS predak_meno
              FROM tim t LEFT JOIN osoba p ON p.id = t.predak_id
             ORDER BY t.aktivny DESC, t.nazov`;
  return `SELECT * FROM ${d.tabulka} ORDER BY ${d.stav} DESC, nazov`;
}

export async function zoznam(k) {
  const kontext = await kontextUdajov();
  const data = {};
  for (const [druh, d] of Object.entries(DRUHY)) data[druh] = await vsetky(dotaz(d));

  const chyba = k.url.searchParams.get("chyba");
  const sprava = k.url.searchParams.get("sprava");
  const otvorene = k.url.searchParams.get("otvor");

  k.html(k.odp, 200, stranka({
    titulok: "Číselníky", osoba: k.osoba, cesta: "/ciselniky", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Číselníky</h2>
    <span class="who">firmy · prevádzky · tímy · jedálne</span>
  </div>
  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}
  ${Object.entries(DRUHY).map(([druh, d]) => karta(druh, d, data[druh], k, otvorene, kontext)).join("")}
  <div class="card">
    <div class="card-head"><h3>Prečo sa nič nemaže</h3></div>
    <p class="hint" style="margin:0">Na uzavreté mesiace ukazujú objednávky s odfotenou cenou.
      Zmazaná jedáleň by z nich spravila riadky bez pôvodu. Zneaktívnená sa neponúka pri
      novej objednávke, ale minulosť ostáva čitateľná. Upraviť sa dá všetko — nová cena
      platí odteraz a odfotené objednávky neprepíše.</p>
  </div>
</section>`
  }));
}

/* Prevedie hodnoty z formulára na stĺpce a hodnoty do SQL.
   Vracia buď { stlpce, hodnoty }, alebo { chyba }. */
function zoberPolia(d, data, iba = null) {
  const stlpce = [], hodnoty = [];
  for (const [kluc, popis, druh, povinne, , smiePrazdne] of d.polia) {
    let v = (data[kluc] ?? "").trim();
    if (!v) {
      if (povinne) return { chyba: `${popis} treba vyplniť.` };
      /* Pri zakladaní necháme prázdne pole na predvolenej hodnote z databázy.
         Pri úprave to nejde: hodnota tam už je a nechať ju „ako je" by
         znamenalo, že sa vymazať nedá. Preto sa prázdne pole zapíše ako
         prázdne — ale len tam, kde to databáza dovolí. */
      if (iba === "pridat") continue;
      if (!smiePrazdne) return { chyba: `${popis} sa nedá vymazať — vyplňte hodnotu.` };
      stlpce.push(kluc); hodnoty.push(null);
      continue;
    }
    if (druh === "cislo") {
      v = Number(v.replace(",", "."));
      if (!Number.isFinite(v) || v < 0) return { chyba: `${popis}: „${data[kluc]}" nie je číslo.` };
    }
    if (druh === "predak") v = Number(v);
    stlpce.push(kluc); hodnoty.push(v);
  }
  return { stlpce, hodnoty };
}

export async function pridat(k) {
  const d = DRUHY[k.data.druh];
  if (!d) return k.inam(k.odp, "/ciselniky");
  const spat = t => k.inam(k.odp, `/ciselniky?otvor=${k.data.druh}&chyba=` + encodeURIComponent(t));

  const v = zoberPolia(d, k.data, "pridat");
  if (v.chyba) return spat(v.chyba);

  try {
    const r = await jeden(
      `INSERT INTO ${d.tabulka} (${v.stlpce.join(",")})
       VALUES (${v.stlpce.map((_, i) => `$${i + 1}`).join(",")}) RETURNING id, nazov`, v.hodnoty);
    await zapis(k.osoba.id, "ciselnik.pridane", { druh: k.data.druh, id: r.id, nazov: r.nazov });
    k.inam(k.odp, "/ciselniky?sprava=" + encodeURIComponent(`Pridané: ${r.nazov}.`));
  } catch (e) {
    spat(e.code === "23505"
      ? `${d.jednotne} s názvom „${k.data.nazov}" už existuje.`
      : `Nepodarilo sa uložiť: ${e.message}`);
  }
}

/* ---------- úprava jednej položky ---------- */

export async function detail(k) {
  const druh = k.url.searchParams.get("druh");
  const d = DRUHY[druh];
  if (!d) return k.inam(k.odp, "/ciselniky");

  const r = await jeden(`SELECT * FROM ${d.tabulka} WHERE id = $1`, [Number(k.url.searchParams.get("id"))]);
  if (!r) return k.inam(k.odp, "/ciselniky?chyba=" + encodeURIComponent("Taká položka tu nie je."));

  const kontext = await kontextUdajov();
  const pouzitie = await pocetPouziti(d, r.id);
  const chyba = k.url.searchParams.get("chyba");
  const sprava = k.url.searchParams.get("sprava");

  /* Kde všade sa hodnota používa — nech je vidieť, čoho sa zmena dotkne. */
  const kdeSaPouziva = {
    firma: "Delí peniaze. Premenovanie je bezpečné, prejaví sa aj na uzavretých mesiacoch.",
    prevadzka: "Určuje, kam sa vezie jedlo.",
    tim: "Určuje, kto za koho objednáva. Zmena predáka platí od najbližšej objednávky.",
    jedalen: "Nová cena platí odteraz. Objednávky z minulých dní majú cenu odfotenú a neprepíšu sa."
  }[druh];

  k.html(k.odp, 200, stranka({
    titulok: r.nazov, osoba: k.osoba, cesta: "/ciselniky", verzia: k.verzia,
    obsah: `
<section class="wrap">
  <div class="screen-head">
    <h2>${esc(r.nazov)}</h2>
    <span class="who">${esc(d.jednotne)}</span>
  </div>
  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  <form method="post" action="/ciselnik" class="card" style="max-width:520px">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <input type="hidden" name="druh" value="${esc(druh)}">
    <input type="hidden" name="id" value="${r.id}">
    ${d.polia.map(p => pole("u", p, r[p[0]], kontext)).join("")}
    <div class="btn-row">
      <button class="btn primary" type="submit">Uložiť</button>
      <a class="btn" href="/ciselniky">Späť na číselníky</a>
    </div>
    <p class="hint" style="margin:14px 0 0">${esc(kdeSaPouziva)}</p>
  </form>

  <div class="card">
    <div class="card-head"><h3>Zmazať</h3></div>
    ${pouzitie === 0 ? `
      <p style="margin:0 0 12px">Na túto položku zatiaľ nič neukazuje, takže sa dá zmazať
        bez toho, aby po nej ostala diera. Typicky ide o preklep pri zakladaní.</p>
      <details>
        <summary class="btn">Naozaj zmazať</summary>
        <form method="post" action="/ciselniky/zmazat" style="margin-top:14px">
          <input type="hidden" name="znamka" value="${esc(k.csrf)}">
          <input type="hidden" name="druh" value="${esc(druh)}">
          <input type="hidden" name="id" value="${r.id}">
          <p style="margin:0 0 12px">Zmazať <strong>${esc(r.nazov)}</strong>? Späť sa to vrátiť nedá.</p>
          <button class="btn primary" type="submit">Zmazať natrvalo</button>
        </form>
      </details>` : `
      <p style="margin:0 0 12px">Zmazať sa nedá — ukazuje naň
        <strong>${pouzitie} ${esc(d.pouzitie[1])}</strong>.</p>
      <p class="hint" style="margin:0">Zmazaním by vznikli riadky bez pôvodu: uzavreté mesiace
        a odfotené ceny by prestali dávať zmysel. Použite <em>Zneaktívniť</em> v zozname —
        položka sa prestane ponúkať, ale minulosť ostane čitateľná.</p>`}
  </div>
</section>`
  }));
}

export async function uloz(k) {
  const d = DRUHY[k.data.druh];
  if (!d) return k.inam(k.odp, "/ciselniky");
  const id = Number(k.data.id);
  const spat = t => k.inam(k.odp, `/ciselnik?druh=${k.data.druh}&id=${id}&chyba=` + encodeURIComponent(t));

  const v = zoberPolia(d, k.data);
  if (v.chyba) return spat(v.chyba);

  try {
    const nastav = v.stlpce.map((s, i) => `${s} = $${i + 2}`).join(", ");
    const r = await jeden(`UPDATE ${d.tabulka} SET ${nastav} WHERE id = $1 RETURNING nazov`,
                          [id, ...v.hodnoty]);
    if (!r) return k.inam(k.odp, "/ciselniky?chyba=" + encodeURIComponent("Taká položka tu nie je."));
    await zapis(k.osoba.id, "ciselnik.upravene", { druh: k.data.druh, id, nazov: r.nazov });
    k.inam(k.odp, `/ciselnik?druh=${k.data.druh}&id=${id}&sprava=` + encodeURIComponent("Uložené."));
  } catch (e) {
    spat(e.code === "23505"
      ? `${d.jednotne} s názvom „${k.data.nazov}" už existuje.`
      : `Nepodarilo sa uložiť: ${e.message}`);
  }
}

/* Mazanie je zámerne až tu, na detaile, a v dvoch krokoch. Zo zoznamu, kde sa
   klikká rýchlo, sa mazať nedá. */
export async function zmazat(k) {
  const d = DRUHY[k.data.druh];
  if (!d) return k.inam(k.odp, "/ciselniky");
  const id = Number(k.data.id);
  const r = await jeden(`SELECT nazov FROM ${d.tabulka} WHERE id = $1`, [id]);
  if (!r) return k.inam(k.odp, "/ciselniky");

  /* Kontrola sa robí znova na serveri. Tlačidlo v prehliadači je pohodlie,
     nie záruka — medzi zobrazením stránky a kliknutím mohol niekto položku
     použiť, a formulár sa dá poslať aj bez toho tlačidla. */
  const pouzitie = await pocetPouziti(d, id);
  if (pouzitie > 0)
    return k.inam(k.odp, `/ciselnik?druh=${k.data.druh}&id=${id}&chyba=` + encodeURIComponent(
      `Medzitým na túto položku niečo ukázalo (${pouzitie}). Nezmazalo sa nič — použite Zneaktívniť.`));

  try {
    await dopyt(`DELETE FROM ${d.tabulka} WHERE id = $1`, [id]);
  } catch (e) {
    /* Poistka na to, čo počítadlo nepokrýva: cudzí kľúč z databázy. */
    return k.inam(k.odp, `/ciselnik?druh=${k.data.druh}&id=${id}&chyba=` + encodeURIComponent(
      "Databáza mazanie odmietla — na položku niečo ukazuje. Použite Zneaktívniť."));
  }
  await zapis(k.osoba.id, "ciselnik.zmazane", { druh: k.data.druh, id, nazov: r.nazov });
  k.inam(k.odp, "/ciselniky?sprava=" + encodeURIComponent(`Zmazané: ${r.nazov}.`));
}

export async function stav(k) {
  const d = DRUHY[k.data.druh];
  if (!d) return k.inam(k.odp, "/ciselniky");
  const na = k.data.na === "1";
  const r = await jeden(`UPDATE ${d.tabulka} SET ${d.stav} = $2 WHERE id = $1 RETURNING nazov`,
                        [Number(k.data.id), na]);
  await zapis(k.osoba.id, na ? "ciselnik.obnovene" : "ciselnik.zneaktivnene",
              { druh: k.data.druh, id: Number(k.data.id), nazov: r?.nazov });
  k.inam(k.odp, "/ciselniky");
}
