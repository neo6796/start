// Cron endpoint: POST /api/scrape with header `Authorization: Bearer $CRON_SECRET`
// Iterates all active restaurants with a scrapeUrl and runs the scraper.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeMenu } from "@/lib/scraper";
import { startOfLocalDay } from "@/lib/dates";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const restaurants = await prisma.restaurant.findMany({
    where: { active: true, NOT: { scrapeUrl: null } },
  });
  const today = startOfLocalDay();
  const summary: Array<{ restaurant: string; days: number; items: number; error?: string }> = [];

  for (const r of restaurants) {
    try {
      const days = await scrapeMenu(r.scrapeUrl!);
      let imported = 0;
      let itemsImported = 0;
      for (const day of days) {
        if (day.date < today || day.items.length === 0) continue;
        const existing = await prisma.menuDay.findUnique({
          where: { date_restaurantId: { date: day.date, restaurantId: r.id } },
        });
        if (existing && existing.source === "MANUAL") continue;

        await prisma.$transaction(async (tx) => {
          const md = await tx.menuDay.upsert({
            where: { date_restaurantId: { date: day.date, restaurantId: r.id } },
            create: { date: day.date, restaurantId: r.id, source: "SCRAPED" },
            update: { source: "SCRAPED", published: true },
          });
          await tx.menuItem.deleteMany({ where: { menuDayId: md.id } });
          await tx.menuItem.createMany({
            data: day.items.map((it, i) => ({
              menuDayId: md.id,
              category: it.category,
              name: it.name,
              description: it.description ?? null,
              price: it.priceCents,
              allergens: it.allergens ?? null,
              position: i,
            })),
          });
        });
        imported++;
        itemsImported += day.items.length;
      }
      summary.push({ restaurant: r.name, days: imported, items: itemsImported });
    } catch (e) {
      summary.push({
        restaurant: r.name,
        days: 0,
        items: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ ok: true, summary });
}
