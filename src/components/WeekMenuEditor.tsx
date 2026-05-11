"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertMenuWeek } from "@/app/actions/admin";

type Item = {
  category: string;
  name: string;
  description: string;
  priceEur: number;
  allergens: string;
};

type DayData = { date: string; items: Item[] };

export function WeekMenuEditor({
  restaurants,
  restaurantId,
  weekStartIso,
  days,
}: {
  restaurants: { id: string; name: string }[];
  restaurantId: string;
  weekStartIso: string;
  days: DayData[];
}) {
  const router = useRouter();
  const [state, setState] = useState<DayData[]>(days);
  const [selectedRestaurant, setSelectedRestaurant] = useState(restaurantId);
  const [weekStart, setWeekStart] = useState(weekStartIso);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = (rid: string, week: string) => {
    router.push(`/admin/menu/tyzden?restaurant=${rid}&week=${week}`);
    router.refresh();
  };

  const updateItem = (dayIdx: number, itemIdx: number, patch: Partial<Item>) => {
    setState((s) =>
      s.map((d, di) =>
        di !== dayIdx
          ? d
          : {
              ...d,
              items: d.items.map((it, ii) => (ii === itemIdx ? { ...it, ...patch } : it)),
            },
      ),
    );
  };

  const addRow = (dayIdx: number) => {
    setState((s) =>
      s.map((d, di) =>
        di !== dayIdx
          ? d
          : {
              ...d,
              items: [
                ...d.items,
                { category: "Hlavné jedlo", name: "", description: "", priceEur: 0, allergens: "" },
              ],
            },
      ),
    );
  };

  const removeRow = (dayIdx: number, itemIdx: number) => {
    setState((s) =>
      s.map((d, di) =>
        di !== dayIdx ? d : { ...d, items: d.items.filter((_, ii) => ii !== itemIdx) },
      ),
    );
  };

  const copyFromPrevious = (dayIdx: number) => {
    if (dayIdx === 0) return;
    setState((s) =>
      s.map((d, di) =>
        di !== dayIdx
          ? d
          : {
              ...d,
              items: s[di - 1].items.map((it) => ({ ...it })),
            },
      ),
    );
  };

  const copyStructureToAll = (dayIdx: number) => {
    // Copy categories + prices (but not dish names) from the chosen day to all others
    const template = state[dayIdx].items.map((it) => ({
      category: it.category,
      name: "",
      description: "",
      priceEur: it.priceEur,
      allergens: "",
    }));
    setState((s) =>
      s.map((d, di) => (di === dayIdx ? d : { ...d, items: template.map((it) => ({ ...it })) })),
    );
  };

  const save = () => {
    setError(null);
    setSavedMsg(null);
    startTransition(async () => {
      try {
        await upsertMenuWeek({
          restaurantId: selectedRestaurant,
          days: state,
        });
        setSavedMsg(`Uložené ${state.filter((d) => d.items.some((i) => i.name.trim())).length}/5 dní`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba");
      }
    });
  };

  const weekdayLabel = (iso: string) => {
    const d = new Date(iso);
    const day = new Intl.DateTimeFormat("sk-SK", { weekday: "long" }).format(d);
    const short = new Intl.DateTimeFormat("sk-SK", { day: "numeric", month: "numeric" }).format(d);
    return { day, short };
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Týždenné menu</h1>
        <p className="text-sm text-zinc-500">Po–Pi naraz. Prázdny deň sa zmaže.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="block text-xs font-medium uppercase text-zinc-500">Reštaurácia</span>
          <select
            value={selectedRestaurant}
            onChange={(e) => {
              setSelectedRestaurant(e.target.value);
              reload(e.target.value, weekStart);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-xs font-medium uppercase text-zinc-500">
            Začiatok týždňa (pondelok)
          </span>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => {
              setWeekStart(e.target.value);
              reload(selectedRestaurant, e.target.value);
            }}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          ✓ {savedMsg}
        </div>
      )}

      {state.map((day, dayIdx) => {
        const label = weekdayLabel(day.date);
        return (
          <section
            key={day.date}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
              <div>
                <span className="font-medium capitalize">{label.day}</span>
                <span className="ml-2 text-sm text-zinc-500">{label.short}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {dayIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => copyFromPrevious(dayIdx)}
                    className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  >
                    ⤴ Skopírovať z predošlého
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => copyStructureToAll(dayIdx)}
                  className="rounded-md border border-zinc-300 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  📋 Štruktúru do všetkých dní
                </button>
                <button
                  type="button"
                  onClick={() => addRow(dayIdx)}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-orange-700 hover:bg-orange-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  + Položka
                </button>
              </div>
            </header>

            <div className="space-y-2 p-3">
              {day.items.length === 0 && (
                <div className="py-3 text-center text-sm text-zinc-400">
                  Bez položiek – deň sa pri uložení zmaže.
                </div>
              )}
              {day.items.map((it, itemIdx) => (
                <div
                  key={itemIdx}
                  className="grid gap-2 rounded-lg border border-zinc-100 p-2 dark:border-zinc-800 sm:grid-cols-[120px_1fr_90px_auto]"
                >
                  <input
                    placeholder="Kategória"
                    value={it.category}
                    onChange={(e) => updateItem(dayIdx, itemIdx, { category: e.target.value })}
                    className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <div className="space-y-1">
                    <input
                      placeholder="Názov jedla"
                      value={it.name}
                      onChange={(e) => updateItem(dayIdx, itemIdx, { name: e.target.value })}
                      className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                    <div className="flex gap-1">
                      <input
                        placeholder="Popis"
                        value={it.description}
                        onChange={(e) =>
                          updateItem(dayIdx, itemIdx, { description: e.target.value })
                        }
                        className="flex-1 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <input
                        placeholder="Alergény"
                        value={it.allergens}
                        onChange={(e) =>
                          updateItem(dayIdx, itemIdx, { allergens: e.target.value })
                        }
                        className="w-28 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800"
                      />
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    placeholder="€"
                    value={it.priceEur}
                    onChange={(e) =>
                      updateItem(dayIdx, itemIdx, {
                        priceEur: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(dayIdx, itemIdx)}
                    className="self-start text-xs text-red-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Späť
        </button>
        <button
          onClick={save}
          disabled={pending || !selectedRestaurant}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {pending ? "Ukladám..." : "Uložiť týždeň"}
        </button>
      </div>
    </div>
  );
}
