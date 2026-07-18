"use client";

import { useDropDayStore } from "@/lib/store";
import { Countdown } from "./Countdown";

export function CheckoutPanel({ onClose }: { onClose: () => void }) {
  const holds = useDropDayStore((s) => s.holds);
  const now = useDropDayStore((s) => s.now);
  const status = useDropDayStore((s) => s.checkoutStatus);
  const checkoutError = useDropDayStore((s) => s.checkoutError);
  const lastOrder = useDropDayStore((s) => s.lastOrder);
  const doCheckout = useDropDayStore((s) => s.doCheckout);
  const dismissCheckoutResult = useDropDayStore((s) => s.dismissCheckoutResult);
  const releaseHoldAction = useDropDayStore((s) => s.releaseHoldAction);

  const total = holds.reduce((sum, h) => sum + h.qty * h.unitPrice, 0);

  const close = () => {
    dismissCheckoutResult();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-dock-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-dock-600 bg-dock-900 p-6 flex flex-col gap-5">
        {status === "success" && lastOrder ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-widest text-go mb-1">Order confirmed</p>
              <h2 className="font-display text-xl">No card was charged</h2>
              <p className="text-sm text-chalk/50 mt-1 font-mono">{lastOrder.id}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {lastOrder.items.map((i) => (
                <li key={i.productId} className="flex justify-between text-sm">
                  <span>
                    {i.productName} × {i.qty}
                  </span>
                  <span className="font-mono tabular">₹{i.qty * i.unitPrice}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-dock-700 pt-3 flex justify-between font-medium">
              <span>Total</span>
              <span className="font-mono tabular">₹{lastOrder.total}</span>
            </div>
            <button
              onClick={close}
              className="rounded-lg bg-amber text-dock-950 font-semibold text-sm py-2.5"
            >
              Back to the grid
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Confirm order</h2>
              <button onClick={close} className="text-chalk/40 hover:text-chalk text-sm">
                Close
              </button>
            </div>

            {holds.length === 0 ? (
              <p className="text-sm text-chalk/60">
                Every hold on this order expired or was released. Nothing to confirm — head back
                and grab another drop.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {holds.map((h) => (
                  <li key={h.id} className="rounded-lg bg-dock-800 p-3 flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {h.productName} × {h.qty}
                      </span>
                      <span className="font-mono tabular">₹{h.qty * h.unitPrice}</span>
                    </div>
                    <Countdown expiresAt={h.expiresAt} now={now} />
                  </li>
                ))}
              </ul>
            )}

            {holds.length > 0 && (
              <div className="border-t border-dock-700 pt-3 flex justify-between font-medium">
                <span>Total</span>
                <span className="font-mono tabular">₹{total}</span>
              </div>
            )}

            {status === "error" && checkoutError && (
              <div className="rounded-lg border border-alert/50 bg-alert/10 p-3">
                <p className="text-sm text-alert font-medium">{checkoutError.message}</p>
                <p className="text-xs text-chalk/60 mt-1">
                  Nothing was charged. Expired items were dropped from your order — review what's
                  left and confirm again, or keep browsing.
                </p>
                {checkoutError.expiredIds?.map((id) => (
                  <button
                    key={id}
                    onClick={() => releaseHoldAction(id)}
                    className="hidden"
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => doCheckout(holds.map((h) => h.id))}
              disabled={holds.length === 0 || status === "processing"}
              className="rounded-lg bg-go text-dock-950 font-semibold text-sm py-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {status === "processing" ? "Confirming…" : "Confirm order · Mock, no payment"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
