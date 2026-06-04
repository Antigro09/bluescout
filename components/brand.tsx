import { cn } from "@/lib/utils";

/** Blue Cheese wedge mark. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-7", className)}
      role="img"
      aria-label="BlueScout logo"
    >
      <rect x="1" y="1" width="46" height="46" rx="11" fill="#1d4ed8" />
      <path
        d="M11 33 L30 12 a3 3 0 0 1 4 1 L37 33 a2 2 0 0 1-2 2 H13 a2 2 0 0 1-2-2 Z"
        fill="#facc15"
      />
      <circle cx="20" cy="29" r="2.1" fill="#1d4ed8" />
      <circle cx="29" cy="26" r="1.6" fill="#1d4ed8" />
      <circle cx="31.5" cy="31" r="1.3" fill="#1d4ed8" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-lg font-bold tracking-tight",
        className,
      )}
    >
      <Logo />
      <span>
        Blue<span className="text-secondary">Scout</span>
      </span>
    </span>
  );
}
