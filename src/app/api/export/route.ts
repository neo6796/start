// CSV export for accounting / payroll. Admin-only.
// Modes:
//   ?type=summary&month=YYYY-MM  -> one row per user with totals
//   ?type=detailed&month=YYYY-MM -> one row per order

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "summary";
  const monthParam = url.searchParams.get("month"); // YYYY-MM
  const now = new Date();
  const [y, m] = monthParam
    ? monthParam.split("-").map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const start = new Date(y, m - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(y, m, 1);
  end.setHours(0, 0, 0, 0);
  const monthLabel = `${y}-${String(m).padStart(2, "0")}`;

  if (type === "detailed") {
    const orders = await prisma.order.findMany({
      where: { date: { gte: start, lt: end }, status: { in: ["PLACED", "DELIVERED"] } },
      include: { user: true, menuItem: true },
      orderBy: [{ date: "asc" }, { user: { email: "asc" } }],
    });
    const rows = [
      ["Dátum", "Email", "Meno", "Kategória", "Jedlo", "Cena EUR", "Stav"],
      ...orders.map((o) => [
        formatDate(o.date),
        o.user.email,
        o.user.name ?? "",
        o.menuItem.category,
        o.menuItem.name,
        (o.priceCents / 100).toFixed(2),
        o.status,
      ]),
    ];
    return csv(rows, `obedy-detail-${monthLabel}.csv`);
  }

  // summary
  const users = await prisma.user.findMany({
    include: {
      orders: {
        where: { date: { gte: start, lt: end }, status: { in: ["PLACED", "DELIVERED"] } },
      },
      payments: { where: { paidAt: { gte: start, lt: end } } },
    },
    orderBy: { email: "asc" },
  });

  const rows = [
    ["Email", "Meno", "Pocet obedov", "Spolu EUR", "Platby EUR", "Saldo EUR"],
    ...users
      .map((u) => {
        const count = u.orders.reduce((s, o) => s + o.quantity, 0);
        const totalCents = u.orders.reduce((s, o) => s + o.priceCents * o.quantity, 0);
        const paidCents = u.payments.reduce((s, p) => s + p.amountCents, 0);
        return {
          email: u.email,
          name: u.name ?? "",
          count,
          total: totalCents / 100,
          paid: paidCents / 100,
          balance: (paidCents - totalCents) / 100,
        };
      })
      .filter((r) => r.count > 0 || r.paid > 0)
      .map((r) => [
        r.email,
        r.name,
        r.count.toString(),
        r.total.toFixed(2),
        r.paid.toFixed(2),
        r.balance.toFixed(2),
      ]),
  ];
  return csv(rows, `obedy-suhrn-${monthLabel}.csv`);
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function csv(rows: string[][], filename: string): Response {
  const escape = (v: string) => {
    if (/[",\n;]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  // BOM so Excel opens UTF-8 correctly
  const body = "﻿" + rows.map((r) => r.map(escape).join(";")).join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
