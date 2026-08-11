/* Čítanie jedálneho lístka od dodávateľa.

   Obe jedálne posielajú lístok v inom tvare a obe sa dajú prečítať:
     GASTROGAL — PDF s textovou vrstvou, „1. Názov • 120g (1,3,7)"
     GASTRO ABM — Word 97 (.doc), „A.  Názov /120g, ryža"

   Pravidlo, na ktorom to celé stojí: TOTO LEN NAVRHUJE. Načítané názvy sa
   nikdy neuložia samy — vypíšu sa do formulára a človek ich potvrdí. Lístok
   robí dodávateľ a môže si ho kedykoľvek prerobiť; v ten deň sa čítanie
   pokazí a nikto sa to nedozvie, ak by appka zapisovala potichu.

   Preto sa tu aj nič nevaliduje do krajnosti: čo sa nepodarí prečítať,
   ostane prázdne a doplní sa ručne. */

import zlib from "node:zlib";

const DNI_NAZVY = ["Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok"];

/* ---------- PDF ---------- */

/* Text v PDF býva zakódovaný vlastnou tabuľkou fontu. Prevodné tabuľky
   (ToUnicode) sú v dokumente tiež, tak sa poskladajú dohromady. */
function cmapyZPdf(d) {
  const spolu = new Map();
  const hex = s => parseInt(s, 16);

  for (const m of d.toString("latin1").matchAll(/stream\r?\n/g)) {
    const zac = m.index + m[0].length;
    const kon = d.indexOf("endstream", zac, "latin1");
    if (kon < 0) continue;
    let r;
    try { r = zlib.inflateSync(d.subarray(zac, kon)); } catch { continue; }
    const t = r.toString("latin1");
    if (!t.includes("beginbfchar") && !t.includes("beginbfrange")) continue;

    /* Cieľ je UTF-16BE — číta sa po štyroch hex čísliciach. */
    const naZnaky = h => {
      let v = "";
      for (let i = 0; i + 4 <= h.length; i += 4) v += String.fromCharCode(parseInt(h.slice(i, i + 4), 16));
      return v;
    };
    for (const b of t.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
      for (const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g))
        spolu.set(hex(p[1]), naZnaky(p[2]));

    for (const b of t.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
      for (const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const od = hex(p[1]), doK = hex(p[2]), ciel = hex(p[3]);
        for (let i = 0; i <= doK - od && i < 512; i++) spolu.set(od + i, String.fromCharCode(ciel + i));
      }
  }
  return spolu;
}

export function zPdf(d) {
  const cmap = cmapyZPdf(d);
  const kusy = [];

  for (const m of d.toString("latin1").matchAll(/stream\r?\n/g)) {
    const zac = m.index + m[0].length;
    const kon = d.indexOf("endstream", zac, "latin1");
    if (kon < 0) continue;
    let r;
    try { r = zlib.inflateSync(d.subarray(zac, kon)); } catch { continue; }
    const t = r.toString("latin1");
    if (!t.includes("TJ") && !t.includes("Tj")) continue;

    for (const u of t.matchAll(/\[([\s\S]*?)\]\s*TJ|\(((?:[^()\\]|\\.)*)\)\s*Tj/g)) {
      const vnutro = u[1] ?? `(${u[2]})`;
      let text = "";
      for (const h of vnutro.matchAll(/<([0-9A-Fa-f]+)>/g)) {
        const hx = h[1];
        for (let i = 0; i + 4 <= hx.length; i += 4)
          text += cmap.get(parseInt(hx.slice(i, i + 4), 16)) ?? "";
      }
      for (const p of vnutro.matchAll(/\(((?:[^()\\]|\\.)*)\)/g))
        text += p[1].replace(/\\([()\\])/g, "$1");
      kusy.push(text);
    }
  }
  return kusy.join("");
}

/* ---------- Word 97 (.doc) ---------- */

/* Word ukladá text po kusoch — časť v UTF-16, časť po jednom bajte.
   Nečítame formát, len vyzbierame súvislé čitateľné úseky z oboch. */
export function zDoc(d) {
  /* Každé kódovanie zvlášť. Zlepiť ich dohromady sa nedá: dni by sa
     v texte objavili dvakrát a v poprehadzovanom poradí. */
  const kandidati = [];
  /* Aj posunuté o jeden bajt — Word začína niektoré úseky na nepárnej pozícii
     a bez posunu z nich vypadne nezmysel. */
  for (const [kod, posun] of [["utf16le", 0], ["utf16le", 1], ["latin1", 0]]) {
    const t = d.subarray(posun).toString(kod);
    const kusy = [];
    for (const m of t.matchAll(/[\p{L}\p{N} .,;:!?°•\/()\-–—+%'"]{20,}/gu)) {
      const s = m[0].trim();
      /* Kúsky, kde sa kódovanie netrafilo, sú plné znakov mimo latinky. */
      const rozumne = (s.match(/[A-Za-zÀ-ž0-9 ]/g) ?? []).length / s.length;
      if (rozumne > 0.85) kusy.push(s);
    }
    if (kusy.length) kandidati.push(kusy.join("\n"));
  }
  return kandidati;
}

/* ---------- rozbor na dni a jedlá ---------- */

/* Z textu vytiahne názvy jedál. Vracia mapu "den|poradie" → názov,
   kde deň je 0–4 (pondelok–piatok) a poradie 0..n. */
export function rozober(text) {
  const cisty = text.replace(/ /g, " ").replace(/[ \t]+/g, " ");
  const von = new Map();

  /* Rozdelí sa to podľa názvov dní; každý dodávateľ ich píše inak,
     ale nikto ich zatiaľ nevynechal. */
  const hranice = [];
  for (let i = 0; i < DNI_NAZVY.length; i++) {
    const kde = cisty.search(new RegExp(DNI_NAZVY[i], "i"));
    hranice.push(kde);
  }

  /* Vytiahnu sa všetky riadky, ktoré vyzerajú ako jedlo, v poradí, v akom
     v dokumente stoja. */
  const jedla = [];
  /* Príznak `m` je tu podstatný: bez neho `$` znamená koniec celého textu
     a jedlo na vlastnom riadku sa nenájde. PDF má všetko na jednom riadku,
     takže by to bez neho vyzeralo, že to funguje. */
  for (const m of cisty.matchAll(/(?:^|\s)([1-9]|[A-E])\.[ \t]+([^\n]{6,220}?)(?=\s(?:[1-9]|[A-E])\.\s|$)/gm)) {
    const znak = m[1];
    const poradie = /[0-9]/.test(znak) ? Number(znak) - 1 : znak.charCodeAt(0) - 65;
    if (poradie < 0 || poradie > 8) continue;

    const nazov = m[2]
      /* Názov občas pokračuje hlavičkou ďalšieho dňa — tá do neho nepatrí. */
      .replace(new RegExp(`\\s*(?:${DNI_NAZVY.join("|")})\\s*[|·\\d].*$`, "i"), "")
      .replace(/\([^)]*\)\s*$/, "")                    // alergény na konci
      .replace(/\s*[•·]\s*/g, " • ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[,;•\-–]\s*$/, "");
    /* Skutočné jedlo má gramáž alebo prílohu za lomkou. Bez tejto podmienky
       sa medzi jedlá votrie hocijaký očíslovaný zoznam. */
    if (nazov.length < 6 || !/\d\s*(g|ml|l|ks)\b|\//i.test(nazov)) continue;
    jedla.push({ poradie, nazov: nazov.slice(0, 200), kde: m.index });
  }

  /* Ku ktorému dňu jedlo patrí. Názvy dní sú spoľahlivé v PDF; vo worde sa
     stratia, tak sa deň odvodí z poradia označení — keď sa vráti späť
     (po E zase A), začal ďalší deň. */
  const maVsetkyDni = hranice.every(x => x >= 0);
  let den = 0, predchadzajuce = -1;
  for (const j of jedla) {
    if (maVsetkyDni) {
      den = 0;
      for (let i = 4; i >= 0; i--) if (j.kde >= hranice[i]) { den = i; break; }
    } else {
      if (j.poradie <= predchadzajuce) den++;
      predchadzajuce = j.poradie;
    }
    if (den > 4) break;
    if (!von.has(`${den}|${j.poradie}`)) von.set(`${den}|${j.poradie}`, j.nazov);
  }
  return von;
}

/* Jediné, čo volá zvyšok appky. */
export function precitaj(nazovSuboru, typ, data) {
  const meno = (nazovSuboru ?? "").toLowerCase();
  let kandidati = [];
  try {
    if (meno.endsWith(".pdf") || typ === "application/pdf") kandidati = [zPdf(data)];
    else if (meno.endsWith(".doc") || meno.endsWith(".rtf")) kandidati = zDoc(data);
    else return { podarilo: false, dovod: "z tohto typu súboru názvy čítať neviem" };
  } catch (e) {
    return { podarilo: false, dovod: e.message };
  }
  kandidati = kandidati.filter(t => t && t.trim());
  if (!kandidati.length)
    return { podarilo: false, dovod: "súbor nemá textovú vrstvu — asi je to iba obrázok" };

  /* Z viacerých čítaní vyhrá to, ktoré našlo najviac jedál. */
  let najdene = new Map();
  for (const t of kandidati) {
    const v = rozober(t);
    if (v.size > najdene.size) najdene = v;
  }
  return { podarilo: najdene.size > 0, najdene,
           dovod: najdene.size ? null : "text sa prečítal, ale nenašiel som v ňom označené jedlá" };
}
