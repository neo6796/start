// Seed a demo restaurant + admin user + sample menu for today and tomorrow.
// Run: pnpm prisma db seed
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function startOfLocalDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: { email: adminEmail, name: "Admin", role: "ADMIN" },
    update: { role: "ADMIN" },
  });
  console.log("Admin user:", admin.email);

  const restaurant = await prisma.restaurant.upsert({
    where: { id: "demo-gastroabm" },
    create: {
      id: "demo-gastroabm",
      name: "Gastro ABM",
      scrapeUrl: "https://www.gastroabm.sk/denna-ponuka/",
      cutoffHour: 10,
      active: true,
    },
    update: {},
  });
  console.log("Restaurant:", restaurant.name);

  const today = startOfLocalDay();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  for (const date of [today, tomorrow]) {
    const md = await prisma.menuDay.upsert({
      where: { date_restaurantId: { date, restaurantId: restaurant.id } },
      create: { date, restaurantId: restaurant.id, source: "MANUAL" },
      update: {},
    });
    await prisma.menuItem.deleteMany({ where: { menuDayId: md.id } });
    await prisma.menuItem.createMany({
      data: [
        {
          menuDayId: md.id,
          category: "Polievka",
          name: "Hovädzia s rezancami",
          price: 150,
          allergens: "1,3,9",
          position: 0,
        },
        {
          menuDayId: md.id,
          category: "Hlavné jedlo",
          name: "Vyprážaný rezeň, zemiaky",
          description: "Bravčový rezeň, varené zemiaky, citrón",
          price: 650,
          allergens: "1,3,7",
          position: 1,
        },
        {
          menuDayId: md.id,
          category: "Hlavné jedlo",
          name: "Kuracie soté, ryža",
          description: "Kuracie prsia, dusená ryža, šalát",
          price: 650,
          allergens: "1,7",
          position: 2,
        },
        {
          menuDayId: md.id,
          category: "Hlavné jedlo",
          name: "Špenátové halušky",
          description: "Vegetariánske, posypané syrom",
          price: 550,
          allergens: "1,3,7",
          position: 3,
        },
      ],
    });
  }
  console.log("Seeded menus for today and tomorrow.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
