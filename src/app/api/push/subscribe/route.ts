import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { endpoint?: string; p256dh?: string; auth?: string };
  if (!body.endpoint || !body.p256dh || !body.auth) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
    },
    update: {
      userId: session.user.id,
      p256dh: body.p256dh,
      auth: body.auth,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = (await req.json()) as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id },
  });
  return NextResponse.json({ ok: true });
}
