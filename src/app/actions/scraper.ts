"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { scrapeMenu } from "@/lib/scraper";
import { startOfLocalDay } from "@/lib/dates";

export async function runScrape(restaurantId: string): Promise<{
  daysImported: number;
  itemsImported: number;
  daysFound: number;
  log: string[];
}> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("Nie si admin");

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw new Error("Reštaurácia neexistuje");
  if (!restaurant.scrapeUrl) throw new Error("Reštaurácia nemá scrape URL");

  const log: string[] = [];
  log.push(`Sťahujem ${restaurant.scrapeUrl}`);

  const days = await scrapeMenu(restaurant.scrapeUrl);
  log.push(`Naparsovaných dní: ${days.length}`);

  let daysImported = 0;
  let itemsImported = 0;
  const today = startOfLocalDay();

  for (const day of days) {
    if (day.date < today) {
      log.push(`Preskakujem ${day.date.toLocaleDateString("sk-SK")} (minulý)`);
      continue;
    }
    if (day.items.length === 0) continue;

    // Don't overwrite a manually-edited day
    const existing = await prisma.menuDay.findUnique({
      where: { date_restaurantId: { date: day.date, restaurantId } },
    });
    if (existing && existing.source === "MANUAL") {
      log.push(`Preskakujem ${day.date.toLocaleDateString("sk-SK")} (ručne upravené)`);
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const md = await tx.menuDay.upsert({
        where: { date_restaurantId: { date: day.date, restaurantId } },
        create: { date: day.date, restaurantId, source: "SCRAPED" },
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
    daysImported++;
    itemsImported += day.items.length;
    log.push(`Importované ${day.date.toLocaleDateString("sk-SK")}: ${day.items.length} položiek`);
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return { daysImported, itemsImported, daysFound: days.length, log };
}
