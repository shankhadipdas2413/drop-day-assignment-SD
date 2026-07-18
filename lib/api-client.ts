import { ApiError, Hold, Order, Product } from "./types";

// ---------------------------------------------------------------------------
// Every component talks to data through this module only. Nothing above this
// line ever calls fetch() directly. Swapping the mock (Next.js Route Handlers
// under app/api/*) for a real backend means changing this file and nothing
// that imports it.
// ---------------------------------------------------------------------------

export class ApiClientError extends Error {
  code: ApiError["code"];
  expiredIds?: string[];
  constructor(payload: ApiError & { expiredIds?: string[] }) {
    super(payload.message);
    this.code = payload.code;
    this.expiredIds = payload.expiredIds;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const body = await res.json();
  if (!res.ok) {
    throw new ApiClientError(body);
  }
  return body as T;
}

export async function fetchProducts(): Promise<{ products: Product[]; serverNow: number }> {
  const res = await fetch("/api/products", { cache: "no-store" });
  return handle(res);
}

export async function fetchHolds(): Promise<{ holds: Hold[]; serverNow: number }> {
  const res = await fetch("/api/holds", { cache: "no-store" });
  return handle(res);
}

export async function placeHold(
  productId: string,
  qty: number
): Promise<{ hold: Hold; serverNow: number }> {
  const res = await fetch("/api/holds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, qty }),
  });
  return handle(res);
}

export async function releaseHold(holdId: string): Promise<{ hold: Hold; serverNow: number }> {
  const res = await fetch(`/api/holds/${holdId}`, { method: "DELETE" });
  return handle(res);
}

export async function checkout(
  holdIds: string[]
): Promise<{ order: Order; serverNow: number }> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ holdIds }),
  });
  return handle(res);
}
