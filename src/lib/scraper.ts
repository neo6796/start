// Generic scraper for daily lunch menus.
// Currently tuned for gastroabm.sk-style sites but written defensively so it
// degrades gracefully on layout changes. Returns one or more day-grouped menus.

import * as cheerio from "cheerio";
import { startOfLocalDay } from "@/lib/dates";

export type ScrapedItem = {
  category: string;
  name: string;
  description?: string;
  priceCents: number;
  allergens?: string;
};

export type ScrapedDay = {
  date: Date;
  items: ScrapedItem[];
};

const SK_MONTHS: Record<string, number> = {
  januar: 0, januára: 0, január: 0,
  februar: 1, februára: 1, február: 1,
  marec: 2, marca: 2,
  april: 3, apríl: 3, apríla: 3,
  maj: 4, máj: 4, mája: 4,
  jun: 5, jún: 5, júna: 5,
  jul: 6, júl: 6, júla: 6,
  august: 7, augusta: 7,
  september: 8, septembra: 8,
  oktober: 9, október: 9, októbra: 9,
  november: 10, novembra: 10,
  december: 11, decembra: 11,
};

function parseSkDate(raw: string): Date | null {
  const cleaned = raw.toLowerCase().replace(/[,.]/g, " ").trim();
  const m = cleaned.match(/(\d{1,2})\s+([a-záäčďéíĺľňóôŕšťúýž]+)\s+(\d{4})/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = SK_MONTHS[m[2]];
    const year = parseInt(m[3], 10);
    if (month !== undefined) return startOfLocalDay(new Date(year, month, day));
  }
  const dmy = cleaned.match(/(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/);
  if (dmy) {
    return startOfLocalDay(
      new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10)),
    );
  }
  return null;
}

function parsePrice(raw: string): number {
  const m = raw.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  return Math.round(parseFloat(m[1]) * 100);
}

function classifyCategory(text: string, index: number): string {
  const t = text.toLowerCase();
  if (/polievk|soup/.test(t)) return "Polievka";
  if (/š?alát|salat|salad/.test(t)) return "Šalát";
  if (/dezert|múčnik|moucnik/.test(t)) return "Dezert";
  if (/n[aá]poj/.test(t)) return "Nápoj";
  if (index === 0) return "Polievka";
  return "Hlavné jedlo";
}

export async function scrapeMenu(url: string): Promise<ScrapedDay[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        process.env.SCRAPER_USER_AGENT ?? "Mozilla/5.0 (compatible; LunchAppBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "sk,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Scrape ${url}: HTTP ${res.status}`);
  const html = await res.text();
  return parseMenu(html);
}

// Heuristic parser. Handles two common patterns:
// 1) Each day is its own section/heading followed by a list/table of items.
// 2) A single table where the first column is a category and another column has the dish + price.
export function parseMenu(html: string): ScrapedDay[] {
  const $ = cheerio.load(html);
  const days: ScrapedDay[] = [];

  // Strategy A: look for headings containing a date, then collect siblings.
  const dateHeadings = $("h1,h2,h3,h4,.menu-date,.daily-date,strong,b").filter((_, el) => {
    const t = $(el).text().trim();
    return parseSkDate(t) !== null;
  });

  if (dateHeadings.length > 0) {
    dateHeadings.each((_, heading) => {
      const date = parseSkDate($(heading).text());
      if (!date) return;
      const items: ScrapedItem[] = [];

      // Walk forward through siblings until the next date heading
      let node = $(heading).next();
      let idx = 0;
      while (node.length) {
        const tag = (node.get(0) as { tagName?: string }).tagName?.toLowerCase() ?? "";
        const text = node.text().trim();
        if (parseSkDate(text)) break;

        if (text) {
          // table rows
          if (tag === "table") {
            node.find("tr").each((_, tr) => {
              const cells = $(tr).find("td,th").map((_, td) => $(td).text().trim()).get();
              const item = buildItem(cells, idx);
              if (item) {
                items.push(item);
                idx++;
              }
            });
          } else if (tag === "ul" || tag === "ol") {
            node.find("li").each((_, li) => {
              const item = buildItemFromLine($(li).text(), idx);
              if (item) {
                items.push(item);
                idx++;
              }
            });
          } else {
            const item = buildItemFromLine(text, idx);
            if (item) {
              items.push(item);
              idx++;
            }
          }
        }
        node = node.next();
      }

      if (items.length > 0) days.push({ date, items });
    });
  }

  // Strategy B: fall back to a single table on the page, assume today's menu.
  if (days.length === 0) {
    const items: ScrapedItem[] = [];
    let idx = 0;
    $("table tr").each((_, tr) => {
      const cells = $(tr).find("td,th").map((_, td) => $(td).text().trim()).get();
      const item = buildItem(cells, idx);
      if (item) {
        items.push(item);
        idx++;
      }
    });
    if (items.length > 0) {
      days.push({ date: startOfLocalDay(), items });
    }
  }

  return days;
}

function buildItem(cells: string[], index: number): ScrapedItem | null {
  const joined = cells.join(" ").trim();
  if (!joined) return null;
  if (!/\d/.test(joined)) return null; // no number anywhere -> probably a header row
  // Find the cell that looks like a price
  let priceCents = 0;
  let nameParts: string[] = [];
  for (const c of cells) {
    if (/€|eur|\d+[.,]\d{2}/i.test(c) && priceCents === 0) {
      priceCents = parsePrice(c);
    } else {
      nameParts.push(c);
    }
  }
  if (priceCents === 0) return null;
  const name = nameParts.join(" – ").trim();
  if (!name) return null;
  return {
    category: classifyCategory(name, index),
    name: cleanName(name),
    description: undefined,
    priceCents,
    allergens: extractAllergens(name),
  };
}

function buildItemFromLine(line: string, index: number): ScrapedItem | null {
  const trimmed = line.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  if (!/(\d+[.,]\d{2}|€|eur)/i.test(trimmed)) return null;
  const priceMatch = trimmed.match(/(\d+[.,]\d{2})\s*€?/);
  if (!priceMatch) return null;
  const priceCents = parsePrice(priceMatch[1]);
  const name = trimmed.replace(priceMatch[0], "").trim();
  if (!name) return null;
  return {
    category: classifyCategory(name, index),
    name: cleanName(name),
    description: undefined,
    priceCents,
    allergens: extractAllergens(name),
  };
}

function cleanName(s: string): string {
  return s
    .replace(/\([^)]*alerg[^)]*\)/gi, "")
    .replace(/\bA:\s*[\d,\s]+/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[–-]\s*$/, "")
    .trim();
}

function extractAllergens(s: string): string | undefined {
  const m = s.match(/A:\s*([\d,\s]+)/i) || s.match(/alerg[^:]*:\s*([\d,\s]+)/i);
  if (!m) return undefined;
  return m[1].replace(/\s+/g, "").replace(/,+/g, ",");
}
