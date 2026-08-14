/* Spätný zápis — zaznamenať obed, ktorý sa už zjedol (koncept 4.5a).

   Je to iná operácia než zmena v matici. Tam sa mení niečo, čo appka pošle
   alebo poslala. Tu sa dopisuje niečo, čo sa stalo **mimo nej**: obed
   objednaný telefónom, na papieri alebo pred spustením appky.

   Prvé použitie príde hneď pri nábehu. Pilot sa nezačne prvého v mesiaci,
   ale mzdový podklad musí byť za celý mesiac — spätný zápis je jediný
   spôsob, ako sa mesiac uzavrie správne.

   Tri veci ho odlišujú, a všetky tri sú tu naschvál nepohodlné:
     · smie ho robiť len správca, do otvoreného mesiaca a s dôvodom,
     · dodávateľovi sa **nič neposiela** — obed sa už uvaril a zjedol,
     · na dni ostáva príznak natrvalo a uzávierka počet ukazuje.

   Je to diera v disciplíne, ktorú má appka vytvárať. Preto je vidieť: keby
   bol spätný zápis pohodlný a tichý, termíny by o pol roka prestali čokoľvek
   znamenať — vždy sa to dá dopísať potom. */

import { stranka, esc, mnoho } from "./html.js";
import { bazen, jeden, vsetky, zapis } from "./db.js";
import { DNI_SKRATKA, dnes, denMesiac, oznacenie,
         mesiacPopis, prvyVMesiaci, posunMesiac, pracovneDni } from "./datum.js";

const BEZ_OBEDA = -1;

/* ---------- čo sa smie ---------- */

/* Mesiac má dva zámky (rozhodnutie 46) a spätný zápis blokuje ktorýkoľvek:
   po uzavretí miezd by sa dopísaný obed nedostal do podkladu, po uzavretí
   faktúr by nesedel s tým, čo je odsúhlasené. Opravou zamknutého mesiaca je
   položka v ďalšom mesiaci (6.3), nie tichá zmena minulosti. */
async function zamok(prvy) {
  const m = await jeden("SELECT * FROM mesiac_stav WHERE mesiac = $1", [prvy]);
  if (!m) return null;
  if (m.mzdy_uzavrete) return "mzdy";
  if (m.faktury_uzavrete) return "faktúry";
  return null;
}

/* Dopisuje sa len to, čo sa už nedá objednať. Dnešok ani budúcnosť sem
   nepatria — tie ešte môžu prejsť normálnou cestou do kuchyne, a keby ich
   niekto zapísal sem, jedlo by sa nikdy neobjednalo a človek by ostal
   hladný s riadkom v podklade. */
function dniNaZapis(prvy) {
  const dnesJe = dnes();
  return pracovneDni(prvy).filter(d => d < dnesJe);
}

/* ---------- načítanie ---------- */

async function udaje(prvy, timId) {
  const dni = dniNaZapis(prvy);
  const jedalne = await vsetky("SELECT * FROM poskytovatel WHERE aktivny ORDER BY nazov");
  const timy = await vsetky("SELECT id, nazov FROM tim WHERE aktivny ORDER BY nazov");

  const ludia = await vsetky(`
    SELECT o.id, o.priezvisko, o.meno, o.kod_dochadzka, o.poskytovatel_id,
           t.nazov AS tim
      FROM osoba o
      LEFT JOIN tim t ON t.id = o.tim_id
     WHERE o.aktivny ${timId ? "AND o.tim_id = $1" : ""}
     ORDER BY t.nazov NULLS LAST, o.priezvisko, o.meno`, timId ? [timId] : []);

  const objednavky = new Map();
  const pridelenia = new Map();
  if (ludia.length && dni.length) {
    const idcka = ludia.map(o => o.id);
    for (const r of await vsetky(`
      SELECT osoba_id, datum::text AS datum, jedlo, poskytovatel_id, spatny_zapis
        FROM objednavka WHERE osoba_id = ANY($1) AND datum = ANY($2::date[])`,
      [idcka, dni]))
      objednavky.set(`${r.osoba_id}|${r.datum}`, r);

    for (const r of await vsetky(`
      SELECT oj.osoba_id, oj.poskytovatel_id
        FROM osoba_jedalen oj JOIN poskytovatel p ON p.id = oj.poskytovatel_id
       WHERE oj.osoba_id = ANY($1) AND p.aktivny
       ORDER BY p.nazov`, [idcka])) {
      if (!pridelenia.has(r.osoba_id)) pridelenia.set(r.osoba_id, []);
      pridelenia.get(r.osoba_id).push(r.poskytovatel_id);
    }
  }
  return { dni, jedalne, timy, ludia, objednavky, pridelenia };
}

/* Koľko obedov v mesiaci nikdy neprešlo objednávkou. Rovnaké číslo ukáže
   mesačná uzávierka — nemá sa stratiť. */
export async function poctySpatnych(prvy) {
  const r = await jeden(`
    SELECT count(*)::int AS kolko, count(DISTINCT osoba_id)::int AS ludi
      FROM objednavka
     WHERE datum >= $1 AND datum < $2 AND jedlo >= 0 AND spatny_zapis`,
    [prvy, posunMesiac(prvy, 1)]);
  return { kolko: r.kolko, ludi: r.ludi };
}

/* ---------- obrazovka ---------- */

/* Bunka je rozbaľovací zoznam, nie prepínače ako v matici. Mesiac je dvadsať
   stĺpcov namiesto piatich a šesť prepínačov v každom by sa na obrazovku
   nezmestili ani pri troch ľuďoch. Zoznam je jedno políčko, dá sa v ňom
   preskakovať klávesnicou a ukazuje presne to, čo je zapísané. */
function bunka(o, datum, zaznam, moje, jedalne) {
  const h = zaznam?.jedlo;
  const teraz = h === null || h === undefined ? "" : h === BEZ_OBEDA ? "x"
    : `${zaznam.poskytovatel_id}:${h}`;
  const moz = [["", "—"], ["x", "×"]];
  for (const jid of moje) {
    const j = jedalne.find(x => x.id === jid);
    if (!j) continue;
    /* Kto má dve jedálne, potrebuje pri označení aj to, z ktorej je. Označenie
       je vpredu, aby ho bolo vidieť aj v zúženom políčku. */
    for (let n = 0; n < j.pocet_jedal; n++)
      moz.push([`${jid}:${n}`, oznacenie(j.znacenie, n) +
                (moje.length > 1 ? ` — ${j.nazov}` : "")]);
  }
  return `<select name="b-${o.id}-${datum}" class="sp-bunka"
    aria-label="${esc(o.priezvisko)} ${esc(o.meno)}, ${denMesiac(datum)}">${
    moz.map(([v, t]) => `<option value="${esc(v)}"${v === teraz ? " selected" : ""}>${esc(t)}</option>`)
       .join("")}</select>`;
}

export async function obrazovka(k) {
  const prvy = prvyVMesiaci(k.url.searchParams.get("mesiac") || dnes());
  const timId = Number(k.url.searchParams.get("tim")) || null;
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");

  const zamknuty = await zamok(prvy);
  const { dni, jedalne, timy, ludia, objednavky, pridelenia } = await udaje(prvy, timId);
  const uz = await poctySpatnych(prvy);

  /* Vlastný zoznam mesiacov, nie `input type=month`: ten si prehliadač píše
     vo svojom jazyku a Erikovi by v ňom svietilo „July 2026". Zároveň je tu
     vidieť, do akého rozsahu má vôbec zmysel siahať — dopisuje sa mesiac,
     ktorý sa ešte len uzavrie, nie vlaňajšok. */
  const mesiace = [];
  for (let i = 0; i <= 5; i++) mesiace.push(posunMesiac(prvyVMesiaci(dnes()), -i));
  if (!mesiace.includes(prvy)) mesiace.push(prvy);
  mesiace.sort().reverse();

  const hlavicka = `
  <div class="screen-head">
    <h2>Spätný zápis</h2>
    <span class="who">${esc(mesiacPopis(prvy))}</span>
  </div>
  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  <form method="get" action="/spatne" class="card filtre">
    <div class="hromadne">
      <div class="field"><label for="f-mesiac">Mesiac</label>
        <select id="f-mesiac" name="mesiac">${mesiace.map(m =>
          `<option value="${m.slice(0, 7)}"${m === prvy ? " selected" : ""}>${esc(mesiacPopis(m))}</option>`
        ).join("")}</select></div>
      <div class="field"><label for="f-tim">Tím</label>
        <select id="f-tim" name="tim"><option value="">všetci</option>
          ${timy.map(t => `<option value="${t.id}"${t.id === timId ? " selected" : ""}>${esc(t.nazov)}</option>`).join("")}
        </select></div>
    </div>
    <button class="btn" type="submit">Zobraziť</button>
  </form>`;

  const vysvetlenie = `
  <div class="note">
    <strong>Čo sa tu robí.</strong> Dopisuje sa obed, ktorý sa už zjedol —
    objednaný telefónom, na papieri alebo ešte pred spustením appky.
    <strong>Dodávateľovi sa nič neposiela</strong>: jedlo je dávno uvarené,
    posielať naň objednávku by nedávalo zmysel. Zápis ide rovno do mzdového
    podkladu a na dni ostane príznak natrvalo — aby bolo o pol roka vidieť,
    ktoré porcie appka nikdy neobjednala.
    ${uz.kolko ? `<br><br>V mesiaci ${esc(mesiacPopis(prvy))} je zatiaľ <strong>${
      mnoho(uz.kolko, ["obed zadaný spätne", "obedy zadané spätne", "obedov zadaných spätne"])
      }</strong> (${mnoho(uz.ludi, ["človek", "ľudia", "ľudí"])}).` : ""}
  </div>`;

  let telo;
  if (zamknuty) {
    telo = `<div class="warnbox">Mesiac ${esc(mesiacPopis(prvy))} je uzavretý
      (${esc(zamknuty)}), dopisovať sa doň už nedá. Chýbajúci obed sa rieši ako
      položka v najbližšom otvorenom mesiaci — inak by sa zmenil podklad, ktorý
      už niekto odsúhlasil.</div>`;
  } else if (!dni.length) {
    telo = `<div class="infobox">V mesiaci ${esc(mesiacPopis(prvy))} zatiaľ nie je čo
      dopisovať. Spätne sa zapisujú len uplynulé dni; dnešok aj to, čo príde,
      sa objednáva v <a href="/tim">Môjom tíme</a> — tam to ešte stihne dôjsť
      do kuchyne.</div>`;
  } else if (!ludia.length) {
    telo = `<div class="infobox">Nikto nevyhovuje výberu.</div>`;
  } else {
    telo = `
  <form method="post" action="/spatne/uloz" class="card">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <input type="hidden" name="mesiac" value="${esc(prvy)}">
    <input type="hidden" name="tim" value="${timId ?? ""}">

    <div class="card-head"><h3>Uplynulé dni</h3>
      <span class="hint">${mnoho(dni.length, ["deň", "dni", "dní"])} ·
        ${mnoho(ludia.length, ["človek", "ľudia", "ľudí"])}</span></div>

    <div class="scroll-x"><table class="matrix uzka">
      <thead><tr><th>Stravník</th>
        ${dni.map(d => `<th><span class="dn">${DNI_SKRATKA[new Date(d + "T12:00:00Z").getUTCDay() - 1]}</span>
          <span class="dnum">${denMesiac(d)}</span></th>`).join("")}
      </tr></thead>
      <tbody>${ludia.map(o => {
        const moje = pridelenia.get(o.id) ?? (o.poskytovatel_id ? [o.poskytovatel_id] : []);
        const kto = `<span class="nm">${esc(o.priezvisko)} ${esc(o.meno)}</span>
          <span class="pn">${esc(o.kod_dochadzka ?? "—")}${
            timId ? "" : " · " + esc(o.tim ?? "bez tímu")}</span>`;
        if (!moje.length) return `<tr class="is-off"><th>${kto}</th>
          <td colspan="${dni.length}" class="bez-jedalne">Nemá pridelenú jedáleň,
            takže nie je za akú cenu obed zapísať.
            Prideľuje sa v <a href="/osoba?id=${o.id}">jeho údajoch</a>.</td></tr>`;
        return `<tr><th>${kto}</th>
          ${dni.map(d => {
            const z = objednavky.get(`${o.id}|${d}`);
            const prazdna = z?.jedlo === null || z?.jedlo === undefined;
            const triedy = [prazdna ? "gap" : "", z?.spatny_zapis ? "spatne" : ""].filter(Boolean);
            return `<td${triedy.length ? ` class="${triedy.join(" ")}"` : ""
              }>${bunka(o, d, z, moje, jedalne)}</td>`;
          }).join("")}
        </tr>`;
      }).join("")}</tbody>
    </table></div>
    <p class="swipe-hint">Tabuľka sa posúva vbok</p>

    <div class="legend">
      <span><i class="sw empty"></i> bez voľby — v ten deň nemal obed zapísaný nikto</span>
      <span><i class="sw spatne"></i> už zapísané spätne</span>
      <span>× nechcel obed · písmeno alebo číslo = jedlo z menu</span>
    </div>

    <div class="field" style="max-width:520px;margin-top:18px">
      <label for="p-dovod">Dôvod zápisu</label>
      <input type="text" id="p-dovod" name="dovod" required maxlength="200"
             placeholder="napr. nábeh appky — prepísané zo zberných hárkov">
      <p class="hint">Uloží sa ku každému dopísanému dňu. O rok to bude jediné,
        čo povie, prečo tam ten obed je.</p>
    </div>

    <div class="btn-row" style="margin-top:16px">
      <button class="btn primary" type="submit">Zapísať spätne</button>
    </div>
    <p class="hint" style="margin:12px 0 0">Zapíše sa len to, čo sa oproti
      terajšiemu stavu zmenilo. Dodávateľovi neodíde nič.</p>
  </form>`;
  }

  k.html(k.odp, 200, stranka({
    titulok: "Spätný zápis", osoba: k.osoba, cesta: "/spatne", verzia: k.verzia, siroka: true,
    obsah: `<section class="wrap wide">${hlavicka}${vysvetlenie}${telo}</section>`
  }));
}

/* ---------- uloženie ---------- */

export async function uloz(k) {
  const prvy = prvyVMesiaci(k.data.mesiac || dnes());
  const timId = Number(k.data.tim) || null;
  const kam = `/spatne?mesiac=${prvy.slice(0, 7)}${timId ? "&tim=" + timId : ""}`;
  const spat = (kluc, text) => k.inam(k.odp, `${kam}&${kluc}=` + encodeURIComponent(text));

  const dovod = (k.data.dovod ?? "").trim();
  if (!dovod) return spat("chyba", "Dôvod treba vyplniť — bez neho sa o rok nedá zistiť, čo sa stalo.");

  /* Zámok aj rozsah dní sa počítajú znova tu. Medzi zobrazením stránky
     a odoslaním formulára mohol niekto mesiac uzavrieť a deň mohol prejsť
     polnocou — a formulár sa dá poslať aj bez tejto obrazovky. */
  const zamknuty = await zamok(prvy);
  if (zamknuty) return spat("chyba",
    `Mesiac ${mesiacPopis(prvy)} je medzitým uzavretý (${zamknuty}). Nezapísalo sa nič.`);

  /* `dni` sa počítajú tu, nie z formulára — preto sa nedá poslať políčko na
     deň, ktorý ešte len príde, ani na deň mimo mesiaca. Políčka, ktoré k nim
     nepatria, sa jednoducho neprečítajú. */
  const { dni, jedalne, ludia, objednavky, pridelenia } = await udaje(prvy, timId);

  /* Obedy a „nechcel obed" sa počítajú zvlášť. Krížik je tiež spätný zápis —
     zaznamenáva rozhodnutie o dni — ale nie je to obed, a hlásiť ho ako obed
     by protirečilo počítadlu, ktoré ráta porcie do mzdového podkladu. */
  let obedov = 0, bezObeda = 0, zrusenych = 0, odmietnutych = 0;
  const klient = await bazen.connect();
  try {
    await klient.query("BEGIN");
    for (const o of ludia) {
      const moje = pridelenia.get(o.id) ?? (o.poskytovatel_id ? [o.poskytovatel_id] : []);
      if (!moje.length) continue;
      for (const d of dni) {
        const surove = k.data[`b-${o.id}-${d}`] ?? "";
        const stare = objednavky.get(`${o.id}|${d}`);
        const staraHodnota = stare?.jedlo ?? null;

        let jedlo = null, jedalenId = null;
        if (surove === "x") jedlo = BEZ_OBEDA;
        else if (surove) {
          const [jid, n] = surove.split(":").map(Number);
          const j = jedalne.find(x => x.id === jid);
          if (!j || !moje.includes(jid) || !(n >= 0 && n < j.pocet_jedal)) { odmietnutych++; continue; }
          jedlo = n; jedalenId = jid;
        }

        if (jedlo === staraHodnota &&
            (jedlo === null || jedlo === BEZ_OBEDA || stare?.poskytovatel_id === jedalenId)) continue;

        if (jedlo === null) {
          await klient.query("DELETE FROM objednavka WHERE osoba_id = $1 AND datum = $2", [o.id, d]);
          zrusenych++;
          continue;
        }

        /* Cena sa odfotí rovnako ako v matici (6.1) — z cenníka jedálne.
           Cenník zatiaľ históriu nemá, takže je to cena, ktorá platí teraz;
           keď história pribudne, číta sa tu cena ku dňu `d`. */
        const j = jedalenId ? jedalne.find(x => x.id === jedalenId) : null;
        const bezDph = j ? Number(j.cena_s_dph) / (1 + Number(j.sadzba_dph) / 100) : null;

        await klient.query(`
          INSERT INTO objednavka (osoba_id, datum, jedlo, poskytovatel_id, zadal_id, zadane_ako,
                                  spatny_zapis, dovod, cena_bez_dph, sadzba_dph, zmenene)
          VALUES ($1,$2,$3,$4,$5,'spatne', true, $6,$7,$8, now())
          ON CONFLICT (osoba_id, datum) DO UPDATE SET
            jedlo = EXCLUDED.jedlo, poskytovatel_id = EXCLUDED.poskytovatel_id,
            zadal_id = EXCLUDED.zadal_id, zadane_ako = EXCLUDED.zadane_ako,
            spatny_zapis = true, dovod = EXCLUDED.dovod,
            cena_bez_dph = EXCLUDED.cena_bez_dph, sadzba_dph = EXCLUDED.sadzba_dph,
            zmenene = now()`,
          [o.id, d, jedlo, jedalenId, k.osoba.id, dovod,
           bezDph === null ? null : bezDph.toFixed(4), j ? j.sadzba_dph : null]);
        if (jedlo === BEZ_OBEDA) bezObeda++; else obedov++;
      }
    }
    await klient.query("COMMIT");
  } catch (e) {
    await klient.query("ROLLBACK");
    klient.release();
    return spat("chyba", "Nezapísalo sa nič: " + e.message);
  }
  klient.release();

  await zapis(k.osoba.id, "spatny-zapis",
              { mesiac: prvy, obedov, bezObeda, zrusenych, odmietnutych, dovod });

  if (!obedov && !bezObeda && !zrusenych) return spat("sprava", "Nič sa nezmenilo.");
  const casti = [];
  if (obedov) casti.push(`${mnoho(obedov, ["obed zapísaný", "obedy zapísané", "obedov zapísaných"])} spätne`);
  if (bezObeda) casti.push(`${mnoho(bezObeda, ["deň bez obeda", "dni bez obeda", "dní bez obeda"])}`);
  if (zrusenych) casti.push(`${mnoho(zrusenych, ["zápis zrušený", "zápisy zrušené", "zápisov zrušených"])}`);
  return spat("sprava", casti.join(", ") + ". Dodávateľovi neodišlo nič." +
    (odmietnutych ? ` ${mnoho(odmietnutych, ["deň sa nezapísal", "dni sa nezapísali", "dní sa nezapísalo"])} — ` +
      "jedáleň nie je danému stravníkovi pridelená." : ""));
}
