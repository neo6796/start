import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-6 text-center">
          <div className="mb-2 text-5xl">🍲</div>
          <h1 className="text-2xl font-semibold">Obedy</h1>
          <p className="mt-1 text-sm text-zinc-500">Prihlás sa pracovným emailom</p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Prihlásenie zlyhalo. Skús znova.
          </div>
        )}

        <form
          action={async (formData: FormData) => {
            "use server";
            await signIn("nodemailer", {
              email: formData.get("email"),
              redirectTo: callbackUrl ?? "/",
            });
          }}
          className="space-y-3"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="meno@firma.sk"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-700"
          >
            Poslať prihlasovací odkaz
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Pošleme ti email s odkazom na prihlásenie.
        </p>
      </div>
    </div>
  );
}
