import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { PWARegister } from "@/components/PWARegister";
import { PushButton } from "@/components/PushButton";
import "./globals.css";

const inter = Inter({ variable: "--font-sans", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Obedy",
  description: "Centralizované objednávanie obedov",
  manifest: "/manifest.webmanifest",
  appleWebApp: { title: "Obedy", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="sk" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {session?.user && (
          <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <span className="text-xl">🍲</span>
                <span>Obedy</span>
              </Link>
              <nav className="flex items-center gap-1 text-sm">
                <Link
                  href="/"
                  className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Menu
                </Link>
                <Link
                  href="/moje-objednavky"
                  className="rounded-md px-3 py-1.5 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Moje
                </Link>
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="rounded-md px-3 py-1.5 text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950"
                  >
                    Admin
                  </Link>
                )}
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-md px-3 py-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Odhlásiť
                  </button>
                </form>
              </nav>
            </div>
          </header>
        )}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        {session?.user && (
          <footer className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{session.user.email}</span>
              <PushButton vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null} />
            </div>
          </footer>
        )}
        <PWARegister />
      </body>
    </html>
  );
}
