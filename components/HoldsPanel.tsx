"use client";

import { useDropDayStore } from "@/lib/store";
import { Countdown } from "./Countdown";

export function HoldsPanel({ onCheckout }: { onCheckout: () => void }) {
  const holds = useDropDayStore((s) => s.holds);
  const now = useDropDayStore((s) => s.now);
  const releaseHoldAction = useDropDayStore((s) => s.releaseHoldAction);

  const total = holds.reduce((sum, h) => sum + h.qty * h.unitPrice, 0);

  return (
    <div className="rounded-2xl border border-dock-700 bg-dock-900/80 p-5 flex flex-col gap-4 sticky top-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base">Your holds</h2>
        <span className="text-xs text-chalk/50 font-mono tabular">{holds.length}</span>
      </div>

      {holds.length === 0 ? (
        <p className="text-sm text-chalk/50">
          Nothing held yet. Adding an item reserves it for 60 seconds — it's not a purchase.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {holds.map((h) => (
            <li key={h.id} className="rounded-lg bg-dock-800 p-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium leading-tight">{h.productName}</p>
                  <p className="text-xs text-chalk/50">
                    Qty {h.qty} · ₹{h.unitPrice * h.qty}
                  </p>
                </div>
                <button
                  onClick={() => releaseHoldAction(h.id)}
                  className="text-xs text-chalk/40 hover:text-alert transition shrink-0"
                >
                  Release
                </button>
              </div>
              <Countdown expiresAt={h.expiresAt} now={now} />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-dock-700 pt-4 flex items-center justify-between">
        <span className="text-sm text-chalk/60">Total</span>
        <span className="font-mono tabular text-lg">₹{total}</span>
      </div>

      <button
        onClick={onCheckout}
        disabled={holds.length === 0}
        className="rounded-lg bg-go text-dock-950 font-semibold text-sm py-2.5 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition"
      >
        Review checkout
      </button>
    </div>
  );
}
