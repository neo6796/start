/* Číselníky — firmy, prevádzky, tímy, jedálne.

   Nič sa nemaže. Položka sa dá len zneaktívniť: v uzavretých mesiacoch na ňu
   ukazujú objednávky a zmazaním by sa minulosť prepísala (koncept 6.1). */

import { stranka, esc } from "./html.js";
import { dopyt, jeden, vsetky, zapis } from "./db.js";

const eur = v => Number(v).toFixed(2).replace(".", ",") + " €";

/* Čo sa dá zakladať a meniť. Jedna tabuľka pravidiel namiesto štyroch
   takmer rovnakých obsluh. */
const DRUHY = {
  firma: {
    tabulka: "firma", nazov: "Firmy", jednotne: "firma", stav: "aktivna",
    prazdne: "Zatiaľ žiadna firma. Zakladá sa ako prvá — bez nej sa nedá zaradiť človek.",
    polia: [["nazov", "Názov", "text", true]]
  },
  prevadzka: {
    tabulka: "prevadzka", nazov: "Prevádzky", jednotne: "prevádzka", stav: "aktivna",
    prazdne: "Zatiaľ žiadna prevádzka.",
    polia: [["nazov", "Názov", "text", true], ["skratka", "Skratka", "text", true]]
  },
  tim: {
    tabulka: "tim", nazov: "Tímy", jednotne: "tím", stav: "aktivny",
    prazdne: "Zatiaľ žiadny tím.",
    polia: [["nazov", "Názov", "text", true]]
  },
  jedalen: {
    tabulka: "poskytovatel", nazov: "Jedálne", jednotne: "jedáleň", stav: "aktivny",
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
      ["email", "E-mail na objednávky", "text", false],
      ["telefon", "Telefón", "text", false]
    ]
  }
};

/* Identifikátor nesie aj druh číselníka. Na stránke sú štyri formuláre a každý
   má pole „Názov" — bez rozlíšenia by všetky štyri popisky ukazovali na prvé
   pole a kliknutie na „Názov" pri tímoch by skočilo do firiem. */
function pole(druhKluc, [kluc, popis, druh, povinne, moznosti], hodnota = "") {
  const id = `p-${druhKluc}-${kluc}`;
  const spolocne = `id="${id}" name="${kluc}"${povinne ? " required" : ""}`;
  let vstup;
  if (druh === "vyber") {
    vstup = `<select ${spolocne}>${moznosti.map(([v, t]) =>
      `<option value="${esc(v)}"${String(hodnota) === v ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  } else if (druh === "cislo") {
    vstup = `<input type="number" step="0.01" min="0" ${spolocne} value="${esc(hodnota)}">`;
  } else if (druh === "cas") {
    vstup = `<input type="time" ${spolocne} value="${esc(String(hodnota).slice(0, 5))}">`;
  } else {
    vstup = `<input type="text" ${spolocne} value="${esc(hodnota)}">`;
  }
  return `<div class="field"><label for="${id}">${esc(popis)}</label>${vstup}</div>`;
}

function karta(druh, d, riadky, csrf, otvorene) {
  const stlpce = d.polia.map(p => p[1]);
  return `
<div class="card">
  <div class="card-head">
    <h3>${esc(d.nazov)}</h3>
    <span class="hint">${riadky.length}</span>
  </div>
  ${riadky.length === 0
    ? `<p class="hint" style="margin:0 0 14px">${esc(d.prazdne)}</p>`
    : `<div class="scroll-x"><table class="data">
        <thead><tr>${stlpce.map(s => `<th>${esc(s)}</th>`).join("")}<th>Stav</th><th></th></tr></thead>
        <tbody>${riadky.map(r => `<tr${r[d.stav] ? "" : ' class="is-off"'}>
          ${d.polia.map(([kluc, , dr, , moz]) => {
            let v = r[kluc];
            if (v === null || v === undefined || v === "") v = "—";
            else if (kluc === "cena_s_dph") v = eur(v);
            else if (dr === "cas") v = String(v).slice(0, 5);
            else if (dr === "vyber") v = (moz.find(m => m[0] === String(v)) ?? [, v])[1];
            return `<td>${esc(v)}</td>`;
          }).join("")}
          <td>${r[d.stav] ? "aktívna" : "neaktívna"}</td>
          <td><form method="post" action="/ciselniky/stav" class="riadok-akcia">
            <input type="hidden" name="znamka" value="${esc(csrf)}">
            <input type="hidden" name="druh" value="${esc(druh)}">
            <input type="hidden" name="id" value="${r.id}">
            <input type="hidden" name="na" value="${r[d.stav] ? "0" : "1"}">
            <button class="btn" type="submit">${r[d.stav] ? "Zneaktívniť" : "Obnoviť"}</button>
          </form></td>
        </tr>`).join("")}</tbody>
       </table></div>`}

  <details${otvorene === druh ? " open" : ""}>
    <summary class="btn" style="display:inline-block;margin-top:4px">Pridať ${esc(d.jednotne)}</summary>
    <form method="post" action="/ciselniky/pridat" class="pridat" style="margin-top:14px;max-width:420px">
      <input type="hidden" name="znamka" value="${esc(csrf)}">
      <input type="hidden" name="druh" value="${esc(druh)}">
      ${d.polia.map(p => pole(druh, p)).join("")}
      <button class="btn primary" type="submit">Uložiť</button>
    </form>
  </details>
</div>`;
}

export async function zoznam(k) {
  const data = {};
  for (const [druh, d] of Object.entries(DRUHY)) {
    data[druh] = await vsetky(`SELECT * FROM ${d.tabulka} ORDER BY ${d.stav} DESC, nazov`);
  }
  const chyba = k.url.searchParams.get("chyba");
  const otvorene = k.url.searchParams.get("otvor");

  k.html(k.odp, 200, stranka({
    titulok: "Číselníky", osoba: k.osoba, cesta: "/ciselniky", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Číselníky</h2>
    <span class="who">firmy · prevádzky · tímy · jedálne</span>
  </div>
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}
  ${Object.entries(DRUHY).map(([druh, d]) => karta(druh, d, data[druh], k.csrf, otvorene)).join("")}
  <div class="card">
    <div class="card-head"><h3>Prečo sa nič nemaže</h3></div>
    <p class="hint" style="margin:0">Na uzavreté mesiace ukazujú objednávky s odfotenou cenou.
      Zmazaná jedáleň by z nich spravila riadky bez pôvodu. Zneaktívnená sa neponúka pri
      novej objednávke, ale minulosť ostáva čitateľná.</p>
  </div>
</section>`
  }));
}

export async function pridat(k) {
  const d = DRUHY[k.data.druh];
  if (!d) return k.inam(k.odp, "/ciselniky");

  const stlpce = [], hodnoty = [];
  for (const [kluc, popis, druh, povinne] of d.polia) {
    let v = (k.data[kluc] ?? "").trim();
    if (!v) {
      if (povinne) return k.inam(k.odp, `/ciselniky?otvor=${k.data.druh}&chyba=` +
        encodeURIComponent(`${popis} treba vyplniť.`));
      continue;                                   // prázdne nepovinné pole nechá predvolenú hodnotu
    }
    if (druh === "cislo") {
      v = Number(v.replace(",", "."));
      if (!Number.isFinite(v) || v < 0) return k.inam(k.odp, `/ciselniky?otvor=${k.data.druh}&chyba=` +
        encodeURIComponent(`${popis}: „${k.data[kluc]}" nie je číslo.`));
    }
    stlpce.push(kluc); hodnoty.push(v);
  }

  try {
    const r = await jeden(
      `INSERT INTO ${d.tabulka} (${stlpce.join(",")})
       VALUES (${stlpce.map((_, i) => `$${i + 1}`).join(",")}) RETURNING id, nazov`, hodnoty);
    await zapis(k.osoba.id, `ciselnik.pridane`, { druh: k.data.druh, id: r.id, nazov: r.nazov });
    k.inam(k.odp, "/ciselniky");
  } catch (e) {
    const text = e.code === "23505"
      ? `${d.jednotne} s názvom „${k.data.nazov}" už existuje.`
      : `Nepodarilo sa uložiť: ${e.message}`;
    k.inam(k.odp, `/ciselniky?otvor=${k.data.druh}&chyba=` + encodeURIComponent(text));
  }
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
