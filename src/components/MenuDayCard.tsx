"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/lib/dates";
import { placeOrder, cancelOrder } from "@/app/actions/orders";

type Item = {
  id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  allergens: string | null;
};

export function MenuDayCard({
  dateLabel,
  restaurantName,
  cutoffHour,
  closed,
  items,
  myOrderItemId,
  myOrderId,
}: {
  dateLabel: string;
  restaurantName: string;
  cutoffHour: number;
  closed: boolean;
  items: Item[];
  myOrderItemId: string | null;
  myOrderId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const grouped = new Map<string, Item[]>();
  for (const it of items) {
    if (!grouped.has(it.category)) grouped.set(it.category, []);
    grouped.get(it.category)!.push(it);
  }

  const handleOrder = (menuItemId: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await placeOrder({ menuItemId });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba");
      }
    });
  };

  const handleCancel = () => {
    if (!myOrderId) return;
    setError(null);
    startTransition(async () => {
      try {
        await cancelOrder(myOrderId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba");
      }
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <div className="font-semibold capitalize">{dateLabel}</div>
          <div className="text-xs text-zinc-500">{restaurantName}</div>
        </div>
        <div className="text-right">
          {closed ? (
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Uzavreté
            </span>
          ) : (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              Uzávierka o {String(cutoffHour).padStart(2, "0")}:00
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {Array.from(grouped.entries()).map(([category, list]) => (
          <div key={category} className="px-4 py-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {category}
            </div>
            <ul className="space-y-2">
              {list.map((item) => {
                const selected = item.id === myOrderItemId;
                return (
                  <li
                    key={item.id}
                    className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition ${
                      selected
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-950"
                        : "border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-zinc-500">{item.description}</div>
                      )}
                      {item.allergens && (
                        <div className="mt-0.5 text-xs text-zinc-400">
                          Alergény: {item.allergens}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 whitespace-nowrap">
                      <span className="font-mono text-sm">{formatPrice(item.price)}</span>
                      {selected ? (
                        <button
                          onClick={handleCancel}
                          disabled={closed || pending}
                          className="rounded-md bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-300 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          Zrušiť
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOrder(item.id)}
                          disabled={closed || pending}
                          className="rounded-md bg-orange-600 px-3 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                        >
                          {myOrderItemId ? "Zmeniť" : "Objednať"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
