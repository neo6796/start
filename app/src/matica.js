/* Matica predáka — jadro appky.

   Tri stavy, nie dva (koncept 4.6):
     nerozhodnuté  prázdna bunka — nikto nekonal, treba sa spýtať
     bez obeda     krížik — rozhodnutie, takže sa medzi chýbajúcich nepočíta
     jedlo         označenie podľa toho, ako ho značí jedáleň

   Kto má pridelené dve jedálne, má ponuky pod sebou — jeden riadok na jedáleň.
   Krížik je vždy jeden a má vlastný riadok: „nechcem obed" je rozhodnutie
   o dni, nie o dodávateľovi (preview, obrazovka Predák).

   Bunky sú obyčajné prepínače (radio). Klávesnica aj odoslanie formulára tak
   fungujú bez jediného riadku JavaScriptu; skript len pridáva zrušenie voľby
   opätovným kliknutím. */

import { stranka, esc, meno, mnoho } from "./html.js";
import { bazen, jeden, vsetky, zapis } from "./db.js";
import { DNI, dnes, teraz, pondelok, dniTyzdna, denMesiac, tyzdenPopis, oznacenie } from "./datum.js";
import { menuTyzdna } from "./menu.js";

const BEZ_OBEDA = -1;

/* Krátky zoznam zámerne — nie je to modul na evidenciu dochádzky (koncept 1.4). */
export const DOVODY = [
  ["dovolenka", "dovolenka", "D"],
  ["pn", "PN", "P"],
  ["skolenie", "školenie alebo služobná cesta", "Š"],
  ["ine", "iné", "I"]
];
const dovodPopis = d => (DOVODY.find(x => x[0] === d) ?? [, d, "?"])[1];
const dovodZnak = d => (DOVODY.find(x => x[0] === d) ?? [, d, "?"])[2];

/* ---------- načítanie ---------- */

async function jedalne() {
  return vsetky("SELECT * FROM poskytovatel WHERE aktivny ORDER BY nazov");
}

/* Ľudia, za ktorých niekto objednáva, aj s prideleniami a s tým, čo už majú. */
async function tymZaTyzden(podmienka, hodnoty, po) {
  const dni = dniTyzdna(po);
  const ludia = await vsetky(`
    SELECT o.id, o.priezvisko, o.meno, o.kod_dochadzka, o.poskytovatel_id,
           t.nazov AS tim, t.id AS tim_id
      FROM osoba o
      LEFT JOIN tim t ON t.id = o.tim_id
     WHERE o.aktivny AND ${podmienka}
     ORDER BY t.nazov NULLS LAST, o.priezvisko, o.meno`, hodnoty);

  if (!ludia.length) return { ludia: [], objednavky: new Map(), pridelenia: new Map() };

  const idcka = ludia.map(o => o.id);

  const objednavky = new Map();
  for (const r of await vsetky(
    `SELECT osoba_id, datum::text AS datum, jedlo, poskytovatel_id, zadane_ako, spatny_zapis
       FROM objednavka WHERE osoba_id = ANY($1) AND datum = ANY($2::date[])`, [idcka, dni]))
    objednavky.set(`${r.osoba_id}|${r.datum}`, r);

  const pridelenia = new Map();
  for (const r of await vsetky(
    `SELECT oj.osoba_id, oj.poskytovatel_id
       FROM osoba_jedalen oj JOIN poskytovatel p ON p.id = oj.poskytovatel_id
      WHERE oj.osoba_id = ANY($1) AND p.aktivny
      ORDER BY p.nazov`, [idcka])) {
    if (!pridelenia.has(r.osoba_id)) pridelenia.set(r.osoba_id, []);
    pridelenia.get(r.osoba_id).push(r.poskytovatel_id);
  }

  /* Neprítomnosť sa v matici len ukazuje pri dni — nič neprepisuje.
     Deň sa dá kedykoľvek prebiť, je to predvolená hodnota, nie zámok. */
  const nepritomnosti = new Map();
  for (const r of await vsetky(
    `SELECT osoba_id, od::text AS od, do_::text AS do_, dovod
       FROM nepritomnost WHERE osoba_id = ANY($1) AND od <= $3 AND do_ >= $2`,
    [idcka, dni[0], dni[4]])) {
    if (!nepritomnosti.has(r.osoba_id)) nepritomnosti.set(r.osoba_id, []);
    nepritomnosti.get(r.osoba_id).push(r);
  }

  return { ludia, objednavky, pridelenia, nepritomnosti };
}

/* Deň sa zamyká, keď prejde jeho denná uzávierka. Dovtedy sa dá odhlásiť,
   potom už nie: kuchyňa varí podľa počtov, ktoré má, a čo sa uvarí, to sa
   zaplatí. Uplynulý deň prepísať v matici by znamenalo, že si niekto v piatok
   zmaže pondelkový obed, ktorý zjedol.

   Čas berie z jedálne (`odhlasenie_do`); pri dvoch jedálňach platí tá skoršia,
   lebo v tej sa už variť začalo. Opraviť sa taký deň dá len spätným zápisom,
   ktorý o sebe vie, že je spätný. */
function denZamknuty(datum, moje, vsetkyJedalne, dnesJe, cas) {
  if (datum < dnesJe) return true;
  if (datum > dnesJe) return false;
  const casy = moje.map(id => vsetkyJedalne.find(j => j.id === id)?.odhlasenie_do)
                   .filter(Boolean).map(t => String(t).slice(0, 5)).sort();
  return casy.length ? cas >= casy[0] : false;
}

function precPreč(nepritomnosti, osobaId, datum) {
  return (nepritomnosti?.get(osobaId) ?? []).find(n => n.od <= datum && n.do_ >= datum) ?? null;
}

/* ---------- vykreslenie ---------- */

function bunka(o, datum, zaznam, moje, vsetkyJedalne, prec, menu, denIndex, citaj = false) {
  const hodnota = zaznam?.jedlo;
  const nerozhodnute = hodnota === null || hodnota === undefined;
  const menoPola = `b-${o.id}-${datum}`;
  const viac = moje.length > 1;

  const krizik = `<label class="opt-b none">
    <input type="radio" name="${menoPola}" value="x"${hodnota === BEZ_OBEDA ? " checked" : ""}${citaj ? " disabled" : ""}>
    <span aria-hidden="true">×</span><span class="len-pre-citacku">nechce obed</span></label>`;

  let h = `<div class="opts${citaj ? " citaj" : ""}" role="group" aria-label="${esc(o.priezvisko)} ${esc(o.meno)}">`;
  moje.forEach((jid, i) => {
    const j = vsetkyJedalne.find(x => x.id === jid);
    if (!j) return;
    h += `<span class="opt-row">`;
    for (let n = 0; n < j.pocet_jedal; n++) {
      const zvolene = !nerozhodnute && hodnota === n &&
                      (zaznam.poskytovatel_id === jid || moje.length === 1);
      const znak = oznacenie(j.znacenie, n);
      /* Ak je názov jedla zadaný, ukáže sa po najdení myšou aj čítačke. */
      const nazovJedla = menu?.get(jid)?.nazov(denIndex, n) ?? null;
      const popis = nazovJedla ? `${j.nazov}, ${znak} — ${nazovJedla}` : `${j.nazov}, jedlo ${znak}`;
      h += `<label class="opt-b"${nazovJedla ? ` title="${esc(nazovJedla)}"` : ""}>
        <input type="radio" name="${menoPola}" value="${jid}:${n}"${zvolene ? " checked" : ""}${citaj ? " disabled" : ""}>
        <span aria-hidden="true">${esc(znak)}</span>
        <span class="len-pre-citacku">${esc(popis)}</span></label>`;
    }
    if (!viac && i === moje.length - 1) h += krizik;
    h += `</span>`;
  });
  if (viac) h += `<span class="opt-row">${krizik}</span>`;
  h += `</div>`;
  if (prec) h += `<span class="precmark" title="${esc(dovodPopis(prec.dovod))}"
    >${esc(dovodZnak(prec.dovod))}</span>`;
  /* Príznak spätného zápisu ostáva na dni natrvalo (koncept 4.5a) — aj tu,
     nielen na obrazovke, kde vznikol. Ten obed jedáleň nikdy neobjednala. */
  if (zaznam?.spatny_zapis) h += `<span class="spmark"
    title="zapísané spätne — jedálni sa neposielalo">S</span>`;
  return h;
}

function tabulka(ludia, objednavky, pridelenia, po, vsetkyJedalne, nepritomnosti, menu,
                 sTimom = false, citaj = false, jaId = null) {
  const dni = dniTyzdna(po);
  /* Kto sa na maticu pozerá, je v nej aj sám — objednáva si tiež. Hľadať sa
     medzi tridsiatimi menami je zbytočná práca, tak je jeho riadok prvý
     a oddelený. Poradie zvyšku ostáva, ako bolo: podľa tímu a priezviska. */
  const poradie = jaId
    ? [...ludia.filter(o => o.id === jaId), ...ludia.filter(o => o.id !== jaId)]
    : ludia;
  const dnesJe = dnes(), cas = teraz();
  return `
<div class="scroll-x"><table class="matrix">
  <thead><tr>
    <th>Stravník</th>
    ${dni.map((d, i) => `<th><span class="dn">${DNI[i]}</span>
      <span class="dnum">${denMesiac(d)}</span></th>`).join("")}
    <th class="cnt">Bez voľby</th>
  </tr></thead>
  <tbody>
    ${poradie.map(o => {
      const jaSom = o.id === jaId;
      const moje = pridelenia.get(o.id) ?? (o.poskytovatel_id ? [o.poskytovatel_id] : []);
      const chyba = dni.filter(d => {
        const z = objednavky.get(`${o.id}|${d}`);
        return z?.jedlo === null || z?.jedlo === undefined;
      }).length;
      /* Bez jedálne sa nedá objednať nič. Povedať to raz na riadku je
         zrozumiteľnejšie než päťkrát v prázdnych bunkách. */
      /* Pri pohľade na celý podnik treba pri mene aj tím — bez neho sa
         v dlhom zozname nedá povedať, koho sa to týka. */
      const kto = `<span class="nm">${esc(o.priezvisko)} ${esc(o.meno)}${
          jaSom ? '<span class="badge lead">vy</span>' : ""}</span>
        <span class="pn">${esc(o.kod_dochadzka ?? "—")}${
          sTimom ? " · " + esc(o.tim ?? "bez tímu") : ""}</span>`;

      if (!moje.length) return `<tr class="is-off${jaSom ? " ja" : ""}">
        <th>${kto}</th>
        <td colspan="6" class="bez-jedalne">Nemá pridelenú jedáleň, takže sa preň nedá objednať.
          Prideľuje sa v <a href="/osoba?id=${o.id}">jeho údajoch</a>.</td>
      </tr>`;

      return `<tr${jaSom ? ' class="ja"' : ""}>
        <th>${kto}</th>
        ${dni.map((d, i) => {
          const z = objednavky.get(`${o.id}|${d}`);
          const prazdna = z?.jedlo === null || z?.jedlo === undefined;
          const prec = precPreč(nepritomnosti, o.id, d);
          const zamknuty = citaj || denZamknuty(d, moje, vsetkyJedalne, dnesJe, cas);
          const triedy = [prazdna ? "gap" : "", zamknuty ? "po-case" : ""].filter(Boolean);
          return `<td${triedy.length ? ` class="${triedy.join(" ")}"` : ""
            }>${bunka(o, d, z, moje, vsetkyJedalne, prec, menu, i, zamknuty)}</td>`;
        }).join("")}
        <td class="cnt${chyba ? " gap" : ""}">${chyba || "—"}</td>
      </tr>`;
    }).join("")}
  </tbody>
</table></div>
<p class="swipe-hint">Tabuľka sa posúva vbok</p>`;
}

const LEGENDA = `
<div class="legend">
  <span><span class="opt-b vzor" aria-hidden="true">B</span> zvolené jedlo</span>
  <span><span class="opt-b none vzor" aria-hidden="true">×</span> nechce obed — je to rozhodnutie, upomienka nechodí</span>
  <span><i class="sw empty"></i> bez voľby — nikto nekonal</span>
  <span><i class="sw zamok"></i> po dennej uzávierke — meniť sa už nedá</span>
  <span><span class="spmark vzor" aria-hidden="true">S</span> zapísané spätne — jedálni sa neposielalo</span>
</div>`;

/* Menu pre tie jedálne, ktoré tím naozaj používa. */
async function menuPreTyzden(pridelenia, ludia, po) {
  const idcka = new Set();
  for (const o of ludia)
    for (const j of pridelenia.get(o.id) ?? (o.poskytovatel_id ? [o.poskytovatel_id] : []))
      idcka.add(j);
  const m = new Map();
  for (const id of idcka) {
    const x = await menuTyzdna(id, po);
    if (x) m.set(id, x);
  }
  return m;
}

/* Jedálny lístok nad maticou.

   Musí tu byť celý, nielen polievka. V bunkách sú označenia (A–E, 1–5) a nič
   viac sa do nich nezmestí; názov jedla je v nich len ako bublina po nadídení
   myšou, čo na telefóne neexistuje. Bez tejto tabuľky predák pri bunke „C"
   nemá ako zistiť, čo C v ten deň je — a to je jediné, na čo sa ho ľudia pýtajú.

   Polievka má vlastný riadok, lebo nie je na výber: je k obedu vždy. */
function kartaMenu(menu, jedla, po) {
  const dni = dniTyzdna(po);
  const maObsah = m => m.priloha_nazov ||
    dni.some((_, i) => m.polievka(i)) ||
    dni.some((_, i) => [...Array(9)].some((__, n) => m.nazov(i, n)));
  const s = [...menu.entries()].filter(([, m]) => maObsah(m));
  if (!s.length) return "";

  return `<div class="listky">
    ${s.map(([id, m]) => {
      const j = jedla.find(x => x.id === id);
      const pocet = j?.pocet_jedal ?? 5;
      const riadky = [];
      if (dni.some((_, i) => m.polievka(i)))
        riadky.push(["P", dni.map((_, i) => m.polievka(i)), true]);
      for (let n = 0; n < pocet; n++)
        if (dni.some((_, i) => m.nazov(i, n)))
          riadky.push([oznacenie(j?.znacenie ?? "upper", n), dni.map((_, i) => m.nazov(i, n)), false]);

      return `<details class="listok" open>
        <summary class="btn">Jedálny lístok — ${esc(j?.nazov ?? "jedáleň")}</summary>
        ${m.priloha_nazov
          ? `<p class="hint" style="margin:10px 0 0">Priložený:
             <a href="/menu/priloha?jedalen=${id}&tyzden=${po}">${esc(m.priloha_nazov)}</a></p>`
          : ""}
        ${riadky.length ? `<div class="scroll-x"><table class="data listok-tab">
          <thead><tr><th></th>
            ${dni.map((d, i) => `<th>${DNI[i]}<span class="podriadok">${denMesiac(d)}</span></th>`).join("")}
          </tr></thead>
          <tbody>
            ${riadky.map(([znak, texty, jePolievka]) => `<tr${jePolievka ? ' class="polievka-riadok"' : ""}>
              <th class="oznak">${esc(znak)}</th>
              ${texty.map(t => `<td>${t ? esc(t) : "<span class=\"hint\">—</span>"}</td>`).join("")}
            </tr>`).join("")}
          </tbody>
        </table></div>` : `<p class="hint" style="margin:10px 0 0">Názvy jedál nie sú vyplnené.</p>`}
      </details>`;
    }).join("")}
  </div>`;
}

/* ---------- koho daný človek obsluhuje ---------- */

/* Predák svoj tím, správca hocikoho. Správca, ktorý je zároveň predákom,
   začína pri svojom tíme a prepína sa — inak by sa k ostatným tímom nedostal
   práve ten, kto na to má právo.

   Je to na jednom mieste, lebo to potrebujú štyri obsluhy: matica, hromadné
   odhlásenie, pridelenie jedální a ukladanie. Keby sa to písalo štyrikrát,
   raz by sa jedna kópia rozišla so zvyškom a ukladalo by sa niekomu inému,
   než kto je na obrazovke. */
function pohladZ(osoba, ziadany) {
  if (!osoba.je_admin) return "tim";
  const ch = (ziadany ?? "").trim();
  if (ch === "vsetci" || ch === "tim") return ch;
  return osoba.je_predak ? "tim" : "vsetci";
}

const ktoPatri = (osoba, pohlad, po) => pohlad === "vsetci"
  ? tymZaTyzden("true", [], po)
  : tymZaTyzden("o.tim_id IN (SELECT tim_id FROM tim_predak WHERE osoba_id = $1)", [osoba.id], po);

/* ---------- obrazovka predáka ---------- */

export async function tim(k) {
  const po = pondelok(k.url.searchParams.get("tyzden") || dnes());
  const jedla = await jedalne();

  const pohlad = pohladZ(k.osoba, k.url.searchParams.get("pohlad"));
  const { ludia, objednavky, pridelenia, nepritomnosti } = await ktoPatri(k.osoba, pohlad, po);

  const menu = await menuPreTyzden(pridelenia, ludia, po);
  const zamok = await jeden("SELECT * FROM tyzden_stav WHERE pondelok = $1", [po]);
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");

  const bezVolby = ludia.reduce((s, o) => s + dniTyzdna(po).filter(d => {
    const z = objednavky.get(`${o.id}|${d}`);
    return z?.jedlo === null || z?.jedlo === undefined;
  }).length, 0);

  const odkaz = (t, popis) =>
    `<a class="btn" href="/tim?tyzden=${t}&pohlad=${pohlad}">${esc(popis)}</a>`;
  const prepinac = p2 => `<a class="btn" href="/tim?tyzden=${po}&pohlad=${p2}"${
    p2 === pohlad ? ' aria-pressed="true"' : ""}>${p2 === "tim" ? "môj tím" : "všetci"}</a>`;

  k.html(k.odp, 200, stranka({
    titulok: pohlad === "vsetci" ? "Všetci stravníci" : "Môj tím",
    osoba: k.osoba, cesta: "/tim", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>${pohlad === "vsetci" ? "Všetci stravníci" : "Môj tím"}</h2>
    <span class="who">${esc(meno(k.osoba))}</span>
    ${k.osoba.je_admin && k.osoba.je_predak
      ? `<span class="btn-row" style="margin-left:auto">${prepinac("tim")}${prepinac("vsetci")}</span>`
      : ""}
  </div>

  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  <div class="deadline">
    <span class="lbl">Týždeň</span>
    <span class="val">${tyzdenPopis(po)}</span>
    <span class="sep">·</span>
    <span class="lbl">Bez voľby</span>
    <span class="val">${bezVolby}</span>
    <span style="margin-left:auto" class="btn-row">
      ${odkaz(posunTyzden(po, -7), "← predchádzajúci")}
      ${odkaz(pondelok(dnes()), "tento týždeň")}
      ${odkaz(posunTyzden(po, 7), "nasledujúci →")}
    </span>
  </div>

  ${zamok?.uzavrety ? `<div class="infobox"><strong>Objednávka na tento týždeň už odišla
    jedálňam — meniť sa dá ďalej a zmena sa uloží.</strong> Kto ochorie, musí sa dať
    odhlásiť. Zmena ale sama do kuchyne nedôjde: treba jej poslať <strong>opravu</strong>
    ${k.osoba.je_admin
      ? `tlačidlom v <a href="/uzavierka?tyzden=${po}">Uzávierke</a>`
      : "— posiela ju správca z Uzávierky"}. Dovtedy tam varia podľa starých počtov.</div>` : ""}

  ${ludia.length === 0
    ? `<div class="card"><p style="margin:0">Nemáš nikoho v tíme.</p>
        <p class="hint" style="margin:10px 0 0">Tím sa prideľuje predákovi
          v <a href="/ciselniky">Číselníkoch</a> a ľudia sa doň zaraďujú
          v <a href="/ludia">Ľuďoch</a>.</p></div>`
    : `<form method="post" action="/tim" class="card">
        <input type="hidden" name="znamka" value="${esc(k.csrf)}">
        <input type="hidden" name="tyzden" value="${po}">
        <input type="hidden" name="pohlad" value="${pohlad}">
        <div class="card-head">
          <h3>${pohlad === "vsetci" ? "Všetci stravníci" : esc(ludia[0].tim ?? "Bez tímu")}</h3>
          <span class="pill neutral">${mnoho(ludia.length, ["človek", "ľudia", "ľudí"])}</span>
        </div>
        ${tabulka(ludia, objednavky, pridelenia, po, jedla, nepritomnosti, menu,
                   pohlad === "vsetci", false, k.osoba.id)}
        ${LEGENDA}
        <div class="btn-row" style="margin-top:16px">
          <button class="btn primary" type="submit">Uložiť</button>
        </div>
        <p class="hint" style="margin-top:12px">Opätovné kliknutie na zvolenú možnosť ju zruší
          a bunka sa vráti na nerozhodnuté.</p>
      </form>

      ${kartaMenu(menu, jedla, po)}

      <div class="card">
        <details${k.url.searchParams.get("prec") ? " open" : ""}>
          <summary class="btn">Hromadné odhlásenie (dovolenka, PN, služobka)</summary>
          <form method="post" action="/tim/nepritomnost" style="margin-top:16px">
            <input type="hidden" name="znamka" value="${esc(k.csrf)}">
            <input type="hidden" name="tyzden" value="${po}">
            <input type="hidden" name="pohlad" value="${pohlad}">
            <div class="hromadne">
              <div class="field"><label for="n-kto">Koho</label>
                <select id="n-kto" name="kto" required>
                  <option value="">—</option>
                  <option value="vsetci">${pohlad === "vsetci" ? "všetkých" : "celý tím"} (${ludia.length})</option>
                  ${ludia.map(o => `<option value="${o.id}">${esc(o.priezvisko)} ${esc(o.meno)}</option>`).join("")}
                </select></div>
              <div class="field"><label for="n-od">Od</label>
                <input type="date" id="n-od" name="od" value="${po}" required></div>
              <div class="field"><label for="n-do">Do</label>
                <input type="date" id="n-do" name="do" value="${dniTyzdna(po)[4]}" required></div>
              <div class="field"><label for="n-dovod">Dôvod</label>
                <select id="n-dovod" name="dovod" required>
                  ${DOVODY.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join("")}
                </select></div>
            </div>
            <button class="btn primary" type="submit">Označiť „bez obeda"</button>
            <div class="note">
              Nastaví vybrané dni na <strong>bez obeda</strong>, nie na prázdne. Keby ostali prázdne,
              appka by človeka celý týždeň naháňala upomienkami, hoci je na dovolenke.
              Zapíše sa aj dôvod — pri uzávierke sa tak neprítomnosť neohlási ako nález.
              Ktorýkoľvek deň sa dá potom prebiť v tabuľke: je to predvolená hodnota, nie zámok.
            </div>
          </form>
        </details>
      </div>

      <div class="card">
        <details${k.url.searchParams.get("jed") ? " open" : ""}>
          <summary class="btn">Pridelenie jedální</summary>
          <form method="post" action="/tim/jedalne" style="margin-top:16px">
            <input type="hidden" name="znamka" value="${esc(k.csrf)}">
            <input type="hidden" name="tyzden" value="${po}">
            <input type="hidden" name="pohlad" value="${pohlad}">
            <div class="scroll-x"><table class="data">
              <thead><tr><th>Stravník</th>
                ${jedla.map(j => `<th>${esc(j.nazov)}</th>`).join("")}</tr></thead>
              <tbody>${ludia.map(o => {
                const moje = pridelenia.get(o.id) ?? [];
                return `<tr>
                  <td>${esc(o.priezvisko)} ${esc(o.meno)}</td>
                  ${jedla.map(j => `<td class="tick"><label class="check">
                    <input type="checkbox" name="j-${o.id}" value="${j.id}"${moje.includes(j.id) ? " checked" : ""}
                      aria-label="${esc(o.priezvisko)} ${esc(o.meno)}, ${esc(j.nazov)}">
                  </label></td>`).join("")}
                </tr>`;
              }).join("")}</tbody>
            </table></div>
            <button class="btn primary" type="submit" style="margin-top:14px">Uložiť pridelenie</button>
            <div class="note">
              Kto má zaškrtnuté dve, dostane v matici ponuky pod sebou — jeden riadok na jedáleň.
              Odobrať jedáleň, z ktorej už niekto v otvorenom týždni má objednané, appka nedovolí:
              najprv treba zmeniť tú objednávku.
            </div>
          </form>
        </details>
      </div>`}
</section>

<script>
/* Jediné, čo prepínače samy nevedia: zrušiť voľbu. Bez skriptu sa dá voľba
   zmeniť, len nie vrátiť na „nerozhodnuté" — ostatné funguje aj bez neho. */
document.querySelectorAll("table.matrix input[type=radio]").forEach(p => {
  p.addEventListener("click", e => {
    if (p.dataset.bolo === "1") { p.checked = false; p.dataset.bolo = ""; e.preventDefault?.(); }
  });
  p.addEventListener("change", () => {
    for (const iny of document.getElementsByName(p.name)) iny.dataset.bolo = "";
    p.dataset.bolo = "1";
  });
  if (p.checked) p.dataset.bolo = "1";
});
</script>`
  }));
}

function posunTyzden(po, dni) {
  const d = new Date(po + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + dni);
  return d.toISOString().slice(0, 10);
}

/* ---------- uloženie ---------- */

/* Čo sa uloží: cena sa na objednávku odfotí (koncept 6.1), aby neskoršia zmena
   cenníka minulosť neprepísala. Rozdelenie na príspevok, fond a podiel
   stravníka sa dopočíta až pri uzávierke — z odfotenej ceny, takže je rovnako
   stabilné, a nie je ho treba prepočítavať pri každom kliknutí. */
export async function uloz(k) {
  const po = pondelok(k.data.tyzden || dnes());
  const dni = dniTyzdna(po);

  /* Uzavretý týždeň sa už nezamyká. Objednávka síce odišla, ale svet sa
     nezastaví: kto ochorie v pondelok ráno, musí sa dať odhlásiť. Zmena sa
     zapíše a človek dostane vetu o tom, že jedálni treba poslať opravu —
     zamlčať zmenu by znamenalo, že sa uvarí pre niekoho, kto nepríde. */
  const zamok = await jeden("SELECT * FROM tyzden_stav WHERE pondelok = $1", [po]);

  const pohlad = pohladZ(k.osoba, k.data.pohlad);
  const { ludia, objednavky, pridelenia } = await ktoPatri(k.osoba, pohlad, po);

  const jedla = await jedalne();
  const dnesJe = dnes(), cas = teraz();
  /* Do objednávky sa zapisuje, v akej role ju niekto zadal — predák za svoj
     tím, správca za hocikoho. Pri spore je to jediné, čo povie kto a ako. */
  const akoZadane = pohlad === "vsetci" ? "admin" : "predak";

  let zmien = 0, odmietnutych = 0;
  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    for (const o of ludia) {
      const moje = pridelenia.get(o.id) ?? (o.poskytovatel_id ? [o.poskytovatel_id] : []);
      for (const d of dni) {
        /* Vypnuté políčko je len nápoveda pre oči. Odmietnuť uplynulý deň
           musí server — inak stačí poslať formulár inak a obed z pondelka
           sa v piatok stratí. */
        if (denZamknuty(d, moje, jedla, dnesJe, cas)) continue;
        const surove = k.data[`b-${o.id}-${d}`] ?? "";
        const stare = objednavky.get(`${o.id}|${d}`);
        const staraHodnota = stare?.jedlo ?? null;

        let jedlo = null, jedalenId = null;
        if (surove === "x") jedlo = BEZ_OBEDA;
        else if (surove) {
          const [jid, n] = surove.split(":").map(Number);
          /* Nikto si nesmie objednať z jedálne, ktorú nemá pridelenú — inak by
             stačilo zmeniť hodnotu vo formulári a obísť tým pridelenie. */
          const j = jedla.find(x => x.id === jid);
          if (!j || !moje.includes(jid) || !(n >= 0 && n < j.pocet_jedal)) { odmietnutych++; continue; }
          jedlo = n; jedalenId = jid;
        }

        if (jedlo === staraHodnota &&
            (jedlo === null || jedlo === BEZ_OBEDA || stare?.poskytovatel_id === jedalenId)) continue;

        if (jedlo === null) {
          await klient.query("DELETE FROM objednavka WHERE osoba_id = $1 AND datum = $2", [o.id, d]);
          zmien++;
          continue;
        }

        const j = jedalenId ? jedla.find(x => x.id === jedalenId) : null;
        const bezDph = j ? Number(j.cena_s_dph) / (1 + Number(j.sadzba_dph) / 100) : null;

        await klient.query(`
          INSERT INTO objednavka (osoba_id, datum, jedlo, poskytovatel_id, zadal_id, zadane_ako,
                                  cena_bez_dph, sadzba_dph, zmenene)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now())
          ON CONFLICT (osoba_id, datum) DO UPDATE SET
            jedlo = EXCLUDED.jedlo, poskytovatel_id = EXCLUDED.poskytovatel_id,
            zadal_id = EXCLUDED.zadal_id, zadane_ako = EXCLUDED.zadane_ako,
            cena_bez_dph = EXCLUDED.cena_bez_dph, sadzba_dph = EXCLUDED.sadzba_dph,
            zmenene = now()`,
          [o.id, d, jedlo, jedalenId, k.osoba.id, akoZadane,
           bezDph === null ? null : bezDph.toFixed(4), j ? j.sadzba_dph : null]);
        zmien++;
      }
    }
    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    return k.inam(k.odp, `/tim?tyzden=${po}&chyba=` +
      encodeURIComponent("Neuložilo sa nič: " + e.message));
  }
  klient.release();

  await zapis(k.osoba.id, "matica.ulozene", { tyzden: po, zmien, odmietnutych });

  const sprava = zmien
    ? `Uložené — ${mnoho(zmien, ["zmena", "zmeny", "zmien"])}.` +
      (zamok?.uzavrety ? " Objednávka už odišla — jedálni treba poslať opravu z Uzávierky." : "")
    : "Nič sa nezmenilo.";
  k.inam(k.odp, `/tim?tyzden=${po}&pohlad=${pohlad}&sprava=` + encodeURIComponent(sprava) +
    (odmietnutych ? "&chyba=" + encodeURIComponent(
      `${mnoho(odmietnutych, ["voľba sa neuložila", "voľby sa neuložili", "volieb sa neuložilo"])} — ` +
      "jedáleň nie je danému stravníkovi pridelená.") : ""));
}

/* ---------- pridelenie jedální ---------- */

/* Predák to smie meniť vo svojom tíme, admin komukoľvek. Bolo to Erikovo
   rozhodnutie: predák je bližšie k realite a vie, kto kde je. */
export async function jedalne_uloz(k) {
  const po = pondelok(k.data.tyzden || dnes());
  const spat = t => k.inam(k.odp, `/tim?tyzden=${po}&jed=1&chyba=` + encodeURIComponent(t));

  const { ludia } = await ktoPatri(k.osoba, pohladZ(k.osoba, k.data.pohlad), po);
  if (!ludia.length) return spat("Nemáš nikoho v tíme.");

  const platne = new Set((await jedalne()).map(j => j.id));

  let zmien = 0;
  const branene = [];
  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    for (const o of ludia) {
      const chcene = [].concat(k.data[`j-${o.id}`] ?? [])
        .map(Number).filter(v => platne.has(v));

      /* Jedáleň, z ktorej už niekto má objednané v neuzavretom týždni, sa
         odobrať nedá. Objednávka by ostala visieť na jedálni, ktorú stravník
         nemá — a tá istá kontrola pri ukladaní matice by ju potom odmietla. */
      const pouzite = (await klient.query(
        `SELECT DISTINCT o2.poskytovatel_id FROM objednavka o2
          WHERE o2.osoba_id = $1 AND o2.poskytovatel_id IS NOT NULL
            AND o2.datum >= date_trunc('month', current_date)`, [o.id])).rows.map(r => r.poskytovatel_id);

      for (const p of pouzite) {
        if (!chcene.includes(p)) {
          chcene.push(p);
          branene.push(`${o.priezvisko} ${o.meno}`);
        }
      }

      const v = await klient.query(
        "DELETE FROM osoba_jedalen WHERE osoba_id = $1 AND NOT (poskytovatel_id = ANY($2))",
        [o.id, chcene.length ? chcene : [0]]);
      zmien += v.rowCount;
      for (const j of chcene) {
        const w = await klient.query(
          `INSERT INTO osoba_jedalen (osoba_id, poskytovatel_id, pridal_id)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [o.id, j, k.osoba.id]);
        zmien += w.rowCount;
      }
    }
    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    return spat("Neuložilo sa nič: " + e.message);
  }
  klient.release();

  await zapis(k.osoba.id, "pridelenie.jedalne", { tyzden: po, zmien });

  const chyba = branene.length
    ? "&chyba=" + encodeURIComponent(
        `Jedáleň sa neodobrala, lebo z nej už tento mesiac niekto má objednané: ` +
        [...new Set(branene)].join(", ") + ".")
    : "";
  k.inam(k.odp, `/tim?tyzden=${po}&sprava=` +
    encodeURIComponent(zmien ? `Pridelenie uložené (${zmien}).` : "Nič sa nezmenilo.") + chyba);
}

/* ---------- hromadné odhlásenie ---------- */

/* Zapíše sa záznam o neprítomnosti a dni v rozsahu sa nastavia na „bez obeda".
   Sobota a nedeľa sa preskočia — objednávka mimo pracovného dňa neexistuje
   a databáza ju aj tak odmietne. */
export async function nepritomnost(k) {
  const po = pondelok(k.data.tyzden || dnes());
  const spat = t => k.inam(k.odp, `/tim?tyzden=${po}&prec=1&chyba=` + encodeURIComponent(t));

  const od = (k.data.od ?? "").trim(), doDna = (k.data.do ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(od) || !/^\d{4}-\d{2}-\d{2}$/.test(doDna))
    return spat("Dátumy nie sú vyplnené.");
  if (doDna < od) return spat("Koniec je skôr než začiatok.");
  if (!DOVODY.some(d => d[0] === k.data.dovod)) return spat("Chýba dôvod.");

  const { ludia } = await ktoPatri(k.osoba, pohladZ(k.osoba, k.data.pohlad), po);

  const koho = k.data.kto === "vsetci"
    ? ludia
    : ludia.filter(o => o.id === Number(k.data.kto));
  if (!koho.length) return spat("Nevybrali ste nikoho zo svojho tímu.");

  /* Pracovné dni v rozsahu. Rozsah je zámerne bez obmedzenia na jeden týždeň —
     dovolenka býva dvojtýždňová a rozdeľovať ju na dva zápisy nemá zmysel. */
  const dni = [];
  for (let d = od; d <= doDna; d = posunDen(d, 1)) {
    const den = new Date(d + "T12:00:00Z").getUTCDay();
    if (den >= 1 && den <= 5) dni.push(d);
  }
  if (!dni.length) return spat("V zadanom rozsahu nie je ani jeden pracovný deň.");
  if (dni.length > 200) return spat("Rozsah je pridlhý — zadajte kratší.");

  /* Dovolenka ani PN sa nepýtajú, či je týždeň uzavretý — zapíšu sa aj tam.
     Za tie týždne, ktorých sa to dotklo, treba jedálni poslať opravu, tak sa
     to na konci povie menovite. */
  const uzavrete = new Set((await vsetky(
    "SELECT pondelok::text AS pondelok FROM tyzden_stav WHERE uzavrety")).map(r => r.pondelok));
  const volne = dni;
  const dotknuteUzavrete = [...new Set(dni.map(pondelok))].filter(t => uzavrete.has(t));

  let zmien = 0;
  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    for (const o of koho) {
      await klient.query(
        "INSERT INTO nepritomnost (osoba_id, od, do_, dovod, zadal_id) VALUES ($1,$2,$3,$4,$5)",
        [o.id, od, doDna, k.data.dovod, k.osoba.id]);
      for (const d of volne) {
        const v = await klient.query(`
          INSERT INTO objednavka (osoba_id, datum, jedlo, zadal_id, zadane_ako, zmenene)
          VALUES ($1,$2,$3,$4,$5, now())
          ON CONFLICT (osoba_id, datum) DO UPDATE SET
            jedlo = EXCLUDED.jedlo, poskytovatel_id = NULL,
            cena_bez_dph = NULL, sadzba_dph = NULL,
            zadal_id = EXCLUDED.zadal_id, zadane_ako = EXCLUDED.zadane_ako, zmenene = now()
          WHERE objednavka.jedlo IS DISTINCT FROM $3`,
          [o.id, d, BEZ_OBEDA, k.osoba.id, "predak"]);
        zmien += v.rowCount;
      }
    }
    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    return spat("Neuložilo sa nič: " + e.message);
  }
  klient.release();

  await zapis(k.osoba.id, "nepritomnost.zapisana",
              { koho: koho.map(o => o.id), od, do: doDna, dovod: k.data.dovod, zmien });

  k.inam(k.odp, `/tim?tyzden=${po}&sprava=` + encodeURIComponent(
    `Odhlásené: ${mnoho(koho.length, ["človek", "ľudia", "ľudí"])}, ` +
    `${mnoho(volne.length, ["pracovný deň", "pracovné dni", "pracovných dní"])}.` +
    (dotknuteUzavrete.length
      ? ` Objednávka za ${mnoho(dotknuteUzavrete.length, ["týždeň", "týždne", "týždňov"])}` +
        " už odišla — jedálni treba poslať opravu z Uzávierky."
      : "")));
}

function posunDen(iso, kolko) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + kolko);
  return d.toISOString().slice(0, 10);
}

/* ---------- vlastný týždeň stravníka ---------- */

export async function moje(k) {
  const po = pondelok(k.url.searchParams.get("tyzden") || dnes());
  const jedla = await jedalne();
  const { ludia, objednavky, pridelenia, nepritomnosti } = await tymZaTyzden("o.id = $1", [k.osoba.id], po);
  const menu = await menuPreTyzden(pridelenia, ludia, po);
  const zamok = await jeden("SELECT * FROM tyzden_stav WHERE pondelok = $1", [po]);

  k.html(k.odp, 200, stranka({
    titulok: "Môj týždeň", osoba: k.osoba, cesta: "/moje", verzia: k.verzia,
    obsah: `
<section class="wrap">
  <div class="screen-head">
    <h2>Môj týždeň</h2>
    <span class="who">${esc(meno(k.osoba))}</span>
  </div>
  <div class="deadline">
    <span class="lbl">Týždeň</span>
    <span class="val">${tyzdenPopis(po)}</span>
    <span style="margin-left:auto" class="btn-row">
      <a class="btn" href="/moje?tyzden=${posunTyzden(po, -7)}">←</a>
      <a class="btn" href="/moje?tyzden=${pondelok(dnes())}">tento týždeň</a>
      <a class="btn" href="/moje?tyzden=${posunTyzden(po, 7)}">→</a>
    </span>
  </div>
  ${zamok?.uzavrety ? `<div class="infobox">Objednávka na tento týždeň už odišla do jedálne.
    ${k.osoba.je_admin
      ? `Zmeniť sa dá v <a href="/tim?tyzden=${po}">Mojom tíme</a>; jedálni sa potom pošle oprava.`
      : k.osoba.je_predak
      ? "Zmeniť sa dá v Mojom tíme; jedálni sa potom pošle oprava."
      : "Ak sa niečo zmenilo, povedzte predákovi — pošle jedálni opravu."}</div>` : ""}
  <div class="card">
    ${ludia.length
      ? tabulka(ludia, objednavky, pridelenia, po, jedla, nepritomnosti, menu, false, true) + LEGENDA
      : "<p>Nenašiel som ťa v zozname.</p>"}
    <p class="hint" style="margin-top:12px">Táto obrazovka je len na pozeranie — políčka sa
      preto ani nedajú stlačiť. Vlastné objednávanie pribudne po tom, ako sa matica overí
      v pilote; dovtedy zmenu spraví predák.</p>
  </div>

  ${ludia.length ? kartaMenu(menu, jedla, po) : ""}
</section>`
  }));
}
