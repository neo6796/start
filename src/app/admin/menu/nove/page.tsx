import { prisma } from "@/lib/prisma";
import { MenuDayEditor } from "@/components/MenuDayEditor";
import { addDays, startOfLocalDay } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function NewMenuPage() {
  const restaurants = await prisma.restaurant.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  const defaultDate = addDays(startOfLocalDay(), 1).toISOString().slice(0, 10);

  return (
    <MenuDayEditor
      restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
      initial={{
        date: defaultDate,
        restaurantId: restaurants[0]?.id ?? "",
        items: [
          { category: "Polievka", name: "", description: "", priceEur: 1.5, allergens: "" },
          { category: "Hlavné jedlo", name: "", description: "", priceEur: 6.5, allergens: "" },
        ],
      }}
    />
  );
}
