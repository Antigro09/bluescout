import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { Wordmark } from "@/components/brand";
import { MainNav } from "@/components/app/main-nav";
import { UserMenu } from "@/components/app/user-menu";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { SyncManager } from "@/components/scouting/sync-manager";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link href="/dashboard" className="shrink-0">
            <Wordmark />
          </Link>
          <div className="min-w-0 flex-1">
            <MainNav role={user.role} />
          </div>
          <ThemeToggle />
          <UserMenu name={user.name} role={user.role} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      <SyncManager userId={user.id} />
    </div>
  );
}
