import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDateSk, formatPrice, startOfLocalDay, startOfMonth, endOfMonth } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const session = await auth();
  if (!session?.user) return null;

  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const [orders, payments, allTimeOrders, allTimePayments] = await Promise.all([
    prisma.order.findMany({
      where: { userId: session.user.id, date: { gte: monthStart, lt: monthEnd } },
      include: { menuItem: true },
      orderBy: { date: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId: session.user.id, paidAt: { gte: monthStart, lt: monthEnd } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.order.aggregate({
      where: { userId: session.user.id, status: { in: ["PLACED", "DELIVERED"] } },
      _sum: { priceCents: true },
    }),
    prisma.payment.aggregate({
      where: { userId: session.user.id },
      _sum: { amountCents: true },
    }),
  ]);

  const totalOrders = allTimeOrders._sum.priceCents ?? 0;
  const totalPayments = allTimePayments._sum.amountCents ?? 0;
  const balance = totalPayments - totalOrders; // negative = owes money

  const monthOrders = orders.reduce(
    (sum, o) => sum + (o.status === "CANCELLED" ? 0 : o.priceCents),
    0,
  );

  const today = startOfLocalDay();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moje objednávky</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs uppercase text-zinc-500">Tento mesiac</div>
          <div className="mt-1 text-2xl font-bold">{formatPrice(monthOrders)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-xs uppercase text-zinc-500">Spolu obedy</div>
          <div className="mt-1 text-2xl font-bold">{formatPrice(totalOrders)}</div>
        </div>
        <div
          className={`rounded-2xl border p-4 ${
            balance < 0
              ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950"
              : "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
          }`}
        >
          <div className="text-xs uppercase text-zinc-500">
            {balance < 0 ? "Dlhuješ" : "Preplatok"}
          </div>
          <div className="mt-1 text-2xl font-bold">{formatPrice(Math.abs(balance))}</div>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-500">
          Objednávky tento mesiac
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {orders.length === 0 ? (
            <div className="p-6 text-center text-sm text-zinc-500">
              Tento mesiac nemáš žiadne objednávky.
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium capitalize">{formatDateSk(o.date)}</div>
                    <div className="truncate text-sm text-zinc-500">{o.menuItem.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{formatPrice(o.priceCents)}</div>
                    <div
                      className={`text-xs ${
                        o.status === "CANCELLED"
                          ? "text-zinc-400 line-through"
                          : o.status === "DELIVERED"
                          ? "text-emerald-600"
                          : o.date < today
                          ? "text-zinc-400"
                          : "text-orange-600"
                      }`}
                    >
                      {o.status === "CANCELLED"
                        ? "Zrušené"
                        : o.status === "DELIVERED"
                        ? "Doručené"
                        : o.date < today
                        ? "Bolo"
                        : "Aktívne"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {payments.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-500">Platby tento mesiac</h2>
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">
                      {new Intl.DateTimeFormat("sk-SK").format(p.paidAt)}
                    </div>
                    {p.note && <div className="text-xs text-zinc-500">{p.note}</div>}
                  </div>
                  <div className="font-mono text-sm text-emerald-700">
                    +{formatPrice(p.amountCents)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
