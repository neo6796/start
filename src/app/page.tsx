import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addDays, formatDateSk, isPastCutoff, startOfLocalDay } from "@/lib/dates";
import { MenuDayCard } from "@/components/MenuDayCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) return null;

  const today = startOfLocalDay();
  const horizon = addDays(today, 14);

  const menuDays = await prisma.menuDay.findMany({
    where: {
      date: { gte: today, lt: horizon },
      published: true,
    },
    orderBy: { date: "asc" },
    include: {
      restaurant: true,
      items: { orderBy: [{ category: "asc" }, { position: "asc" }] },
    },
  });

  const myOrders = await prisma.order.findMany({
    where: {
      userId: session.user.id,
      date: { gte: today, lt: horizon },
      status: "PLACED",
    },
    include: { menuItem: { select: { category: true } } },
  });
  // (dateISO -> (category -> order))
  const ordersByDate = new Map<string, Map<string, { id: string; menuItemId: string }>>();
  for (const o of myOrders) {
    const key = startOfLocalDay(o.date).toISOString();
    if (!ordersByDate.has(key)) ordersByDate.set(key, new Map());
    ordersByDate.get(key)!.set(o.menuItem.category, { id: o.id, menuItemId: o.menuItemId });
  }

  if (menuDays.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500 dark:border-zinc-700">
        <div className="mb-2 text-4xl">🍽️</div>
        <p>Žiadne menu nie je zatiaľ zverejnené.</p>
        {session.user.role === "ADMIN" && (
          <p className="mt-2 text-sm">
            Choď do <a className="underline" href="/admin">Admin</a> sekcie a pridaj menu.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aktuálne menu</h1>
        <p className="text-sm text-zinc-500">
          Vyber si jedlo. Objednávku môžeš meniť do uzávierky.
        </p>
      </div>

      {menuDays.map((day) => {
        const myByCategory = ordersByDate.get(startOfLocalDay(day.date).toISOString()) ?? new Map();
        const closed = isPastCutoff(day.date, day.restaurant.cutoffHour);
        return (
          <MenuDayCard
            key={day.id}
            dateLabel={formatDateSk(day.date)}
            restaurantName={day.restaurant.name}
            cutoffHour={day.restaurant.cutoffHour}
            closed={closed}
            items={day.items}
            myOrdersByCategory={Object.fromEntries(myByCategory)}
          />
        );
      })}
    </div>
  );
}
