"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMenuDay, upsertMenuDay } from "@/app/actions/admin";

type ItemForm = {
  category: string;
  name: string;
  description: string;
  priceEur: number;
  allergens: string;
};

type FormState = {
  date: string;
  restaurantId: string;
  items: ItemForm[];
};

export function MenuDayEditor({
  menuDayId,
  restaurants,
  initial,
}: {
  menuDayId?: string;
  restaurants: { id: string; name: string }[];
  initial: FormState;
}) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const updateItem = (i: number, patch: Partial<ItemForm>) => {
    setState((s) => ({
      ...s,
      items: s.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  };

  const addItem = () =>
    setState((s) => ({
      ...s,
      items: [
        ...s.items,
        { category: "Hlavné jedlo", name: "", description: "", priceEur: 0, allergens: "" },
      ],
    }));

  const removeItem = (i: number) =>
    setState((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await upsertMenuDay({
          restaurantId: state.restaurantId,
          date: state.date,
          items: state.items.filter((it) => it.name.trim()),
        });
        router.push("/admin/menu");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba");
      }
    });
  };

  const remove = () => {
    if (!menuDayId) return;
    if (!confirm("Naozaj zmazať toto menu?")) return;
    startTransition(async () => {
      try {
        await deleteMenuDay(menuDayId);
        router.push("/admin/menu");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{menuDayId ? "Upraviť menu" : "Nové menu"}</h1>
        {menuDayId && (
          <button
            onClick={remove}
            disabled={pending}
            className="text-sm text-red-600 hover:underline"
          >
            Zmazať deň
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase text-zinc-500">Dátum</span>
          <input
            type="date"
            value={state.date}
            onChange={(e) => setState({ ...state, date: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase text-zinc-500">Reštaurácia</span>
          <select
            value={state.restaurantId}
            onChange={(e) => setState({ ...state, restaurantId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-zinc-500">Položky</h2>
          <button
            onClick={addItem}
            className="text-sm text-orange-600 hover:underline"
            type="button"
          >
            + Pridať
          </button>
        </div>
        {state.items.map((it, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[140px_1fr_120px_auto]"
          >
            <input
              placeholder="Kategória"
              value={it.category}
              onChange={(e) => updateItem(i, { category: e.target.value })}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <div className="space-y-1">
              <input
                placeholder="Názov jedla"
                value={it.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <input
                placeholder="Popis (voliteľné)"
                value={it.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800"
              />
              <input
                placeholder="Alergény, napr. 1,3,7"
                value={it.allergens}
                onChange={(e) => updateItem(i, { allergens: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
            <input
              type="number"
              step="0.10"
              min="0"
              placeholder="€"
              value={it.priceEur}
              onChange={(e) => updateItem(i, { priceEur: parseFloat(e.target.value) || 0 })}
              className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="self-start text-sm text-red-600 hover:underline"
            >
              Zmazať
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Zrušiť
        </button>
        <button
          onClick={save}
          disabled={pending || !state.restaurantId}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          Uložiť
        </button>
      </div>
    </div>
  );
}
