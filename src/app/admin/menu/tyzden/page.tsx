import { prisma } from "@/lib/prisma";
import { WeekMenuEditor } from "@/components/WeekMenuEditor";
import { addDays, startOfLocalDay, startOfWeek } from "@/lib/dates";

export const dynamic = "force-dynamic";

type WeekItem = {
  category: string;
  name: string;
  description: string;
  priceEur: number;
  allergens: string;
};

export default async function WeekMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; restaurant?: string }>;
}) {
  const params = await searchParams;
  const monday = params.week
    ? startOfWeek(new Date(params.week))
    : startOfWeek(addDays(startOfLocalDay(), 1)); // next-business-week default
  const friday = addDays(monday, 4);

  const restaurants = await prisma.restaurant.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  const selectedRestaurantId = params.restaurant ?? restaurants[0]?.id ?? "";

  const existing = selectedRestaurantId
    ? await prisma.menuDay.findMany({
        where: {
          restaurantId: selectedRestaurantId,
          date: { gte: monday, lte: friday },
        },
        include: { items: { orderBy: { position: "asc" } } },
      })
    : [];

  const byDate = new Map<string, WeekItem[]>();
  for (const md of existing) {
    byDate.set(
      md.date.toISOString().slice(0, 10),
      md.items.map((it) => ({
        category: it.category,
        name: it.name,
        description: it.description ?? "",
        priceEur: it.price / 100,
        allergens: it.allergens ?? "",
      })),
    );
  }

  const defaultRow = (cat: string, price: number): WeekItem => ({
    category: cat,
    name: "",
    description: "",
    priceEur: price,
    allergens: "",
  });

  const days = Array.from({ length: 5 }, (_, i) => {
    const date = addDays(monday, i);
    const dateKey = date.toISOString().slice(0, 10);
    const items =
      byDate.get(dateKey) ??
      [
        defaultRow("Polievka", 1.5),
        defaultRow("Hlavné jedlo", 6.5),
        defaultRow("Hlavné jedlo", 6.5),
        defaultRow("Hlavné jedlo", 6.5),
      ];
    return { date: dateKey, items };
  });

  return (
    <WeekMenuEditor
      restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
      restaurantId={selectedRestaurantId}
      weekStartIso={monday.toISOString().slice(0, 10)}
      days={days}
    />
  );
}
