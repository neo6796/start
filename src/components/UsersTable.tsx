"use client";

import { useTransition } from "react";
import { setUserRole } from "@/app/actions/admin";

type U = { id: string; email: string; name: string; role: "USER" | "ADMIN" };

export function UsersTable({ users }: { users: U[] }) {
  const [pending, startTransition] = useTransition();

  const toggle = (u: U) => {
    const next = u.role === "ADMIN" ? "USER" : "ADMIN";
    startTransition(async () => {
      await setUserRole(u.id, next);
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Používatelia</h1>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500 dark:bg-zinc-950">
            <tr>
              <th className="px-4 py-2">Email / meno</th>
              <th className="px-4 py-2">Rola</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">
                  <div className="font-medium">{u.name || u.email}</div>
                  {u.name && <div className="text-xs text-zinc-500">{u.email}</div>}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      u.role === "ADMIN"
                        ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => toggle(u)}
                    disabled={pending}
                    className="text-sm text-orange-600 hover:underline disabled:opacity-50"
                  >
                    {u.role === "ADMIN" ? "Odobrať admin" : "Spraviť admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
