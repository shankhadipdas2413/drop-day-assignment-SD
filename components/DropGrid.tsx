"use client";

import { useDropDayStore } from "@/lib/store";
import { ProductCard } from "./ProductCard";

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-dock-700 p-5 h-48 animate-pulse bg-dock-900/60">
      <div className="h-3 w-16 bg-dock-700 rounded mb-3" />
      <div className="h-5 w-32 bg-dock-700 rounded mb-2" />
      <div className="h-3 w-40 bg-dock-700 rounded mb-6" />
      <div className="h-8 w-full bg-dock-700 rounded" />
    </div>
  );
}

export function DropGrid() {
  const products = useDropDayStore((s) => s.products);
  const loading = useDropDayStore((s) => s.loading);
  const error = useDropDayStore((s) => s.error);
  const now = useDropDayStore((s) => s.now);
  const refresh = useDropDayStore((s) => s.refresh);

  if (loading && products.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error && products.length === 0) {
    return (
      <div className="rounded-2xl border border-alert/40 bg-dock-900 p-8 text-center">
        <p className="font-display text-lg mb-2">The grid didn't load</p>
        <p className="text-sm text-chalk/60 mb-4">{error}</p>
        <button
          onClick={refresh}
          className="rounded-lg bg-amber text-dock-950 font-semibold text-sm px-4 py-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!loading && products.length === 0) {
    return (
      <div className="rounded-2xl border border-dock-700 bg-dock-900 p-10 text-center">
        <p className="font-display text-lg mb-2">Nothing scheduled</p>
        <p className="text-sm text-chalk/60">Check back once the next drop is queued.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} now={now} />
      ))}
    </div>
  );
}
