import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { addDays, formatDateSk, startOfLocalDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function MenuListPage() {
  const today = startOfLocalDay();
  const horizon = addDays(today, 21);

  const [restaurants, days] = await Promise.all([
    prisma.restaurant.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.menuDay.findMany({
      where: { date: { gte: today, lt: horizon } },
      orderBy: { date: "asc" },
      include: { restaurant: true, _count: { select: { items: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Menu</h1>
        <div className="flex gap-2">
          <Link
            href="/admin/menu/tyzden"
            className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
          >
            📅 Týždenné menu
          </Link>
          <Link
            href="/admin/menu/nove"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            + Jeden deň
          </Link>
        </div>
      </div>

      {restaurants.length === 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Najprv si pridaj{" "}
          <Link href="/admin/restauracie" className="font-medium underline">
            reštauráciu
          </Link>
          .
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {days.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500">Žiadne menu pripravené.</div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {days.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-sm font-medium capitalize">{formatDateSk(d.date)}</div>
                  <div className="text-xs text-zinc-500">
                    {d.restaurant.name} · {d._count.items} položiek
                  </div>
                </div>
                <Link
                  href={`/admin/menu/${d.id}`}
                  className="text-sm text-orange-600 hover:underline"
                >
                  Upraviť →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
