"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPastCutoff, startOfLocalDay } from "@/lib/dates";

const placeSchema = z.object({
  menuItemId: z.string().min(1),
  note: z.string().max(200).optional(),
});

export async function placeOrder(input: z.infer<typeof placeSchema>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Neprihlásený");

  const data = placeSchema.parse(input);

  const item = await prisma.menuItem.findUnique({
    where: { id: data.menuItemId },
    include: { menuDay: { include: { restaurant: true } } },
  });
  if (!item) throw new Error("Položka neexistuje");

  if (isPastCutoff(item.menuDay.date, item.menuDay.restaurant.cutoffHour)) {
    throw new Error("Uzávierka pre tento deň už prebehla");
  }

  const day = startOfLocalDay(item.menuDay.date);

  // One main course per user per day - if they already ordered, replace it.
  const existing = await prisma.order.findFirst({
    where: { userId: session.user.id, date: day, status: "PLACED" },
  });

  if (existing) {
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        menuItemId: item.id,
        priceCents: item.price,
        note: data.note ?? null,
      },
    });
  } else {
    await prisma.order.create({
      data: {
        userId: session.user.id,
        menuItemId: item.id,
        date: day,
        priceCents: item.price,
        note: data.note ?? null,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/moje-objednavky");
}

export async function cancelOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Neprihlásený");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { menuItem: { include: { menuDay: { include: { restaurant: true } } } } },
  });
  if (!order) throw new Error("Objednávka neexistuje");
  if (order.userId !== session.user.id && session.user.role !== "ADMIN") {
    throw new Error("Nepovolené");
  }
  if (isPastCutoff(order.menuItem.menuDay.date, order.menuItem.menuDay.restaurant.cutoffHour)) {
    throw new Error("Uzávierka pre tento deň už prebehla");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/");
  revalidatePath("/moje-objednavky");
}
