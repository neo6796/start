// Run scraping for all active restaurants from the CLI (e.g. inside a cron job).
// Usage: pnpm scrape:once
import { PrismaClient } from "@prisma/client";
import { scrapeMenu } from "../src/lib/scraper";

const prisma = new PrismaClient();

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    where: { active: true, NOT: { scrapeUrl: null } },
  });
  const today = startOfLocalDay();
  for (const r of restaurants) {
    console.log(`Scraping ${r.name} (${r.scrapeUrl})`);
    try {
      const days = await scrapeMenu(r.scrapeUrl!);
      for (const day of days) {
        if (day.date < today || day.items.length === 0) continue;
        const existing = await prisma.menuDay.findUnique({
          where: { date_restaurantId: { date: day.date, restaurantId: r.id } },
        });
        if (existing && existing.source === "MANUAL") {
          console.log(`  Skip ${day.date.toLocaleDateString("sk-SK")} (manual)`);
          continue;
        }
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
        console.log(`  ✓ ${day.date.toLocaleDateString("sk-SK")}: ${day.items.length} items`);
      }
    } catch (e) {
      console.error(`  ✗ ${r.name}:`, e instanceof Error ? e.message : e);
    }
  }
  await prisma.$disconnect();
}

main();
