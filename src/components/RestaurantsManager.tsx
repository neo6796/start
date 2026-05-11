"use client";

import { useState, useTransition } from "react";
import { createRestaurant, updateRestaurant } from "@/app/actions/admin";

type Restaurant = {
  id: string;
  name: string;
  scrapeUrl: string;
  cutoffHour: number;
  active: boolean;
};

export function RestaurantsManager({ restaurants }: { restaurants: Restaurant[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reštaurácie</h1>

      <Form
        title="Nová reštaurácia"
        initial={{ id: "", name: "", scrapeUrl: "", cutoffHour: 10, active: true }}
        onSave={async (data) => {
          await createRestaurant({
            name: data.name,
            scrapeUrl: data.scrapeUrl || "",
            cutoffHour: data.cutoffHour,
            active: data.active,
          });
        }}
      />

      {restaurants.map((r) => (
        <Form
          key={r.id}
          title={r.name}
          initial={r}
          onSave={async (data) => {
            await updateRestaurant(r.id, {
              name: data.name,
              scrapeUrl: data.scrapeUrl || "",
              cutoffHour: data.cutoffHour,
              active: data.active,
            });
          }}
        />
      ))}
    </div>
  );
}

function Form({
  title,
  initial,
  onSave,
}: {
  title: string;
  initial: Restaurant;
  onSave: (data: Restaurant) => Promise<void>;
}) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await onSave(state);
        setSaved(true);
        if (!initial.id) setState({ id: "", name: "", scrapeUrl: "", cutoffHour: 10, active: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold uppercase text-zinc-500">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="text-xs text-zinc-500">Názov</span>
          <input
            value={state.name}
            onChange={(e) => setState({ ...state, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        <label>
          <span className="text-xs text-zinc-500">URL pre scraping (voliteľné)</span>
          <input
            type="url"
            placeholder="https://..."
            value={state.scrapeUrl}
            onChange={(e) => setState({ ...state, scrapeUrl: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        <label>
          <span className="text-xs text-zinc-500">Uzávierka (hodina, 0-23)</span>
          <input
            type="number"
            min={0}
            max={23}
            value={state.cutoffHour}
            onChange={(e) => setState({ ...state, cutoffHour: parseInt(e.target.value) || 0 })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        <label className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            checked={state.active}
            onChange={(e) => setState({ ...state, active: e.target.checked })}
          />
          <span className="text-sm">Aktívna</span>
        </label>
      </div>
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      {saved && <div className="mt-2 text-sm text-emerald-600">Uložené ✓</div>}
      <div className="mt-3 flex justify-end">
        <button
          onClick={save}
          disabled={pending || !state.name}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {initial.id ? "Uložiť" : "Pridať"}
        </button>
      </div>
    </div>
  );
}
