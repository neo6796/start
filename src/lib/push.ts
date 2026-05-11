import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function configure() {
  if (configured) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID keys not configured");
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:admin@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
  configured = true;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
) {
  configure();
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err: unknown) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } });
        }
      }
    }),
  );
}

export async function sendCutoffReminders() {
  // Find users who don't have an order for today yet and have a push sub
  const { startOfLocalDay, addDays } = await import("@/lib/dates");
  const today = startOfLocalDay();
  const tomorrow = addDays(today, 1);

  const todayHasMenu = await prisma.menuDay.findFirst({
    where: { date: today, published: true },
  });
  if (!todayHasMenu) return { skipped: "no-menu-today" };

  const usersWithOrder = await prisma.order.findMany({
    where: { date: { gte: today, lt: tomorrow }, status: "PLACED" },
    select: { userId: true },
  });
  const ordered = new Set(usersWithOrder.map((o) => o.userId));

  const subs = await prisma.pushSubscription.findMany({
    where: { user: { id: { notIn: Array.from(ordered) } } },
    distinct: ["userId"],
    select: { userId: true },
  });
  const targetUserIds = subs.map((s) => s.userId);
  if (targetUserIds.length === 0) return { sent: 0 };

  await sendPushToUsers(targetUserIds, {
    title: "Obedy – nezabudni!",
    body: "Ešte si si dnes neobjednal/a obed. Uzávierka sa blíži.",
    url: "/",
  });
  return { sent: targetUserIds.length };
}
