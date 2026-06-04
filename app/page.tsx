import Link from "next/link";
import {
  ClipboardList,
  WifiOff,
  QrCode,
  BarChart3,
  ListOrdered,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";
import {
  APP_NAME,
  GAME_NAME,
  SEASON_YEAR,
  TEAM_NAME,
  TEAM_NUMBER,
} from "@/lib/constants";

const features = [
  {
    icon: ClipboardList,
    title: "Lead-assigned match scouting",
    body: "The scout lead assigns each signed-up scouter to a specific robot per match. Big-button REBUILT forms make stand scouting fast.",
  },
  {
    icon: WifiOff,
    title: "Offline-first",
    body: "No wifi in the stands? Entries save on-device and sync automatically when you reconnect. Nothing is ever lost.",
  },
  {
    icon: QrCode,
    title: "QR hand-off",
    body: "When there is no network at all, generate a QR code the scout lead scans to pull your data straight into the database.",
  },
  {
    icon: BarChart3,
    title: "Strategic dashboard",
    body: "Ranks every team by scoring efficiency and reliability, blending your scouting with The Blue Alliance and Statbotics EPA.",
  },
  {
    icon: ListOrdered,
    title: "Live picklists",
    body: "Build first/second-pick and do-not-pick lists together in real time, with presence, tiers, and comments.",
  },
  {
    icon: Sparkles,
    title: "AI-ready insights",
    body: "Natural-language Q&A, note summaries, and picklist suggestions are wired in behind a flag — switch on a key to enable.",
  },
];

export default function Home() {
  return (
    <div className="bg-brand-gradient flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Wordmark />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Create account</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <section className="flex flex-col items-center py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <ShieldCheck className="size-3.5 text-secondary" />
            Built for FRC {TEAM_NUMBER} {TEAM_NAME} · {SEASON_YEAR} {GAME_NAME}
          </span>
          <h1 className="mt-6 max-w-3xl text-balance text-4xl font-extrabold tracking-tight sm:text-6xl">
            Scout smarter. Pick{" "}
            <span className="text-primary">with confidence</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
            {APP_NAME} unifies match scouting, qualitative insights, and a master
            strategy dashboard into one fast, offline-ready app — so {TEAM_NAME}{" "}
            walks into alliance selection ready.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/register">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard">View the dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card/70 p-5 backdrop-blur transition-colors hover:border-primary/50"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-4" /> FRC {TEAM_NUMBER} · {TEAM_NAME}
        </span>
        <span>Data via The Blue Alliance &amp; Statbotics</span>
      </footer>
    </div>
  );
}
