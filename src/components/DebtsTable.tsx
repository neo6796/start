"use client";

import { useState, useTransition } from "react";
import { recordPayment } from "@/app/actions/admin";
import { formatPrice } from "@/lib/dates";

type Row = {
  id: string;
  name: string;
  email: string;
  ordered: number;
  paid: number;
  balance: number;
};

export function DebtsTable({ rows }: { rows: Row[] }) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (userId: string) => {
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError("Zadaj sumu");
      return;
    }
    startTransition(async () => {
      try {
        await recordPayment({ userId, amountEur: amt, note });
        setOpenFor(null);
        setAmount("");
        setNote("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Chyba");
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950">
          <tr>
            <th className="px-4 py-2">Osoba</th>
            <th className="px-4 py-2 text-right">Objednané</th>
            <th className="px-4 py-2 text-right">Zaplatené</th>
            <th className="px-4 py-2 text-right">Saldo</th>
            <th className="px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((r) => (
            <>
              <tr key={r.id}>
                <td className="px-4 py-2">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-zinc-500">{r.email}</div>
                </td>
                <td className="px-4 py-2 text-right font-mono">{formatPrice(r.ordered)}</td>
                <td className="px-4 py-2 text-right font-mono">{formatPrice(r.paid)}</td>
                <td
                  className={`px-4 py-2 text-right font-mono ${
                    r.balance < 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {formatPrice(r.balance)}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => {
                      setOpenFor(openFor === r.id ? null : r.id);
                      setAmount(r.balance < 0 ? (-r.balance / 100).toFixed(2) : "");
                      setNote("");
                    }}
                    className="text-orange-600 hover:underline"
                  >
                    + Platba
                  </button>
                </td>
              </tr>
              {openFor === r.id && (
                <tr key={`${r.id}-form`} className="bg-zinc-50 dark:bg-zinc-950">
                  <td colSpan={5} className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Suma €"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-32 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <input
                        placeholder="Poznámka"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      />
                      <button
                        onClick={() => submit(r.id)}
                        disabled={pending}
                        className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700 disabled:opacity-50"
                      >
                        Pridať platbu
                      </button>
                      <button
                        onClick={() => setOpenFor(null)}
                        className="text-sm text-zinc-500"
                      >
                        Zrušiť
                      </button>
                    </div>
                    {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
