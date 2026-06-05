"use client";

import { useState } from "react";
import { cn, fmt } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SimTeam {
  teamNumber: number;
  nickname: string | null;
  epaTotal: number | null;
  epaAuto: number | null;
  epaTeleop: number | null;
  epaEndgame: number | null;
}

type PhaseKey = "epaAuto" | "epaTeleop" | "epaEndgame";

function TeamSelect({
  teams,
  value,
  onChange,
}: {
  teams: SimTeam[];
  value: number | null;
  onChange: (n: number | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
    >
      <option value="">— empty —</option>
      {teams.map((t) => (
        <option key={t.teamNumber} value={t.teamNumber}>
          {t.teamNumber} · {fmt(t.epaTotal, 0)} EPA
        </option>
      ))}
    </select>
  );
}

export function Simulator({ teams }: { teams: SimTeam[] }) {
  const [mode, setMode] = useState<"alliance" | "match">("alliance");
  const byNum = new Map(teams.map((t) => [t.teamNumber, t]));
  const get = (n: number | null) => (n ? byNum.get(n) : undefined);
  const sum = (picks: (number | null)[], key: PhaseKey | "epaTotal"): number =>
    picks.reduce<number>((a, n) => a + (get(n)?.[key] ?? 0), 0);

  const [alliance, setAlliance] = useState<(number | null)[]>([null, null, null]);
  const [red, setRed] = useState<(number | null)[]>([null, null, null]);
  const [blue, setBlue] = useState<(number | null)[]>([null, null, null]);

  return (
    <div className="space-y-4">
      <div className="flex w-fit gap-1 rounded-lg border border-border bg-card p-1">
        {(["alliance", "match"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize",
              mode === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "alliance" ? "Alliance builder" : "Match predictor"}
          </button>
        ))}
      </div>

      {mode === "alliance" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected alliance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {alliance.map((v, i) => (
                <TeamSelect
                  key={i}
                  teams={teams}
                  value={v}
                  onChange={(n) =>
                    setAlliance((a) => a.map((x, j) => (j === i ? n : x)))
                  }
                />
              ))}
            </div>
            <div className="rounded-lg bg-muted/40 p-4 text-center">
              <div className="text-4xl font-bold text-primary tabular-nums">
                {Math.round(sum(alliance, "epaTotal"))}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                projected points (EPA)
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <Phase label="Auto" value={sum(alliance, "epaAuto")} accent="auto" />
              <Phase label="Teleop" value={sum(alliance, "epaTeleop")} accent="teleop" />
              <Phase label="Endgame" value={sum(alliance, "epaEndgame")} accent="endgame" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <MatchPredictor
          teams={teams}
          red={red}
          blue={blue}
          setRed={setRed}
          setBlue={setBlue}
          redEpa={sum(red, "epaTotal")}
          blueEpa={sum(blue, "epaTotal")}
        />
      )}
    </div>
  );
}

function Phase({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "auto" | "teleop" | "endgame";
}) {
  const color =
    accent === "auto"
      ? "text-auto"
      : accent === "teleop"
        ? "text-teleop"
        : "text-endgame";
  return (
    <div className="rounded-lg border border-border py-2">
      <div className={cn("text-lg font-bold tabular-nums", color)}>
        {Math.round(value)}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MatchPredictor({
  teams,
  red,
  blue,
  setRed,
  setBlue,
  redEpa,
  blueEpa,
}: {
  teams: SimTeam[];
  red: (number | null)[];
  blue: (number | null)[];
  setRed: (f: (a: (number | null)[]) => (number | null)[]) => void;
  setBlue: (f: (a: (number | null)[]) => (number | null)[]) => void;
  redEpa: number;
  blueEpa: number;
}) {
  const pRed = 1 / (1 + Math.exp(-(redEpa - blueEpa) / 8));
  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-red-500">Red alliance</div>
            {red.map((v, i) => (
              <TeamSelect
                key={i}
                teams={teams}
                value={v}
                onChange={(n) => setRed((a) => a.map((x, j) => (j === i ? n : x)))}
              />
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-blue-500">Blue alliance</div>
            {blue.map((v, i) => (
              <TeamSelect
                key={i}
                teams={teams}
                value={v}
                onChange={(n) => setBlue((a) => a.map((x, j) => (j === i ? n : x)))}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <Side label="Red" value={Math.round(redEpa)} color="text-red-500" />
          <div className="text-center">
            <div className="text-xs uppercase text-muted-foreground">Win prob</div>
            <div className="font-bold">
              {Math.round(pRed * 100)}% / {Math.round((1 - pRed) * 100)}%
            </div>
          </div>
          <Side label="Blue" value={Math.round(blueEpa)} color="text-blue-500" />
        </div>
        <div className="flex h-3 overflow-hidden rounded-full">
          <div className="bg-red-500" style={{ width: `${pRed * 100}%` }} />
          <div className="bg-blue-500" style={{ width: `${(1 - pRed) * 100}%` }} />
        </div>
      </CardContent>
    </Card>
  );
}

function Side({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="text-center">
      <div className={cn("text-3xl font-bold tabular-nums", color)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label} projected</div>
    </div>
  );
}
