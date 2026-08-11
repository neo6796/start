/* Čítanie formulára s prílohou (multipart/form-data).

   Jediné miesto v celej appke, kde si Node nevystačí sám. Napísať to je
   asi sto riadkov; balíček navyše je vec, ktorá sa musí udržiavať a ktorá
   sa dá pokaziť pri nasadení. Pri jednom nahrávaní PDF týždenne to za to
   nestojí.

   Pracuje sa s Bufferom, nie s reťazcom. Prevod PDF na text a späť ho
   spoľahlivo poškodí. */

const CRLF = Buffer.from("\r\n");
const DVA_CRLF = Buffer.from("\r\n\r\n");

export function jeMultipart(ziad) {
  return (ziad.headers["content-type"] ?? "").toLowerCase().startsWith("multipart/form-data");
}

function hranicaZHlavicky(ziad) {
  const h = ziad.headers["content-type"] ?? "";
  const m = h.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  return m ? (m[1] ?? m[2]).trim() : null;
}

function citajCele(ziad, limit) {
  return new Promise((hotovo, zle) => {
    const kusy = [];
    let n = 0;
    ziad.on("data", k => {
      n += k.length;
      if (n > limit) { zle(new Error("príloha je pridlhá")); ziad.destroy(); return; }
      kusy.push(k);
    });
    ziad.on("end", () => hotovo(Buffer.concat(kusy)));
    ziad.on("error", zle);
  });
}

/* Rozdelí telo podľa hranice. Vracia { polia, subory }:
   polia  = { meno: hodnota | [hodnoty] }  — ako pri obyčajnom formulári
   subory = { meno: { nazov, typ, data } } */
export async function citaj(ziad, limit = 8 * 1024 * 1024) {
  const hranica = hranicaZHlavicky(ziad);
  if (!hranica) throw new Error("chýba hranica multipart");

  const telo = await citajCele(ziad, limit);
  const oddelovac = Buffer.from(`--${hranica}`);

  const polia = {}, subory = {};
  let od = telo.indexOf(oddelovac);
  if (od < 0) return { polia, subory };

  while (od >= 0) {
    const zaciatok = od + oddelovac.length;
    /* Po hranici nasleduje buď CRLF (ďalšia časť), alebo "--" (koniec). */
    if (telo.slice(zaciatok, zaciatok + 2).toString() === "--") break;

    const dalsi = telo.indexOf(oddelovac, zaciatok);
    if (dalsi < 0) break;

    /* Časť je medzi CRLF za hranicou a CRLF pred ďalšou hranicou. */
    const cast = telo.slice(zaciatok + CRLF.length, dalsi - CRLF.length);
    const medzera = cast.indexOf(DVA_CRLF);
    if (medzera >= 0) {
      const hlavicky = cast.slice(0, medzera).toString("utf8");
      const data = cast.slice(medzera + DVA_CRLF.length);

      const meno = hlavicky.match(/name="([^"]*)"/i)?.[1];
      const subor = hlavicky.match(/filename="([^"]*)"/i)?.[1];
      const typ = hlavicky.match(/^content-type:\s*(.+)$/im)?.[1]?.trim();

      if (meno) {
        if (subor !== undefined) {
          /* Prázdne políčko na súbor posiela prázdny názov aj prázdne dáta. */
          if (subor !== "" && data.length) subory[meno] = { nazov: subor, typ, data };
        } else {
          const v = data.toString("utf8");
          if (meno in polia) polia[meno] = [].concat(polia[meno], v);
          else polia[meno] = v;
        }
      }
    }
    od = dalsi;
  }
  return { polia, subory };
}
