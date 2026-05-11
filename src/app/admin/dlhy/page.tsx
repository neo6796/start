import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/dates";
import { DebtsTable } from "@/components/DebtsTable";

export const dynamic = "force-dynamic";

export default async function DebtsPage() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      orders: {
        where: { status: { in: ["PLACED", "DELIVERED"] } },
        select: { priceCents: true, quantity: true },
      },
      payments: { select: { amountCents: true } },
    },
  });

  const rows = users
    .map((u) => {
      const ordered = u.orders.reduce((s, o) => s + o.priceCents * o.quantity, 0);
      const paid = u.payments.reduce((s, p) => s + p.amountCents, 0);
      return {
        id: u.id,
        name: u.name || u.email,
        email: u.email,
        ordered,
        paid,
        balance: paid - ordered,
      };
    })
    .sort((a, b) => a.balance - b.balance);

  const totals = rows.reduce(
    (acc, r) => ({
      ordered: acc.ordered + r.ordered,
      paid: acc.paid + r.paid,
      debt: acc.debt + (r.balance < 0 ? -r.balance : 0),
    }),
    { ordered: 0, paid: 0, debt: 0 },
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dlhy a platby</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Spolu objednané" value={formatPrice(totals.ordered)} />
        <Stat label="Spolu zaplatené" value={formatPrice(totals.paid)} />
        <Stat label="Nezaplatené" value={formatPrice(totals.debt)} accent="red" />
      </div>

      <DebtsTable rows={rows} />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "red";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent === "red"
          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
