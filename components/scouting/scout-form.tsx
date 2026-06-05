"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Wifi, WifiOff, Save } from "lucide-react";
import { MATCH_SCOUT_SECTIONS } from "@/config/rebuilt-2026";
import { FieldInput, type FieldValue } from "@/components/scouting/field-input";
import {
  cacheAssignments,
  flushQueue,
  getCachedAssignment,
  getDeviceId,
  getQueuedForMatchTeam,
  getStoredUserId,
  queueReport,
} from "@/lib/offline/sync";
import type { ReportInput } from "@/lib/scouting/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Ctx {
  matchTeamId: string;
  matchId: string;
  eventId: string;
  teamNumber: number;
  nickname: string | null;
  alliance: string;
  position: number;
  matchNumber: number;
  compLevel: string;
}

const DEFAULTS: Record<string, FieldValue> = {
  startPosition: null,
  noShow: false,
  autoLeave: false,
  autoFuel: 0,
  autoClimbL1: false,
  teleopFuel: 0,
  endgameClimb: "NONE",
  climbFailed: false,
  defensePlayed: "NONE",
  defenseRating: null,
  driverSkill: null,
  reliability: [],
  card: "NONE",
  notes: "",
};

const ACCENT: Record<string, string> = {
  auto: "border-l-auto",
  teleop: "border-l-teleop",
  endgame: "border-l-endgame",
  neutral: "border-l-border",
};

export function ScoutForm({ matchTeamId }: { matchTeamId: string }) {
  const router = useRouter();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [values, setValues] = useState<Record<string, FieldValue>>({
    ...DEFAULTS,
  });
  const [clientUuid, setClientUuid] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      let context: Ctx | null = null;
      const cached = await getCachedAssignment(matchTeamId);
      if (cached) {
        context = {
          matchTeamId: cached.matchTeamId,
          matchId: cached.matchId,
          eventId: cached.eventId,
          teamNumber: cached.teamNumber,
          nickname: cached.nickname,
          alliance: cached.alliance,
          position: cached.position,
          matchNumber: cached.matchNumber,
          compLevel: cached.compLevel,
        };
      } else if (navigator.onLine) {
        try {
          const res = await fetch(`/api/match-team/${matchTeamId}`);
          if (res.ok) {
            const d = await res.json();
            context = {
              matchTeamId: d.matchTeamId,
              matchId: d.matchId,
              eventId: d.eventId,
              teamNumber: d.teamNumber,
              nickname: d.nickname,
              alliance: d.alliance,
              position: d.position,
              matchNumber: d.matchNumber,
              compLevel: d.compLevel,
            };
            await cacheAssignments([
              { ...d, status: "PENDING", cachedAt: Date.now() },
            ]);
          }
        } catch {
          /* offline */
        }
      }

      const existing = await getQueuedForMatchTeam(matchTeamId);
      if (!active) return;
      if (existing) {
        setClientUuid(existing.clientUuid);
        setValues({
          ...DEFAULTS,
          startPosition: existing.startPosition ?? null,
          noShow: existing.noShow,
          autoLeave: existing.autoLeave,
          autoFuel: existing.autoFuel,
          autoClimbL1: existing.autoClimbL1,
          teleopFuel: existing.teleopFuel,
          endgameClimb: existing.endgameClimb,
          climbFailed: existing.climbFailed,
          defensePlayed: existing.defensePlayed,
          defenseRating: existing.defenseRating ?? null,
          driverSkill: existing.driverSkill ?? null,
          reliability: existing.reliability,
          card: existing.card,
          notes: existing.notes ?? "",
        });
      } else {
        setClientUuid(crypto.randomUUID());
      }
      setCtx(context);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [matchTeamId]);

  function setValue(key: string, v: FieldValue) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function submit() {
    if (!ctx) {
      setError(
        "Match details aren't cached. Open this match once while online, then you can scout it offline.",
      );
      return;
    }
    setSaving(true);
    setError(null);

    const str = (v: FieldValue) => (v == null ? null : String(v));
    const num = (v: FieldValue) => (typeof v === "number" ? v : null);

    const payload: ReportInput = {
      clientUuid,
      matchTeamId: ctx.matchTeamId,
      matchId: ctx.matchId,
      eventId: ctx.eventId,
      teamNumber: ctx.teamNumber,
      scouterId: getStoredUserId(),
      startPosition: (str(values.startPosition) as ReportInput["startPosition"]) ?? null,
      noShow: values.noShow === true,
      autoLeave: values.autoLeave === true,
      autoFuel: Number(values.autoFuel) || 0,
      autoClimbL1: values.autoClimbL1 === true,
      teleopFuel: Number(values.teleopFuel) || 0,
      endgameClimb: String(values.endgameClimb || "NONE") as ReportInput["endgameClimb"],
      climbFailed: values.climbFailed === true,
      defensePlayed: String(values.defensePlayed || "NONE") as ReportInput["defensePlayed"],
      defenseRating: num(values.defenseRating),
      driverSkill: num(values.driverSkill),
      reliability: (Array.isArray(values.reliability)
        ? values.reliability
        : []) as ReportInput["reliability"],
      card: String(values.card || "NONE") as ReportInput["card"],
      notes: typeof values.notes === "string" && values.notes ? values.notes : null,
      scoutedAt: new Date().toISOString(),
      deviceId: getDeviceId(),
    };

    await queueReport(payload);
    const { ok } = await flushQueue();
    setSaving(false);
    toast.success(
      ok > 0 ? "Report submitted" : "Saved on device — will sync when online",
    );
    router.push("/assignments");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div
            className={cn(
              "flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-md text-xs font-semibold",
              ctx?.alliance === "RED"
                ? "bg-red-500/15 text-red-500"
                : "bg-blue-500/15 text-blue-500",
            )}
          >
            <span className="text-[10px] uppercase opacity-70">
              {ctx?.compLevel === "QM" ? "Qual" : (ctx?.compLevel ?? "")}
            </span>
            <span className="text-xl">{ctx?.matchNumber ?? "?"}</span>
          </div>
          <div>
            <div className="text-lg font-bold">
              Team {ctx?.teamNumber ?? "—"}
            </div>
            <div className="text-sm text-muted-foreground">
              {ctx?.nickname ?? "Unknown match (offline)"}
            </div>
          </div>
        </CardContent>
      </Card>

      {MATCH_SCOUT_SECTIONS.map((section) => (
        <Card
          key={section.id}
          className={cn("border-l-4", ACCENT[section.accent ?? "neutral"])}
        >
          <CardContent className="space-y-5 py-5">
            <h2 className="font-semibold">{section.title}</h2>
            {section.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label className="block text-sm font-medium">
                  {field.label}
                  {field.help && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      — {field.help}
                    </span>
                  )}
                </label>
                <FieldInput
                  field={field}
                  value={values[field.key] ?? null}
                  onChange={(v) => setValue(field.key, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Badge variant={online ? "muted" : "warning"}>
            {online ? (
              <Wifi className="mr-1 size-3" />
            ) : (
              <WifiOff className="mr-1 size-3" />
            )}
            {online ? "Online" : "Offline — saves locally"}
          </Badge>
          <Button onClick={submit} disabled={saving} size="lg">
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Submit report
          </Button>
        </div>
      </div>
    </div>
  );
}
