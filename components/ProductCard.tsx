"use client";

import { useState } from "react";
import { Product } from "@/lib/types";
import { useDropDayStore } from "@/lib/store";

function DropTimer({ dropAt, now }: { dropAt: number; now: number }) {
  const remaining = Math.max(0, dropAt - now);
  const totalSeconds = Math.ceil(remaining / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return (
    <span className="font-mono tabular text-sm text-amber">
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function ProductCard({ product, now }: { product: Product; now: number }) {
  const [qty, setQty] = useState(1);
  const addToCart = useDropDayStore((s) => s.addToCart);
  const addingId = useDropDayStore((s) => s.addingId);
  const addError = useDropDayStore((s) => s.addError);
  const isAdding = addingId === product.id;
  const error = addError?.productId === product.id ? addError.message : null;

  const scarce = product.status === "live" && product.remainingStock / product.totalStock <= 0.2;
  const stockPct = product.totalStock > 0 ? product.remainingStock / product.totalStock : 0;

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col gap-4 bg-dock-900/80 backdrop-blur-sm transition-colors ${
        product.status === "live"
          ? scarce
            ? "border-alert/60"
            : "border-dock-600"
          : "border-dock-700"
      }`}
    >
      {scarce && product.status === "live" && (
        <span className="absolute -top-2 -right-2 rounded-full bg-alert text-chalk text-[10px] font-bold px-2 py-1 tracking-wide">
          ALMOST GONE
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-chalk/50">{product.category}</p>
          <h3 className="font-display text-lg leading-tight mt-0.5">{product.name}</h3>
        </div>
        <p className="font-mono text-sm text-chalk/80 whitespace-nowrap">₹{product.price}</p>
      </div>

      <p className="text-sm text-chalk/60 -mt-2">{product.tagline}</p>

      {product.status === "upcoming" && (
        <div className="mt-auto flex items-center justify-between rounded-lg bg-dock-800 px-3 py-2">
          <span className="text-xs uppercase tracking-wide text-chalk/50">Dropping in</span>
          <DropTimer dropAt={product.dropAt} now={now} />
        </div>
      )}

      {product.status === "soldout" && (
        <div className="mt-auto rounded-lg bg-dock-800 px-3 py-2 text-center">
          <span className="text-xs uppercase tracking-wide text-chalk/40">Sold out</span>
        </div>
      )}

      {product.status === "live" && (
        <div className="mt-auto flex flex-col gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-chalk/50 uppercase tracking-wide">Left</span>
              <span className={`font-mono tabular ${scarce ? "text-alert" : "text-chalk/70"}`}>
                {product.remainingStock} / {product.totalStock}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-dock-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${scarce ? "bg-alert" : "bg-go"}`}
                style={{ width: `${stockPct * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-dock-600 overflow-hidden">
              <button
                aria-label="Decrease quantity"
                className="px-2.5 py-1.5 text-chalk/70 hover:bg-dock-800 disabled:opacity-30"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
              >
                −
              </button>
              <span className="w-8 text-center font-mono text-sm tabular">{qty}</span>
              <button
                aria-label="Increase quantity"
                className="px-2.5 py-1.5 text-chalk/70 hover:bg-dock-800 disabled:opacity-30"
                onClick={() => setQty((q) => Math.min(product.remainingStock, q + 1))}
                disabled={qty >= product.remainingStock}
              >
                +
              </button>
            </div>
            <button
              onClick={() => addToCart(product, qty)}
              disabled={isAdding || product.remainingStock === 0}
              className="flex-1 rounded-lg bg-amber text-dock-950 font-semibold text-sm py-1.5 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {isAdding ? "Holding…" : "Hold for 60s"}
            </button>
          </div>
          {error && <p className="text-xs text-alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
