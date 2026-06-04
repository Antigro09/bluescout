import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { UserAdminRow } from "@/components/app/user-admin-row";

export const metadata: Metadata = { title: "People" };

export default async function UsersAdminPage() {
  const me = await requireRole(["ADMIN", "SCOUT_LEAD"]);
  const users = await prisma.user.findMany({
    orderBy: [{ approved: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approved: true,
      active: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        subtitle="Approve new scouters and manage roles for FRC 1086."
      />
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-medium">Member</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserAdminRow key={u.id} user={u} isSelf={u.id === me.id} />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
