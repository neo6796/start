"use client";

import { useState } from "react";

export function ExportForm({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);

  const link = (type: "summary" | "detailed") =>
    `/api/export?type=${type}&month=${month}`;

  return (
    <div className="space-y-4">
      <label className="block max-w-xs">
        <span className="block text-xs font-medium uppercase text-zinc-500">Mesiac</span>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={link("summary")}
          download
          className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-orange-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="font-medium">📊 Súhrn (na zrážku zo mzdy)</div>
          <div className="mt-1 text-sm text-zinc-500">
            Po riadkoch: <em>email, meno, počet obedov, spolu €, platby €, saldo €</em>.
          </div>
          <div className="mt-2 text-xs text-orange-600">Stiahnuť CSV →</div>
        </a>
        <a
          href={link("detailed")}
          download
          className="block rounded-2xl border border-zinc-200 bg-white p-4 transition hover:border-orange-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="font-medium">📋 Detailný výpis</div>
          <div className="mt-1 text-sm text-zinc-500">
            Jeden riadok = jedna objednávka: <em>dátum, osoba, jedlo, cena</em>.
          </div>
          <div className="mt-2 text-xs text-orange-600">Stiahnuť CSV →</div>
        </a>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
        <strong>Tip:</strong> CSV používa stredník (<code>;</code>) a UTF-8 BOM, takže ho Excel otvorí
        rovno s diakritikou.
      </div>
    </div>
  );
}
