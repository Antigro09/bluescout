"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function TeamComparePicker({
  all,
  selected,
}: {
  all: { teamNumber: number; nickname: string | null }[];
  selected: number[];
}) {
  const router = useRouter();

  function update(nums: number[]) {
    const q = nums.length ? `?teams=${nums.join(",")}` : "";
    router.push(`/dashboard/compare${q}`);
  }

  const available = all.filter((t) => !selected.includes(t.teamNumber));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selected.map((n) => (
        <button
          key={n}
          onClick={() => update(selected.filter((x) => x !== n))}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
        >
          {n}
          <X className="size-3" />
        </button>
      ))}
      {selected.length < 4 && (
        <select
          value=""
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v && !selected.includes(v)) update([...selected, v]);
          }}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">+ Add team</option>
          {available.map((t) => (
            <option key={t.teamNumber} value={t.teamNumber}>
              {t.teamNumber}
              {t.nickname ? ` · ${t.nickname}` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
