import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MenuDayEditor } from "@/components/MenuDayEditor";

export const dynamic = "force-dynamic";

export default async function EditMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const day = await prisma.menuDay.findUnique({
    where: { id },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!day) notFound();

  const restaurants = await prisma.restaurant.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <MenuDayEditor
      menuDayId={day.id}
      restaurants={restaurants.map((r) => ({ id: r.id, name: r.name }))}
      initial={{
        date: day.date.toISOString().slice(0, 10),
        restaurantId: day.restaurantId,
        items: day.items.map((it) => ({
          category: it.category,
          name: it.name,
          description: it.description ?? "",
          priceEur: it.price / 100,
          allergens: it.allergens ?? "",
        })),
      }}
    />
  );
}
