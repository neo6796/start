/* Zmena vlastného hesla.

   Heslo sa nedá nikde pozrieť — v databáze je len jeho odtlačok a to je
   zámer, nie chýbajúca funkcia. Jediné, čo sa s ním dá robiť, je nastaviť
   nové: sám sebe tu, alebo cez správcu, ktorý vygeneruje nové.

   Staré heslo sa pýta aj od prihláseného človeka. Bez toho by stačil odložený
   telefón na stole a ktokoľvek by si cudzí účet prepísal na seba. */

import { stranka, esc } from "./html.js";
import { dopyt, zapis } from "./db.js";
import { hashHesla, sediHeslo, najmenejZnakov, zrusOstatne } from "./relacia.js";

export async function zobraz(k, zvonku = {}) {
  const najmenej = najmenejZnakov(k.osoba);
  k.html(k.odp, 200, stranka({
    titulok: "Moje heslo", osoba: k.osoba, cesta: "/heslo", verzia: k.verzia,
    obsah: `
<section class="wrap" style="max-width:620px">
  <div class="screen-head">
    <h2>Moje heslo</h2>
    <span class="who">${esc(k.osoba.kod_dochadzka ?? "")}</span>
  </div>

  ${zvonku.sprava ? `<div class="okbox">${esc(zvonku.sprava)}</div>` : ""}
  ${zvonku.chyba ? `<div class="warnbox">${esc(zvonku.chyba)}</div>` : ""}

  <form method="post" action="/heslo" class="card">
    <input type="hidden" name="znamka" value="${esc(k.csrf)}">
    <div class="field">
      <label for="p-stare">Doterajšie heslo</label>
      <input type="password" id="p-stare" name="stare" autocomplete="current-password" required>
    </div>
    <div class="field">
      <label for="p-nove">Nové heslo</label>
      <input type="password" id="p-nove" name="nove" autocomplete="new-password"
             minlength="${najmenej}" required>
      <p class="hint">Najmenej ${najmenej} znakov.</p>
    </div>
    <div class="field">
      <label for="p-znova">Nové heslo ešte raz</label>
      <input type="password" id="p-znova" name="znova" autocomplete="new-password"
             minlength="${najmenej}" required>
    </div>
    <button class="btn primary" type="submit">Zmeniť heslo</button>
    <div class="note">
      Zmenou sa odhlásite zo všetkých ostatných zariadení — tu ostanete prihlásený.
      Ak ste heslo zabudli, nedá sa nikde pozrieť: v databáze je len jeho odtlačok.
      Nové vám vygeneruje správca.
    </div>
  </form>
</section>`
  }));
}

export async function uloz(k) {
  const stare = k.data.stare ?? "";
  const nove = k.data.nove ?? "";
  const znova = k.data.znova ?? "";
  const najmenej = najmenejZnakov(k.osoba);
  const zle = t => zobraz(k, { chyba: t });

  if (!(await sediHeslo(stare, k.osoba.heslo_hash)))
    return zle("Doterajšie heslo nesedí. Nič sa nezmenilo.");
  if (nove !== znova) return zle("Nové heslá sa nezhodujú. Nič sa nezmenilo.");
  if (nove.length < najmenej) return zle(`Nové heslo musí mať aspoň ${najmenej} znakov.`);
  if (nove === stare) return zle("Nové heslo je rovnaké ako doterajšie. Nič sa nezmenilo.");
  /* Osobné číslo ako heslo pozná každý, kto videl dochádzkový list. */
  if (k.osoba.kod_dochadzka && nove.trim() === k.osoba.kod_dochadzka.trim())
    return zle("Osobné číslo sa ako heslo použiť nedá — pozná ho každý.");

  await dopyt("UPDATE osoba SET heslo_hash = $2 WHERE id = $1",
              [k.osoba.id, await hashHesla(nove)]);
  await zrusOstatne(k.osoba.id, k.token);
  await zapis(k.osoba.id, "heslo.zmenene", {});
  return zobraz(k, { sprava: "Heslo je zmenené. Na ostatných zariadeniach sa treba prihlásiť znova." });
}
