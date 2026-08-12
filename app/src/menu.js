/* Menu na týždeň.

   Koncept 18: názvy jedál sú voliteľné, príloha je plnohodnotná. Jedálne
   posielajú lístok ako PDF a prepisovať ho do appky je práca navyše —
   predákovi stačí, keď si ho otvorí. Názvy sa dopĺňajú vtedy, keď niekomu
   stojí za to ich napísať; matica funguje aj bez nich, lebo označenia
   (1–5, A–E) určuje jedáleň, nie menu. */

import { stranka, esc, mnoho } from "./html.js";
import { bazen, jeden, vsetky, zapis } from "./db.js";
import { DNI, dnes, pondelok, dniTyzdna, denMesiac, tyzdenPopis, oznacenie } from "./datum.js";
import { precitaj, zTextu } from "./listok.js";

/* Polievka nie je voľba — je k obedu vždy a nikto si ju neobjednáva zvlášť.
   V mriežke jedál preto nemá poradie; drží sa pod −1, aby sa dala uložiť
   a zobraziť ako všetko ostatné, ale medzi ponúkané jedlá sa nedostala. */
export const POLIEVKA = -1;

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
  return { ...m,
           nazov: (den, poradie) => podla.get(`${den}|${poradie}`) ?? null,
           polievka: den => podla.get(`${den}|${POLIEVKA}`) ?? null };
}

/* ---------- komu lístok patrí ---------- */

const cifry = s => String(s ?? "").replace(/\D/g, "").replace(/^421/, "0");

/* Dva nezávislé znaky toho, že lístok je od inej jedálne, než ku ktorej sa
   vkladá:

   1. Označenie jedál. GASTROGAL čísluje 1–5, ABM používa A–E — a je to
      údaj z karty jedálne, takže netreba nič doplniť, aby to fungovalo.
   2. Kontakt v pätičke. Keď je v texte e-mail alebo telefón, ktorý v číselníku
      patrí inej jedálni, je to jednoznačné.

   Kontrolovať to treba preto, že sa to nijako neprejaví: vložený ABM lístok
   sa do GASTROGALu vyplní bez zaváhania a predák by v matici videl päť
   správne vyzerajúcich názvov jedál, ktoré sa v tej kuchyni v ten deň
   nevaria. */
function komuPatri(v, vybrana, jedalne) {
  const patriPodlaKontaktu = j =>
    (j.email && v.kontakty?.maily.includes(j.email.trim().toLowerCase())) ||
    (j.telefon && cifry(j.telefon).length >= 9 && v.kontakty?.cisla.includes(cifry(j.telefon)));

  const podlaKontaktu = jedalne.find(patriPodlaKontaktu);
  if (podlaKontaktu && podlaKontaktu.id !== vybrana.id)
    return { ina: podlaKontaktu, dovod: `v pätičke je kontakt jedálne ${podlaKontaktu.nazov}` };

  /* Označenie rozhoduje len vtedy, keď je z čoho: pri dvoch nájdených jedlách
     by to bola hádka, nie kontrola. A keď kontakt potvrdil, že je to tá
     správna jedáleň, značeniu už netreba veriť viac než jemu. */
  if (podlaKontaktu?.id === vybrana.id || !v.znacenie || v.najdene.size < 3) return null;
  const cakaSa = ["upper", "lower"].includes(vybrana.znacenie) ? "pismena" : "cisla";
  if (v.znacenie === cakaSa) return null;

  const ina = jedalne.find(j => j.id !== vybrana.id &&
    (["upper", "lower"].includes(j.znacenie) ? "pismena" : "cisla") === v.znacenie);
  return { ina, dovod: v.znacenie === "pismena"
    ? `jedlá sú označené písmenami, ${vybrana.nazov} ich čísluje`
    : `jedlá sú očíslované, ${vybrana.nazov} ich označuje písmenami` };
}

/* ---------- obrazovka ---------- */

/* `zvonku` naplní čítanie vloženého textu — to sa nedá presmerovať späť na
   GET, lebo pár tisíc znakov sa do adresy nezmestí. Obrazovka sa preto po
   vložení vykreslí rovno z POST-u; nič sa neukladá, tak nie je čo pokaziť
   opakovaným odoslaním. */
export async function zobraz(k, zvonku = {}) {
  const po = pondelok(zvonku.tyzden || k.url.searchParams.get("tyzden") || dnes());
  const jedalne = await vsetky("SELECT * FROM poskytovatel WHERE aktivny ORDER BY nazov");
  if (!jedalne.length)
    return k.html(k.odp, 200, stranka({
      titulok: "Menu", osoba: k.osoba, cesta: "/menu", verzia: k.verzia,
      obsah: `<section class="wrap"><div class="screen-head"><h2>Menu na týždeň</h2></div>
        <div class="card"><p style="margin:0">Zatiaľ nie je žiadna jedáleň.
        Založí sa v <a href="/ciselniky">Číselníkoch</a>.</p></div></section>`
    }));

  const dni = dniTyzdna(po);
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");
  const smieMenit = k.osoba.je_admin;

  /* Ktorej jedálne sa týka to, čo prišlo zvonku — návrh z vloženého textu
     alebo prečítanie z prílohy. Obrazovka ukazuje všetky jedálne pod sebou,
     tak sa hláška aj podfarbené políčka musia dostať len k tej jednej. */
  const ktora = Number(zvonku.jedalen || k.url.searchParams.get("jedalen")) || 0;

  const odkaz = (t, popis) =>
    `<a class="btn" href="/menu?tyzden=${t}">${esc(popis)}</a>`;

  /* Jedna jedáleň = jedna karta s vlastným formulárom. Prepínanie medzi
     jedálňami tu bolo zbytočné: pri dvoch dodávateľoch sa lístky zadávajú
     v jeden deň a preklikávanie znamenalo dvakrát prejsť tú istú cestu. */
  const karty = [];
  for (const j of jedalne) {
    const m = await menuTyzdna(j.id, po);
    const tato = j.id === ktora;

    let navrh = tato ? zvonku.navrh ?? null : null;
    let navrhPolievky = tato ? zvonku.navrhPolievky ?? null : null;
    let navrhChyba = tato ? zvonku.navrhChyba ?? null : null;
    let inaJedalen = tato ? zvonku.inaJedalen ?? null : null;
    let inyTyzden = tato ? zvonku.inyTyzden ?? null : null;
    let zdroj = zvonku.zdroj ?? "vloženého textu";

    /* Návrh z priloženého lístka. Číta sa až na požiadanie a nikdy sa neuloží
       sám — vypíše sa do políčok a človek ho potvrdí tlačidlom Uložiť. Lístok
       robí dodávateľ a môže si ho kedykoľvek prerobiť; keby appka zapisovala
       potichu, pokazené čítanie by si nikto nevšimol. */
    if (tato && !navrh && !navrhChyba && !inaJedalen && !inyTyzden &&
        k.url.searchParams.get("navrh") && m?.priloha_nazov) {
      const p = await jeden("SELECT priloha_data FROM menu_tyzden WHERE id = $1", [m.id]);
      const v = precitaj(m.priloha_nazov, m.priloha_typ, p.priloha_data);
      zdroj = "prílohy";
      const cudzia = v.podarilo ? komuPatri(v, j, jedalne) : null;
      /* Lístok si nesie vlastné dátumy aj označenie jedál. Keď nesedia,
         návrh sa nevypíše — inak by stačilo stlačiť Uložiť a do tohto týždňa
         by sa ticho dostalo menu z iného týždňa alebo od iného dodávateľa. */
      if (cudzia) inaJedalen = cudzia;
      else if (v.podarilo && v.tyzden && v.tyzden !== po) inyTyzden = v.tyzden;
      else if (v.podarilo) { navrh = v.najdene; navrhPolievky = v.polievky; }
      else navrhChyba = v.dovod;
    }

    const hodnota = (den, poradie) => poradie === POLIEVKA
      ? [m?.polievka(den), navrhPolievky?.get(den)]
      : [m?.nazov(den, poradie), navrh?.get(`${den}|${poradie}`)];

    const policko = (den, poradie, popis) => {
      const [ulozene, navrhnute] = hodnota(den, poradie);
      return `<td><input type="text" name="${poradie === POLIEVKA ? `pol-${den}` : `j-${den}-${poradie}`}"
        value="${esc(ulozene ?? navrhnute ?? "")}"
        ${!ulozene && navrhnute ? 'class="navrh"' : ""}
        ${smieMenit ? "" : "readonly"}
        aria-label="${DNI[den]}, ${esc(popis)}"></td>`;
    };

    karty.push(`
<details class="listok" open>
  <summary class="btn">Jedálny lístok — ${esc(j.nazov)}</summary>
  <form method="post" action="/menu" enctype="multipart/form-data" class="card">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <input type="hidden" name="jedalen" value="${j.id}">
    <input type="hidden" name="tyzden" value="${po}">

    ${m?.priloha_nazov
      ? `<p style="margin:0 0 12px">Priložené:
          <a href="/menu/priloha?jedalen=${j.id}&tyzden=${po}">${esc(m.priloha_nazov)}</a>
          <span class="hint">(${Math.round(m.priloha_velkost / 1024)} kB)</span>
          ${smieMenit ? ` · <a href="/menu?jedalen=${j.id}&tyzden=${po}&navrh=1">prečítať z neho názvy</a>` : ""}</p>`
      : `<p class="hint" style="margin:0 0 12px">Zatiaľ bez prílohy.</p>`}

    ${navrh ? `<div class="okbox">Z ${esc(zdroj)} som prečítal
        ${mnoho(navrh.size, ["názov jedla", "názvy jedál", "názvov jedál"])} — sú
        <strong>podfarbené</strong> nižšie. <strong>Nič sa zatiaľ neuložilo.</strong>
        Prejdite ich očami a stlačte Uložiť; čo je zle, prepíšte.</div>` : ""}
    ${navrhChyba ? `<div class="warnbox">Z ${esc(zdroj)} sa názvy prečítať nedali:
        ${esc(navrhChyba)}. Dajú sa dopísať ručne — príloha funguje aj tak.</div>` : ""}
    ${inaJedalen ? `<div class="warnbox"><strong>Pozor, cudzí lístok.</strong>
        Tento lístok podľa všetkého nie je od jedálne ${esc(j.nazov)} —
        ${esc(inaJedalen.dovod)}. Nič som nevyplnil.
        ${inaJedalen.ina ? `<div class="btn-row" style="margin-top:10px">
             ${zdroj === "vloženého textu"
               ? `<button class="btn" type="submit" formaction="/menu/text"
                        name="jedalen_ina" value="${inaJedalen.ina.id}">Prečítať pre ${esc(inaJedalen.ina.nazov)}</button>`
               : `<a class="btn" href="/menu?jedalen=${inaJedalen.ina.id}&tyzden=${po}&navrh=1">Prejsť na ${esc(inaJedalen.ina.nazov)}</a>`}
           </div>`
          : `<p class="hint" style="margin:8px 0 0">Ak je to omyl a lístok naozaj patrí sem,
             názvy sa dajú dopísať ručne.</p>`}
      </div>` : ""}
    ${inyTyzden ? `<div class="warnbox"><strong>Pozor, iný týždeň.</strong>
        Podľa dátumov je tento lístok na týždeň <strong>${tyzdenPopis(inyTyzden)}</strong>,
        ale na obrazovke máte ${tyzdenPopis(po)}. Nič som nevyplnil — takto by sa
        dalo omylom uložiť menu na nesprávny týždeň.
        ${zdroj === "vloženého textu"
          ? `<div class="btn-row" style="margin-top:10px">
               <button class="btn" type="submit" formaction="/menu/text"
                       name="tyzden_iny" value="${esc(inyTyzden)}">Prečítať na ${tyzdenPopis(inyTyzden)}</button>
             </div>`
          : `<div class="btn-row" style="margin-top:10px">
               <a class="btn" href="/menu?jedalen=${j.id}&tyzden=${esc(inyTyzden)}&navrh=1">Prejsť na ${tyzdenPopis(inyTyzden)}</a>
             </div>`}
      </div>` : ""}

    ${smieMenit ? `
      <div class="field">
        <label for="p-priloha-${j.id}">Nahrať lístok (PDF alebo fotka)</label>
        <input type="file" id="p-priloha-${j.id}" name="priloha" accept=".pdf,image/*">
        <p class="hint">Nahratím sa nahradí ten predchádzajúci. Najviac 8 MB.</p>
      </div>

      <details class="vlozenie"${tato && zvonku.vlozeny ? " open" : ""}>
        <summary class="btn">Vložiť lístok ako text (Ctrl+C / Ctrl+V)</summary>
        <div class="field" style="margin-top:12px">
          <label for="p-vlozeny-${j.id}">Text lístka</label>
          <textarea id="p-vlozeny-${j.id}" name="vlozeny" rows="8"
            placeholder="Otvorte lístok, označte ho celý (Ctrl+A), skopírujte (Ctrl+C) a sem vložte (Ctrl+V).">${esc(tato ? zvonku.vlozeny ?? "" : "")}</textarea>
          <p class="hint">Text sa nikam neukladá — slúži len na prečítanie názvov.
            Funguje aj vtedy, keď sa zo súboru prečítať nedajú.</p>
        </div>
        <div class="btn-row">
          <button class="btn" type="submit" formaction="/menu/text">Prečítať názvy z textu</button>
        </div>
      </details>` : ""}

    <div class="scroll-x"><table class="data listok-tab menu-mriezka" style="margin-top:18px">
      <thead><tr><th></th>
        ${dni.map((d, i) => `<th>${DNI[i]}<span class="podriadok">${denMesiac(d)}</span></th>`).join("")}
      </tr></thead>
      <tbody>
        <tr class="polievka-riadok">
          <th class="oznak" title="Polievka a dezert — nie sú na výber, patria k obedu">P</th>
          ${dni.map((_, den) => policko(den, POLIEVKA, "polievka")).join("")}
        </tr>
        ${Array.from({ length: j.pocet_jedal }, (_, poradie) => `<tr>
          <th class="oznak">${esc(oznacenie(j.znacenie, poradie))}</th>
          ${dni.map((_, den) => policko(den, poradie, `jedlo ${oznacenie(j.znacenie, poradie)}`)).join("")}
        </tr>`).join("")}
      </tbody>
    </table></div>
    <p class="swipe-hint">Tabuľka sa posúva vbok</p>

    ${smieMenit ? `<div class="btn-row" style="margin-top:16px">
      <button class="btn primary" type="submit">Uložiť ${esc(j.nazov)}</button>
    </div>` : `<p class="hint" style="margin-top:16px">Menu zadáva správca.</p>`}
  </form>
</details>`);
  }

  k.html(k.odp, 200, stranka({
    titulok: "Menu na týždeň", osoba: k.osoba, cesta: "/menu", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Menu na týždeň</h2>
    <span class="who">${mnoho(jedalne.length, ["jedáleň", "jedálne", "jedální"])}</span>
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

  <div class="listky">${karty.join("")}</div>

  <div class="note">
    <strong>Názvy sú nepovinné · P je polievka.</strong> Označenia jedál určuje jedáleň
    (${jedalne.map(j => `${esc(j.nazov)}: ${esc(Array.from({ length: j.pocet_jedal },
      (_, i) => oznacenie(j.znacenie, i)).join(" "))}`).join(" · ")}), takže matica funguje
    aj bez názvov. Vypĺňajú sa vtedy, keď stojí za to, aby predák nemusel otvárať prílohu.
    Každá jedáleň sa ukladá vlastným tlačidlom.
  </div>
</section>`
  }));
}

/* ---------- prečítanie z vloženého textu ---------- */

/* Nič neukladá — prečíta, čo sa dá, a vykreslí tú istú obrazovku s návrhom.
   Presmerovanie by tu bolo na škodu: text by sa stratil a človek by ho pri
   oprave musel vkladať znova. */
export async function zText(k) {
  const v = zTextu(k.data.vlozeny);
  /* `jedalen_ina` posiela tlačidlo z upozornenia — človek tým potvrdil,
     ku ktorej jedálni lístok naozaj patrí. */
  const jedalenId = k.data.jedalen_ina || k.data.jedalen;
  /* `tyzden_iny` posiela tlačidlo z upozornenia — je to potvrdenie od človeka,
     že áno, chcem ten týždeň, ktorý je v lístku. */
  const po = pondelok(k.data.tyzden_iny || k.data.tyzden || dnes());
  const jedalne = await vsetky("SELECT * FROM poskytovatel WHERE aktivny ORDER BY nazov");
  const vybrana = jedalne.find(j => j.id === Number(jedalenId)) ?? jedalne[0];

  const cudzia = v.podarilo && vybrana && !k.data.jedalen_ina
    ? komuPatri(v, vybrana, jedalne) : null;
  const inde = !cudzia && v.podarilo && v.tyzden && v.tyzden !== po;
  const dobre = v.podarilo && !cudzia && !inde;

  return zobraz(k, {
    jedalen: jedalenId, tyzden: po, vlozeny: k.data.vlozeny ?? "",
    zdroj: "vloženého textu",
    inaJedalen: cudzia, inyTyzden: inde ? v.tyzden : null,
    navrh: dobre ? v.najdene : null,
    navrhPolievky: dobre ? v.polievky : null,
    navrhChyba: v.podarilo ? null : v.dovod
  });
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
    let kolko = 0, polievok = 0;
    for (let den = 0; den < 5; den++) {
      const p = (k.data[`pol-${den}`] ?? "").trim();
      if (p) {
        await klient.query(
          "INSERT INTO menu_jedlo (menu_id, den, poradie, nazov) VALUES ($1,$2,$3,$4)",
          [m.id, den, POLIEVKA, p.slice(0, 200)]);
        polievok++;
      }
    }
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
                { jedalen: j.nazov, tyzden: po, nazvov: kolko, polievok,
                  priloha: priloha?.nazov ?? null });

    const casti = [];
    if (priloha) casti.push(`príloha ${priloha.nazov}`);
    casti.push(mnoho(kolko, ["názov jedla", "názvy jedál", "názvov jedál"]));
    if (polievok) casti.push(mnoho(polievok, ["polievka", "polievky", "polievok"]));

    /* Po nahratí lístka má zmysel rovno ponúknuť, čo sa z neho dá prečítať —
       ale len keď názvy ešte nie sú vyplnené, aby sa nič neprebilo. */
    if (priloha && kolko === 0 && polievok === 0)
      return k.inam(k.odp, `/menu?jedalen=${jedalenId}&tyzden=${po}&navrh=1&sprava=` +
        encodeURIComponent(`Uložené: ${casti.join(", ")}.`));
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
