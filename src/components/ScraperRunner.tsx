"use client";

import { useState, useTransition } from "react";
import { runScrape } from "@/app/actions/scraper";

type R = { id: string; name: string; scrapeUrl: string };

export function ScraperRunner({ restaurants }: { restaurants: R[] }) {
  const [selectedId, setSelectedId] = useState(restaurants[0]?.id ?? "");
  const [result, setResult] = useState<{
    daysImported: number;
    itemsImported: number;
    daysFound: number;
    log: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const r = await runScrape(selectedId);
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1">
          <span className="block text-xs font-medium uppercase text-zinc-500">Reštaurácia</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={run}
          disabled={pending || !selectedId}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {pending ? "Sťahujem..." : "Spustiť scraping"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-2 font-medium">
            Hotovo: {result.daysImported}/{result.daysFound} dní, {result.itemsImported}{" "}
            položiek
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
            {result.log.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
