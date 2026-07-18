"use client";

const HOLD_DURATION_MS = 60_000;
const PANIC_THRESHOLD_MS = 10_000;

export function formatRemaining(ms: number): string {
  const clamped = Math.max(0, ms);
  const seconds = Math.ceil(clamped / 1000);
  return `${String(seconds).padStart(2, "0")}s`;
}

export function Countdown({ expiresAt, now }: { expiresAt: number; now: number }) {
  const remaining = expiresAt - now;
  const pct = Math.max(0, Math.min(1, remaining / HOLD_DURATION_MS));
  const panic = remaining <= PANIC_THRESHOLD_MS && remaining > 0;

  return (
    <div className={panic ? "animate-shake" : ""}>
      <div className="flex items-center justify-between mb-1">
        <span
          className={`font-mono text-xs tabular tracking-wide ${
            panic ? "text-alert font-bold" : "text-chalk/70"
          }`}
        >
          {panic ? `⚠ PANIC · ${formatRemaining(remaining)}` : `HOLD · ${formatRemaining(remaining)}`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-dock-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
            panic ? "bg-alert animate-pulse-bar" : pct < 0.34 ? "bg-amber" : "bg-go"
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
