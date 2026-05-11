import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/components/UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "desc" }, { email: "asc" }],
  });
  return (
    <UsersTable
      users={users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name ?? "",
        role: u.role,
      }))}
    />
  );
}
