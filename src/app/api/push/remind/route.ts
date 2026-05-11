import { NextResponse } from "next/server";
import { sendCutoffReminders } from "@/lib/push";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const r = await sendCutoffReminders();
  return NextResponse.json({ ok: true, ...r });
}
