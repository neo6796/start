import { prisma } from "@/lib/prisma";
import { ScraperRunner } from "@/components/ScraperRunner";

export const dynamic = "force-dynamic";

export default async function ScraperPage() {
  const restaurants = await prisma.restaurant.findMany({
    where: { active: true, NOT: { scrapeUrl: null } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scraper</h1>
        <p className="text-sm text-zinc-500">
          Stiahne menu z webu reštaurácie. Ručne upravené dni sa neprepíšu.
        </p>
      </div>

      {restaurants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">
          Žiadna reštaurácia nemá nastavenú scrape URL. Pridaj ju v sekcii Reštaurácie.
        </div>
      ) : (
        <ScraperRunner
          restaurants={restaurants.map((r) => ({
            id: r.id,
            name: r.name,
            scrapeUrl: r.scrapeUrl ?? "",
          }))}
        />
      )}

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        <strong>Tip:</strong> Pre automatické spúšťanie každé ráno (napr. o 7:00) si nastav cron
        (linuxový alebo Vercel Cron) na <code>POST /api/scrape</code> s hlavičkou
        <code> Authorization: Bearer $CRON_SECRET</code>.
      </div>
    </div>
  );
}
