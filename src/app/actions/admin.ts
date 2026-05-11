"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfLocalDay } from "@/lib/dates";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Nie si admin");
  }
  return session.user;
}

// ---------- Restaurants ----------

const restaurantSchema = z.object({
  name: z.string().min(1).max(100),
  scrapeUrl: z.string().url().optional().or(z.literal("")),
  cutoffHour: z.number().int().min(0).max(23),
  active: z.boolean(),
});

export async function createRestaurant(input: z.infer<typeof restaurantSchema>) {
  await requireAdmin();
  const data = restaurantSchema.parse(input);
  await prisma.restaurant.create({
    data: {
      name: data.name,
      scrapeUrl: data.scrapeUrl || null,
      cutoffHour: data.cutoffHour,
      active: data.active,
    },
  });
  revalidatePath("/admin");
}

export async function updateRestaurant(id: string, input: z.infer<typeof restaurantSchema>) {
  await requireAdmin();
  const data = restaurantSchema.parse(input);
  await prisma.restaurant.update({
    where: { id },
    data: {
      name: data.name,
      scrapeUrl: data.scrapeUrl || null,
      cutoffHour: data.cutoffHour,
      active: data.active,
    },
  });
  revalidatePath("/admin");
}

// ---------- Menu day ----------

const menuItemInput = z.object({
  category: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  priceEur: z.number().min(0),
  allergens: z.string().optional(),
});

const menuDaySchema = z.object({
  restaurantId: z.string().min(1),
  date: z.string().min(1),
  items: z.array(menuItemInput).min(1),
});

export async function upsertMenuDay(input: z.infer<typeof menuDaySchema>) {
  await requireAdmin();
  const data = menuDaySchema.parse(input);
  const date = startOfLocalDay(new Date(data.date));

  await prisma.$transaction(async (tx) => {
    const day = await tx.menuDay.upsert({
      where: { date_restaurantId: { date, restaurantId: data.restaurantId } },
      create: { date, restaurantId: data.restaurantId, source: "MANUAL" },
      update: { source: "MANUAL", published: true },
    });
    await tx.menuItem.deleteMany({ where: { menuDayId: day.id } });
    await tx.menuItem.createMany({
      data: data.items.map((it, i) => ({
        menuDayId: day.id,
        category: it.category,
        name: it.name,
        description: it.description || null,
        price: Math.round(it.priceEur * 100),
        allergens: it.allergens || null,
        position: i,
      })),
    });
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteMenuDay(id: string) {
  await requireAdmin();
  await prisma.menuDay.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/admin");
}

// ---------- Payments ----------

const paymentSchema = z.object({
  userId: z.string().min(1),
  amountEur: z.number().min(0.01),
  note: z.string().optional(),
});

export async function recordPayment(input: z.infer<typeof paymentSchema>) {
  const admin = await requireAdmin();
  const data = paymentSchema.parse(input);
  await prisma.payment.create({
    data: {
      userId: data.userId,
      amountCents: Math.round(data.amountEur * 100),
      note: data.note || null,
      recordedBy: admin.id,
    },
  });
  revalidatePath("/admin/dlhy");
}

export async function deletePayment(id: string) {
  await requireAdmin();
  await prisma.payment.delete({ where: { id } });
  revalidatePath("/admin/dlhy");
}

// ---------- Users ----------

export async function setUserRole(userId: string, role: "USER" | "ADMIN") {
  await requireAdmin();
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
}
