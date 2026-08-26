import { Flame, ListChecks } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { QuickAdd } from "@/components/revisions/quick-add";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/ui/nav-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getStreak } from "@/services/statistics";
import { getRevisionQueue } from "@/services/revisions";
import { requireSession } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const userId = session.user.id;

  const [{ current: streak }, queue] = await Promise.all([
    getStreak(userId),
    getRevisionQueue(userId),
  ]);
  const dueToday = queue.due.length + queue.overdue.length;
  const completedToday = queue.completedToday;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/dashboard" className="font-mono text-sm font-bold tracking-tight">
            DSA<span className="text-primary">Revise</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/problems">Problems</NavLink>
            <NavLink href="/calendar">Calendar</NavLink>
            <NavLink href="/statistics">Statistics</NavLink>
            <NavLink href="/settings">Settings</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {dueToday > 0 && (
              <span
                className="hidden items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger md:inline-flex"
                title={`You have ${dueToday} problem${dueToday === 1 ? "" : "s"} to revise (${queue.overdue.length} overdue, ${queue.due.length} due today)`}
              >
                🔔 {dueToday} to revise
              </span>
            )}
            {dueToday === 0 && (
              <span
                className="hidden items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success md:inline-flex"
                title="You have completed today's revisions."
              >
                ✓ All done for today
              </span>
            )}
            <span
              className="hidden items-center gap-1 text-sm font-medium sm:inline-flex"
              title={`${streak}-day revision streak`}
            >
              <Flame className={`size-4 ${streak > 0 ? "text-warning" : "text-muted-foreground"}`} />
              {streak}
            </span>
            <span
              className="hidden items-center gap-1 text-sm font-medium sm:inline-flex"
              title="Today's completed revisions"
            >
              <ListChecks className="size-4 text-success" />
              {completedToday}/{dueToday}
            </span>
            <ThemeToggle />
            <QuickAdd />
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t px-4 py-1.5 md:hidden">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/problems">Problems</NavLink>
          <NavLink href="/calendar">Calendar</NavLink>
          <NavLink href="/statistics">Statistics</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
