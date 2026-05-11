import NextAuth from "next-auth";
import Nodemailer from "next-auth/providers/nodemailer";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const hasSmtp = Boolean(
  process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
  },
  providers: [
    Nodemailer({
      server: hasSmtp
        ? {
            host: process.env.EMAIL_SERVER_HOST,
            port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
            auth: {
              user: process.env.EMAIL_SERVER_USER,
              pass: process.env.EMAIL_SERVER_PASSWORD,
            },
          }
        : { streamTransport: true, newline: "unix", buffer: true },
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url, provider }) {
        if (hasSmtp) {
          const nodemailer = await import("nodemailer");
          const transport = nodemailer.createTransport(provider.server);
          await transport.sendMail({
            to: identifier,
            from: provider.from,
            subject: "Prihlásenie do appky Obedy",
            text: `Klikni na odkaz pre prihlásenie:\n\n${url}\n\nOdkaz platí 24 hodín.`,
            html: `<p>Klikni na odkaz pre prihlásenie:</p><p><a href="${url}">${url}</a></p><p>Odkaz platí 24 hodín.</p>`,
          });
        } else {
          // Dev mode without SMTP - print magic link to server console
          console.log("\n=== MAGIC LINK (dev) ===");
          console.log(`To: ${identifier}`);
          console.log(`URL: ${url}`);
          console.log("========================\n");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: "USER" | "ADMIN" }).role ?? "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      if (adminEmails.includes(user.email.toLowerCase())) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: "USER" | "ADMIN";
    };
  }
}
