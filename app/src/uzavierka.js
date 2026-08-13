/* Uzávierka týždňa.

   Uzavretie je jediné miesto, kde appka niečo pošle von. Obrazovka je preto
   postavená tak, aby sa dalo pozrieť PRED odoslaním na to, čo pôjde von —
   počty, znenie správy aj adresu, na ktorú to má ísť. Až potom je tlačidlo.

   Nerozhodnutí ľudia sú tu vypísaní menovite a zámerne pred tlačidlom.
   Kto sa nevyjadril, ten obed nedostane; keby to obrazovka zhrnula do
   čísla „14 nerozhodnutých", nikto by sa nedozvedel, že medzi nimi je celá
   jedna zmena, ktorej predák zabudol uložiť maticu. */

import { stranka, esc, mnoho } from "./html.js";
import { jeden, zapis } from "./db.js";
import { DNI, dnes, pondelok, posun, dniTyzdna, denMesiac, tyzdenPopis } from "./datum.js";
import { poctyZaTyzden, textObjednavky, posliObjednavky, odoslania, cakaNaOpravu } from "./objednavka.js";
import { postaJeNastavena } from "./posta.js";

const cas = h => h ? new Date(h).toLocaleString("sk-SK",
  { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export async function zobraz(k) {
  const po = pondelok(k.url.searchParams.get("tyzden") || dnes());
  const dni = dniTyzdna(po);
  const zamok = await jeden(`
    SELECT t.*, o.meno, o.priezvisko FROM tyzden_stav t
      LEFT JOIN osoba o ON o.id = t.uzavrel_id
     WHERE t.pondelok = $1`, [po]);
  const poskytovatelia = await poctyZaTyzden(po);
  const poslane = await odoslania(po);
  /* Čo sa v matici zmenilo odvtedy, čo objednávka odišla. Kým sa oprava
     nepošle, kuchyňa varí podľa starých počtov — tak to nesmie byť schované. */
  const opravy = await cakaNaOpravu(poskytovatelia, po);
  const sprava = k.url.searchParams.get("sprava");
  const chyba = k.url.searchParams.get("chyba");

  const odkaz = (t, popis) => `<a class="btn" href="/uzavierka?tyzden=${t}">${esc(popis)}</a>`;
  const spolu = poskytovatelia.reduce((a, p) => a + p.spolu, 0);

  /* Bez adresy sa objednávka nemá kam poslať. Je to najčastejšia príčina, prečo
     by uzávierka zlyhala, a dá sa to zistiť dopredu — tak sa to aj hlási. */
  const bezAdresy = poskytovatelia.filter(p => p.spolu && !(p.jedalen.email ?? "").trim());

  const karta = p => {
    const nerozhodnuti = p.nerozhodnuti;
    const oprava = opravy.get(p.jedalen.id);
    return `
    <div class="card">
      <div class="card-head">
        <h3>${esc(p.jedalen.nazov)}</h3>
        <span class="hint">${p.spolu ? mnoho(p.spolu, ["obed", "obedy", "obedov"]) : "bez objednávok"}</span>
      </div>

      ${(p.jedalen.email ?? "").trim()
        ? `<p class="hint" style="margin:0 0 14px">Objednávka pôjde na
           <strong>${esc(p.jedalen.email)}</strong> — mení sa v
           <a href="/ciselnik?druh=jedalen&id=${p.jedalen.id}">Číselníkoch</a>.</p>`
        : `<div class="warnbox">Jedáleň nemá e-mailovú adresu, objednávka sa nemá kam poslať.
           Doplní sa v <a href="/ciselnik?druh=jedalen&id=${p.jedalen.id}">Číselníkoch</a>.</div>`}

      ${p.spolu ? `<div class="scroll-x"><table class="data">
        <thead><tr><th>Jedlo</th>
          ${dni.map((d, i) => `<th class="num">${DNI[i].slice(0, 2)}<span class="podriadok">${denMesiac(d)}</span></th>`).join("")}
          <th class="num">Spolu</th></tr></thead>
        <tbody>
          ${p.jedla.map(j => `<tr>
            <th class="oznak">${esc(j.znak)}</th>
            ${j.poDnoch.map(n => `<td class="num">${n || ""}</td>`).join("")}
            <td class="num"><strong>${j.spolu}</strong></td>
          </tr>`).join("")}
          <tr class="sucet"><th>Spolu</th>
            ${p.poDnoch.map(n => `<td class="num"><strong>${n || ""}</strong></td>`).join("")}
            <td class="num"><strong>${p.spolu}</strong></td></tr>
        </tbody>
      </table></div>

      <details style="margin-top:14px">
        <summary class="btn">Ukázať, čo presne odíde</summary>
        <pre class="znenie">${esc(textObjednavky(p, null))}</pre>
      </details>` : ""}

      ${oprava ? `
        <div class="warnbox" style="margin-top:14px">
          <strong>Od odoslania objednávky (${esc(oprava.kedy)}) sa počty zmenili.</strong>
          Kým sa oprava nepošle, kuchyňa varí podľa starých čísel.
          <pre class="znenie">${esc(oprava.zmeny.join("\n"))}</pre>
          <form method="post" action="/uzavierka/oprava" style="margin-top:10px">
            <input type="hidden" name="znamka" value="${esc(k.csrf)}">
            <input type="hidden" name="tyzden" value="${po}">
            <input type="hidden" name="jedalen" value="${p.jedalen.id}">
            <button class="btn primary" type="submit">Poslať opravu do ${esc(p.jedalen.nazov)}</button>
          </form>
        </div>` : ""}

      ${nerozhodnuti.length ? `
        <div class="warnbox" style="margin-top:14px">
          <strong>${mnoho(nerozhodnuti.length, ["človek sa nevyjadril", "ľudia sa nevyjadrili", "ľudí sa nevyjadrilo"])}.</strong>
          Kto sa nevyjadrí, obed nedostane. Ešte sa to dá dobehnúť v matici predáka.
          <ul class="zoznam-mien">
            ${nerozhodnuti.map(n => `<li>${esc(n.priezvisko)} ${esc(n.meno)}
              <span class="hint">· ${esc(n.tim ?? "bez tímu")} · ${mnoho(n.dni, ["deň", "dni", "dní"])}</span></li>`).join("")}
          </ul>
        </div>` : ""}
    </div>`;
  };

  k.html(k.odp, 200, stranka({
    titulok: "Uzávierka týždňa", osoba: k.osoba, cesta: "/uzavierka", verzia: k.verzia, siroka: true,
    obsah: `
<section class="wrap wide">
  <div class="screen-head">
    <h2>Uzávierka týždňa</h2>
    <span class="who">${zamok?.uzavrety ? "uzavretý" : "otvorený"}</span>
  </div>

  ${sprava ? `<div class="okbox">${esc(sprava)}</div>` : ""}
  ${chyba ? `<div class="warnbox">${esc(chyba)}</div>` : ""}

  <div class="deadline">
    <span class="lbl">Týždeň</span>
    <span class="val">${tyzdenPopis(po)}</span>
    <span style="margin-left:auto" class="btn-row">
      ${odkaz(posun(po, -7), "← predchádzajúci")}
      ${odkaz(pondelok(dnes()), "tento týždeň")}
      ${odkaz(posun(po, 7), "nasledujúci →")}
    </span>
  </div>

  ${!postaJeNastavena() ? `<div class="warnbox">Odosielanie pošty nie je na serveri nastavené
    (SMTP_HOST, SMTP_MENO, SMTP_HESLO). Týždeň sa uzavrieť dá, ale objednávka neodíde.</div>` : ""}
  ${bezAdresy.length ? `<div class="warnbox">Bez e-mailovej adresy:
    ${bezAdresy.map(p => esc(p.jedalen.nazov)).join(", ")}. Objednávka sa nemá kam poslať.</div>` : ""}

  ${poskytovatelia.map(karta).join("")}

  <div class="card">
    <div class="card-head"><h3>${zamok?.uzavrety ? "Týždeň je uzavretý" : "Uzavrieť a odoslať"}</h3></div>
    ${zamok?.uzavrety
      ? `<p style="margin:0 0 14px">Uzavrel ${esc(zamok.priezvisko ? zamok.meno + " " + zamok.priezvisko : "správca")} ${esc(cas(zamok.uzavrete_kedy))}.
         ${opravy.size
           ? "<strong>Niečo sa odvtedy zmenilo — opravu pošlete tlačidlom pri jedálni vyššie.</strong>"
           : "Matica sa dá meniť ďalej; každá zmena si vyžiada opravu, ktorá sa pošle odtiaľto."}</p>
         <form method="post" action="/uzavierka/otvorit">
           <input type="hidden" name="znamka" value="${esc(k.csrf)}">
           <input type="hidden" name="tyzden" value="${po}">
           <button class="btn" type="submit">Označiť ako neuzavretý</button>
           <p class="hint" style="margin:8px 0 0">Len značka — objednávka, ktorá odišla,
           sa tým neruší. Slúži na to, keď sa týždeň uzavrel omylom.</p>
         </form>`
      : `<p style="margin:0 0 14px">Uzavretím objednávka odíde jedálňam${spolu ? ` — spolu ${mnoho(spolu, ["obed", "obedy", "obedov"])}` : ""}.
         ${poskytovatelia.some(p => p.nerozhodnuti.length)
           ? "<strong>Nerozhodnutí ľudia obed nedostanú.</strong>" : ""}</p>
         <form method="post" action="/uzavierka/uzavriet">
           <input type="hidden" name="znamka" value="${esc(k.csrf)}">
           <input type="hidden" name="tyzden" value="${po}">
           <button class="btn primary" type="submit"${spolu ? "" : " disabled"}>
             Uzavrieť týždeň a odoslať objednávky</button>
           ${spolu ? "" : `<p class="hint" style="margin:8px 0 0">Zatiaľ nie je čo objednať.</p>`}
         </form>`}
  </div>

  ${poslane.length ? `<div class="card">
    <div class="card-head"><h3>Čo odišlo</h3>
      <span class="hint">${mnoho(poslane.length, ["odoslanie", "odoslania", "odoslaní"])}</span></div>
    <div class="scroll-x"><table class="data">
      <thead><tr><th>Jedáleň</th><th>Komu</th><th class="num">Porcií</th>
        <th>Odoslané</th><th>Stav</th><th>Potvrdené</th><th></th></tr></thead>
      <tbody>
        ${poslane.map(o => `<tr${o.nahradene ? ' class="is-off"' : ""}>
          <td>${esc(o.jedalen)}</td>
          <td>${esc(o.komu ?? "—")}${o.kopia ? `<span class="podriadok">kópia ${esc(o.kopia)}</span>` : ""}</td>
          <td class="num">${o.porcii}</td>
          <td>${esc(cas(o.odoslane))}</td>
          <td>${o.stav === "ok"
            ? `<span class="badge ok">odoslané</span>${
                o.nahradene ? '<span class="badge">nahradené</span>' : ""}`
            : `<span class="badge zle">zlyhalo</span> <span class="hint">${esc(o.chyba ?? "")}</span>`}</td>
          <td>${o.potvrdene
            ? `<span class="badge ok">${esc(cas(o.potvrdene))}</span>`
            : o.nahradene ? '<span class="hint">už netreba</span>'
            : '<span class="hint">čaká sa</span>'}</td>
          <td class="akcie"><details><summary class="btn">znenie</summary>
            <pre class="znenie">${esc(o.telo ?? "")}</pre></details></td>
        </tr>`).join("")}
      </tbody>
    </table></div>
    <div class="note">
      <strong>Odoslané a potvrdené sú dve rôzne veci.</strong> „Odoslané" znamená, že
      správu prijal poštový server jedálne — o tom, či ju niekto videl, to nehovorí nič.
      Preto je v objednávke odkaz s tlačidlom a potvrdenie sa zapíše až po jeho stlačení.
      Druhé odoslanie na ten istý týždeň odchádza ako <strong>oprava</strong> a je v ňom
      napísané, čo sa mení; predchádzajúce sa označí ako nahradené a jeho odkaz na
      potvrdenie prestane platiť — dodávateľ potvrdzuje konkrétne čísla, nie e-mail.
    </div>
  </div>` : ""}
</section>`
  }));
}

/* ---------- uzavretie ---------- */

export async function uzavriet(k) {
  const po = pondelok(k.data.tyzden || dnes());
  const spat = (kluc, t) => k.inam(k.odp, `/uzavierka?tyzden=${po}&${kluc}=` + encodeURIComponent(t));

  const zamok = await jeden("SELECT * FROM tyzden_stav WHERE pondelok = $1", [po]);
  if (zamok?.uzavrety) return spat("chyba", "Týždeň už bol uzavretý.");

  /* Najprv zámok, až potom odosielanie. Keby sa poslalo skôr, dva klikov
     za sebou by poslali objednávku dvakrát. */
  await jeden(`
    INSERT INTO tyzden_stav (pondelok, uzavrety, uzavrel_id, uzavrete_kedy)
    VALUES ($1, true, $2, now())
    ON CONFLICT (pondelok) DO UPDATE SET
      uzavrety = true, uzavrel_id = EXCLUDED.uzavrel_id, uzavrete_kedy = now()
    RETURNING pondelok`, [po, k.osoba.id]);

  const vysledky = await posliObjednavky(po, k.osoba.id);
  await zapis(k.osoba.id, "tyzden.uzavrety", { tyzden: po, odoslani: vysledky });

  const ok = vysledky.filter(v => v.ok);
  const zle = vysledky.filter(v => !v.ok);
  const casti = [];
  if (ok.length) casti.push(`Odoslané: ${ok.map(v => `${v.jedalen} (${v.porcii} ks → ${v.komu})`).join(", ")}.`);
  if (!vysledky.length) casti.push("Týždeň je uzavretý. Odosielať nebolo čo.");
  else if (!zle.length) casti.push("Týždeň je uzavretý.");

  return k.inam(k.odp, `/uzavierka?tyzden=${po}` +
    (casti.length ? "&sprava=" + encodeURIComponent(casti.join(" ")) : "") +
    (zle.length ? "&chyba=" + encodeURIComponent(
      "Neodoslané: " + zle.map(v => `${v.jedalen} — ${v.chyba}`).join("; ") +
      ". Týždeň je uzavretý, objednávku treba poslať inak.") : ""));
}

/* Oprava jednej jedálni. Neuzatvára ani neotvára nič — pošle to, čo je
   v matici teraz, a rozdiel oproti tomu, čo už kuchyňa dostala. */
export async function oprava(k) {
  const po = pondelok(k.data.tyzden || dnes());
  const jedalenId = Number(k.data.jedalen);
  const [v] = await posliObjednavky(po, k.osoba.id, jedalenId);
  await zapis(k.osoba.id, "objednavka.oprava", { tyzden: po, jedalen: jedalenId, vysledok: v ?? null });

  if (!v) return k.inam(k.odp, `/uzavierka?tyzden=${po}&chyba=` +
    encodeURIComponent("Nebolo čo poslať — na tento týždeň nemá tá jedáleň ani jednu porciu."));
  return k.inam(k.odp, `/uzavierka?tyzden=${po}&` + (v.ok
    ? "sprava=" + encodeURIComponent(`Oprava odoslaná: ${v.jedalen} (${v.porcii} ks → ${v.komu}).`)
    : "chyba=" + encodeURIComponent(`Oprava neodišla: ${v.jedalen} — ${v.chyba}.`)));
}

export async function otvorit(k) {
  const po = pondelok(k.data.tyzden || dnes());
  await jeden("UPDATE tyzden_stav SET uzavrety = false WHERE pondelok = $1 RETURNING pondelok", [po]);
  await zapis(k.osoba.id, "tyzden.otvoreny", { tyzden: po });
  return k.inam(k.odp, `/uzavierka?tyzden=${po}&sprava=` + encodeURIComponent(
    "Týždeň je otvorený. Čo už odišlo, odišlo — po zmenách treba poslať opravu."));
}
