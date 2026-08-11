/* Zošit do Excelu (.xlsx) bez balíčka.

   Objednávka ide do kuchyne ako čistý text v tele správy — to je to, čo sa
   naozaj číta. Príloha je pre archív a pre účtovníctvo, ktoré s číslami ďalej
   pracuje. CSV by na to stačilo, ale slovenské Windows ho otvárajú v jednom
   stĺpci a s rozsypanou diakritikou; kým je zošit stodvadsať riadkov kódu,
   je to lacnejšie než vysvetľovať, ako sa CSV importuje.

   XLSX je zip s niekoľkými XML súbormi. Texty sa píšu priamo do buniek
   (`inlineStr`), takže netreba tabuľku reťazcov — o jeden súbor a jeden
   zdroj nesúladu menej. */

import zlib from "node:zlib";

const TABULKA_CRC = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(b) {
  let c = -1;
  for (let i = 0; i < b.length; i++) c = TABULKA_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* Zip s deflate. Dátum sa nezapisuje — Excel ho nepotrebuje a pevná hodnota
   znamená, že z tých istých čísel vznikne ten istý súbor. */
function zip(subory) {
  const kusy = [], adresar = [];
  let posun = 0;

  for (const { nazov, data } of subory) {
    const meno = Buffer.from(nazov, "utf8");
    const stlacene = zlib.deflateRawSync(data);
    const kontrola = crc32(data);

    const hlavicka = Buffer.alloc(30);
    hlavicka.writeUInt32LE(0x04034b50, 0);
    hlavicka.writeUInt16LE(20, 4);          // verzia
    hlavicka.writeUInt16LE(0x0800, 6);      // názvy súborov v UTF-8
    hlavicka.writeUInt16LE(8, 8);           // deflate
    hlavicka.writeUInt32LE(kontrola, 14);
    hlavicka.writeUInt32LE(stlacene.length, 18);
    hlavicka.writeUInt32LE(data.length, 22);
    hlavicka.writeUInt16LE(meno.length, 26);
    kusy.push(hlavicka, meno, stlacene);

    const zaznam = Buffer.alloc(46);
    zaznam.writeUInt32LE(0x02014b50, 0);
    zaznam.writeUInt16LE(20, 4);
    zaznam.writeUInt16LE(20, 6);
    zaznam.writeUInt16LE(0x0800, 8);
    zaznam.writeUInt16LE(8, 10);
    zaznam.writeUInt32LE(kontrola, 16);
    zaznam.writeUInt32LE(stlacene.length, 20);
    zaznam.writeUInt32LE(data.length, 24);
    zaznam.writeUInt16LE(meno.length, 28);
    zaznam.writeUInt32LE(posun, 42);
    adresar.push(zaznam, meno);

    posun += hlavicka.length + meno.length + stlacene.length;
  }

  const telo = Buffer.concat(kusy);
  const zoznam = Buffer.concat(adresar);
  const koniec = Buffer.alloc(22);
  koniec.writeUInt32LE(0x06054b50, 0);
  koniec.writeUInt16LE(subory.length, 8);
  koniec.writeUInt16LE(subory.length, 10);
  koniec.writeUInt32LE(zoznam.length, 12);
  koniec.writeUInt32LE(telo.length, 16);
  return Buffer.concat([telo, zoznam, koniec]);
}

const esc = s => String(s).replace(/[&<>]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[z]));

/* A, B, … Z, AA, AB … */
function stlpec(i) {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s;
  return s;
}

function harok(riadky) {
  const von = riadky.map((r, i) => {
    const bunky = r.map((h, j) => {
      if (h === null || h === undefined || h === "") return "";
      const kde = `${stlpec(j)}${i + 1}`;
      return typeof h === "number"
        ? `<c r="${kde}"><v>${h}</v></c>`
        : `<c r="${kde}" t="inlineStr" s="${i === 0 ? 1 : 0}"><is><t xml:space="preserve">${esc(h)}</t></is></c>`;
    }).join("");
    return `<row r="${i + 1}">${bunky}</row>`;
  }).join("");

  /* Šírky stĺpcov podľa najdlhšieho textu — inak sú názvy jedál skryté
     za susednou bunkou a zošit vyzerá prázdny. */
  const sirky = [];
  for (let j = 0; j < Math.max(...riadky.map(r => r.length)); j++) {
    const n = Math.max(...riadky.map(r => String(r[j] ?? "").length));
    sirky.push(`<col min="${j + 1}" max="${j + 1}" width="${Math.min(60, Math.max(8, n + 2))}" customWidth="1"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols>${sirky.join("")}</cols><sheetData>${von}</sheetData></worksheet>`;
}

/* Jediné, čo volá zvyšok appky: názov hárku a riadky (čísla ostanú číslami). */
export function zosit(nazovHarku, riadky) {
  const s = t => Buffer.from(t, "utf8");
  return zip([
    { nazov: "[Content_Types].xml", data: s(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`) },
    { nazov: "_rels/.rels", data: s(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`) },
    { nazov: "xl/workbook.xml", data: s(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(nazovHarku).slice(0, 31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`) },
    { nazov: "xl/_rels/workbook.xml.rels", data: s(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`) },
    /* Jediný štýl navyše je tučná hlavička — bez nej sa v zošite ťažko hľadá,
       kde sa začínajú čísla. */
    { nazov: "xl/styles.xml", data: s(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`) },
    { nazov: "xl/worksheets/sheet1.xml", data: s(harok(riadky)) }
  ]);
}
