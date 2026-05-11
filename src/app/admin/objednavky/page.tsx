import { prisma } from "@/lib/prisma";
import { formatDateSk, formatPrice, startOfLocalDay, addDays } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const day = params.date ? startOfLocalDay(new Date(params.date)) : startOfLocalDay();
  const prev = addDays(day, -1);
  const next = addDays(day, 1);

  const orders = await prisma.order.findMany({
    where: { date: day, status: "PLACED" },
    include: { user: true, menuItem: true },
    orderBy: [{ menuItem: { category: "asc" } }, { menuItem: { name: "asc" } }],
  });

  const byItem = new Map<string, { name: string; category: string; count: number; orders: typeof orders }>();
  for (const o of orders) {
    const key = o.menuItem.id;
    if (!byItem.has(key))
      byItem.set(key, { name: o.menuItem.name, category: o.menuItem.category, count: 0, orders: [] });
    const entry = byItem.get(key)!;
    entry.count += o.quantity;
    entry.orders.push(o);
  }

  const totalCents = orders.reduce((s, o) => s + o.priceCents * o.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Objednávky</h1>
        <div className="flex items-center gap-2 text-sm">
          <a
            href={`/admin/objednavky?date=${prev.toISOString().slice(0, 10)}`}
            className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ←
          </a>
          <span className="capitalize">{formatDateSk(day)}</span>
          <a
            href={`/admin/objednavky?date=${next.toISOString().slice(0, 10)}`}
            className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            →
          </a>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500 dark:border-zinc-700">
          Žiadne objednávky.
        </div>
      ) : (
        <>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-500">
              Súhrn pre reštauráciu ({orders.length} ks · {formatPrice(totalCents)})
            </h2>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950">
                  <tr>
                    <th className="px-4 py-2">Kategória</th>
                    <th className="px-4 py-2">Jedlo</th>
                    <th className="px-4 py-2 text-right">Počet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {Array.from(byItem.values()).map((it) => (
                    <tr key={it.name}>
                      <td className="px-4 py-2 text-zinc-500">{it.category}</td>
                      <td className="px-4 py-2">{it.name}</td>
                      <td className="px-4 py-2 text-right font-mono">{it.count}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-500">
              Podľa osôb
            </h2>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium">{o.user.name || o.user.email}</div>
                      <div className="text-xs text-zinc-500">
                        {o.menuItem.name}
                        {o.note ? ` · ${o.note}` : ""}
                      </div>
                    </div>
                    <div className="font-mono text-sm">{formatPrice(o.priceCents)}</div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
