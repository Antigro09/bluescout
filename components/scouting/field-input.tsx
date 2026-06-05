"use client";

import { Minus, Plus } from "lucide-react";
import type { ScoutField } from "@/config/rebuilt-2026";
import { cn } from "@/lib/utils";
import { Input, Textarea } from "@/components/ui/input";

export type FieldValue = string | number | boolean | string[] | null;

export function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ScoutField;
  value: FieldValue;
  onChange: (v: FieldValue) => void;
}) {
  switch (field.type) {
    case "counter": {
      const n = typeof value === "number" ? value : 0;
      const min = field.min ?? 0;
      const step = field.step ?? 1;
      return (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, n - step))}
            className="flex size-12 items-center justify-center rounded-lg border border-input bg-card text-foreground active:scale-95"
            aria-label="decrement"
          >
            <Minus className="size-5" />
          </button>
          <span
            className={cn(
              "min-w-12 text-center font-bold tabular-nums",
              field.big ? "text-4xl" : "text-2xl",
            )}
          >
            {n}
          </span>
          <button
            type="button"
            onClick={() => onChange(n + step)}
            className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground active:scale-95"
            aria-label="increment"
          >
            <Plus className="size-5" />
          </button>
        </div>
      );
    }

    case "boolean": {
      const on = value === true;
      return (
        <button
          type="button"
          onClick={() => onChange(!on)}
          className={cn(
            "h-11 w-full rounded-lg border text-sm font-semibold transition-colors",
            on
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-card text-muted-foreground",
          )}
        >
          {on ? "Yes" : "No"}
        </button>
      );
    }

    case "select": {
      return (
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => {
            const active = value === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                className={cn(
                  "h-10 rounded-lg border px-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "rating": {
      const current = typeof value === "number" ? value : 0;
      return (
        <div className="flex gap-2">
          {Array.from({ length: field.max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(current === n ? null : n)}
              className={cn(
                "size-10 rounded-lg border text-sm font-semibold transition-colors",
                current >= n && current > 0
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : "border-input bg-card text-muted-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    case "multiselect": {
      const arr = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => {
            const active = arr.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() =>
                  onChange(
                    active
                      ? arr.filter((v) => v !== o.value)
                      : [...arr, o.value],
                  )
                }
                className={cn(
                  "h-9 rounded-full border px-3 text-xs font-medium transition-colors",
                  active
                    ? "border-destructive bg-destructive/15 text-destructive"
                    : "border-input bg-card text-muted-foreground",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "number": {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min={field.min}
            max={field.max}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) =>
              onChange(e.target.value === "" ? null : Number(e.target.value))
            }
            className="max-w-32"
          />
          {field.unit && (
            <span className="text-sm text-muted-foreground">{field.unit}</span>
          )}
        </div>
      );
    }

    case "text":
    default: {
      const text = typeof value === "string" ? value : "";
      const placeholder = "placeholder" in field ? field.placeholder : undefined;
      return field.type === "text" && field.multiline ? (
        <Textarea
          value={text}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          value={text}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
  }
}
