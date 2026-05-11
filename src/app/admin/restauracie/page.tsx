import { prisma } from "@/lib/prisma";
import { RestaurantsManager } from "@/components/RestaurantsManager";

export const dynamic = "force-dynamic";

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({ orderBy: { name: "asc" } });
  return (
    <RestaurantsManager
      restaurants={restaurants.map((r) => ({
        id: r.id,
        name: r.name,
        scrapeUrl: r.scrapeUrl ?? "",
        cutoffHour: r.cutoffHour,
        active: r.active,
      }))}
    />
  );
}
