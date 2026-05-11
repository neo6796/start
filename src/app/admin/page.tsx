import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateSk, startOfLocalDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const today = startOfLocalDay();

  const [restaurants, menuDaysCount, todayOrdersCount, users] = await Promise.all([
    prisma.restaurant.findMany({ orderBy: { name: "asc" } }),
    prisma.menuDay.count({ where: { date: { gte: today } } }),
    prisma.order.count({ where: { date: today, status: "PLACED" } }),
    prisma.user.count(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Reštaurácie" value={restaurants.length.toString()} />
        <Stat label="Pripravené menu" value={menuDaysCount.toString()} />
        <Stat label="Dnešné objednávky" value={todayOrdersCount.toString()} />
        <Stat label="Používatelia" value={users.toString()} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <AdminTile href="/admin/menu/tyzden" title="Týždenné menu" description="Zadať celý Po–Pi v jednom kroku" />
        <AdminTile href="/admin/menu" title="Všetky menu" description="Prehľad a úprava existujúcich" />
        <AdminTile href="/admin/objednavky" title="Dnešné objednávky" description="Kto čo má objednané dnes" />
        <AdminTile href="/admin/dlhy" title="Dlhy a platby" description="Evidencia platieb a dlhov" />
        <AdminTile href="/admin/restauracie" title="Reštaurácie" description="Pridať/upraviť dodávateľov" />
        <AdminTile href="/admin/pouzivatelia" title="Používatelia" description="Spravovať roly" />
        <AdminTile href="/admin/scraper" title="Scraper" description="Ručne spustiť sťahovanie menu" />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase text-zinc-500">
          Najbližšie zverejnené menu
        </h2>
        <UpcomingMenu />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function AdminTile({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-orange-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="font-medium">{title}</div>
      <div className="text-sm text-zinc-500">{description}</div>
    </Link>
  );
}

async function UpcomingMenu() {
  const today = startOfLocalDay();
  const days = await prisma.menuDay.findMany({
    where: { date: { gte: today } },
    orderBy: { date: "asc" },
    take: 7,
    include: { restaurant: true, _count: { select: { items: true } } },
  });

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        Žiadne nadchádzajúce menu.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
      {days.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="text-sm font-medium capitalize">{formatDateSk(d.date)}</div>
            <div className="text-xs text-zinc-500">
              {d.restaurant.name} · {d._count.items} položiek · {d.source === "SCRAPED" ? "zo scrapingu" : "ručne"}
            </div>
          </div>
          <Link href={`/admin/menu/${d.id}`} className="text-sm text-orange-600 hover:underline">
            Upraviť →
          </Link>
        </li>
      ))}
    </ul>
  );
}
