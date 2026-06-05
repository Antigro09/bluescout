"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SERIES_COLORS = [
  "var(--primary)",
  "var(--secondary)",
  "#22c55e",
  "#a78bfa",
];

export function TeamRadar({
  data,
}: {
  data: { axis: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke="var(--primary)"
          fill="var(--primary)"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function MultiRadar({
  data,
  teams,
}: {
  data: Record<string, number | string>[];
  teams: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Legend />
        {teams.map((t, i) => (
          <Radar
            key={t}
            name={t}
            dataKey={t}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
            fillOpacity={0.2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function ContributionTrend({
  data,
}: {
  data: { match: string; points: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="match"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
        <Tooltip
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--foreground)",
          }}
        />
        <Line
          type="monotone"
          dataKey="points"
          stroke="var(--primary)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
