"use client";

import { useEffect, useState } from "react";
import { DropGrid } from "@/components/DropGrid";
import { HoldsPanel } from "@/components/HoldsPanel";
import { CheckoutPanel } from "@/components/CheckoutPanel";
import { useDropDayStore } from "@/lib/store";

export default function Home() {
  const init = useDropDayStore((s) => s.init);
  const holds = useDropDayStore((s) => s.holds);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    const cleanup = init();
    return cleanup;
  }, [init]);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-10 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-amber">
          <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse-bar" />
          Live contention · stock moves in real time
        </div>
        <h1 className="font-display text-4xl sm:text-5xl leading-[1.05]">
          DROP DAY
        </h1>
        <p className="text-chalk/60 max-w-xl text-sm sm:text-base">
          Everything below is really happening: other shoppers are pulling from the same pool,
          holds really expire in 60 seconds, and the clock that decides that is the server's, not
          yours.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <DropGrid />
        <div className="lg:sticky lg:top-6">
          <HoldsPanel onCheckout={() => setCheckoutOpen(true)} />
        </div>
      </div>

      {checkoutOpen && <CheckoutPanel onClose={() => setCheckoutOpen(false)} />}

      <footer className="mt-16 text-center text-xs text-chalk/30">
        Frontend Developer Assignment — Drop Day. No real payments, no real stock.
      </footer>
    </main>
  );
}
