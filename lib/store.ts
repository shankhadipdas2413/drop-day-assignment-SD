import { create } from "zustand";
import * as api from "./api-client";
import { Hold, Order, Product } from "./types";

const POLL_MS = 2500;
const TICK_MS = 250;

interface DropDayState {
  products: Product[];
  holds: Hold[];
  loading: boolean;
  error: string | null;
  clockOffset: number; // serverNow - Date.now() at last successful sync
  now: number; // client-estimated server time, updated every TICK_MS

  addingId: string | null; // productId currently being added (for per-card spinner)
  addError: { productId: string; message: string } | null;

  checkoutStatus: "idle" | "processing" | "success" | "error";
  checkoutError: { message: string; expiredIds?: string[] } | null;
  lastOrder: Order | null;

  init: () => () => void; // returns a cleanup function
  refresh: () => Promise<void>;
  addToCart: (product: Product, qty: number) => Promise<void>;
  releaseHoldAction: (holdId: string) => Promise<void>;
  doCheckout: (holdIds: string[]) => Promise<void>;
  dismissCheckoutResult: () => void;
}

export const useDropDayStore = create<DropDayState>((set, get) => ({
  products: [],
  holds: [],
  loading: true,
  error: null,
  clockOffset: 0,
  now: Date.now(),

  addingId: null,
  addError: null,

  checkoutStatus: "idle",
  checkoutError: null,
  lastOrder: null,

  init: () => {
    let cancelled = false;

    const tick = setInterval(() => {
      if (cancelled) return;
      set((s) => ({ now: Date.now() + s.clockOffset }));
    }, TICK_MS);

    const poll = async () => {
      if (cancelled) return;
      await get().refresh();
    };
    poll();
    const pollHandle = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(tick);
      clearInterval(pollHandle);
    };
  },

  refresh: async () => {
    try {
      const [p, h] = await Promise.all([api.fetchProducts(), api.fetchHolds()]);
      const offset = p.serverNow - Date.now();
      set({
        products: p.products,
        holds: h.holds.filter((hold) => hold.status === "active"),
        loading: false,
        error: null,
        clockOffset: offset,
        now: Date.now() + offset,
      });
    } catch (e: any) {
      set((s) => ({
        loading: false,
        error: s.products.length ? s.error : "Couldn't load the drop grid. Retrying…",
      }));
    }
  },

  addToCart: async (product, qty) => {
    set({ addingId: product.id, addError: null });
    try {
      const { hold, serverNow } = await api.placeHold(product.id, qty);
      set((s) => ({
        holds: [...s.holds, hold],
        clockOffset: serverNow - Date.now(),
        addingId: null,
      }));
      await get().refresh();
    } catch (e: any) {
      set({
        addingId: null,
        addError: {
          productId: product.id,
          message:
            e.code === "OUT_OF_STOCK"
              ? "Sold out to another shopper — refresh the count above."
              : e.code === "VALIDATION"
              ? "This drop hasn't gone live yet."
              : "Couldn't place the hold. Try again.",
        },
      });
      get().refresh();
    }
  },

  releaseHoldAction: async (holdId) => {
    set((s) => ({ holds: s.holds.filter((h) => h.id !== holdId) }));
    try {
      await api.releaseHold(holdId);
    } finally {
      get().refresh();
    }
  },

  doCheckout: async (holdIds) => {
    set({ checkoutStatus: "processing", checkoutError: null });
    try {
      const { order } = await api.checkout(holdIds);
      set({ checkoutStatus: "success", lastOrder: order, holds: [] });
    } catch (e: any) {
      set({
        checkoutStatus: "error",
        checkoutError: {
          message:
            e.code === "HOLD_EXPIRED"
              ? "One or more holds expired while you were checking out."
              : "Checkout failed. Nothing was charged — try again.",
          expiredIds: e.expiredIds,
        },
      });
      get().refresh();
    }
  },

  dismissCheckoutResult: () => set({ checkoutStatus: "idle", checkoutError: null, lastOrder: null }),
}));
