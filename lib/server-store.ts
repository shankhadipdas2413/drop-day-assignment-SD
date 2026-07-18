import { Hold, Product } from "./types";

// ---------------------------------------------------------------------------
// This module is the ENTIRE "backend" for the assignment. It is intentionally
// kept in-memory and process-local: there is no database. On a serverless
// deploy each cold instance gets a fresh world; see README for that tradeoff.
//
// Design note: the server's clock is the only clock that matters. Every
// timestamp a client receives (dropAt, expiresAt) is authoritative and the
// client only ever *renders* against it -- it never invents its own expiry.
// See DECISIONS.md, "whose clock is the truth".
// ---------------------------------------------------------------------------

const HOLD_DURATION_MS = 60_000;
const SIM_TICK_MS = 3_000; // granularity of the "other shoppers" simulation
const PRODUCT_LATENCY = [220, 650] as const;
const WRITE_LATENCY = [300, 900] as const;
const FAILURE_RATE = 0.1; // 10% of writes fail, on purpose

interface ServerProduct extends Product {
  lastSimAt: number;
  lastTick: number;
}

interface World {
  products: Map<string, ServerProduct>;
  holds: Map<string, Hold>;
}

declare global {
  // eslint-disable-next-line no-var
  var __dropDayWorld: World | undefined;
}

function seedProducts(): ServerProduct[] {
  const now = Date.now();
  // Hand-authored catalog: mix of already-live, dropping-soon, and sold-out.
  const catalog: Array<{
    id: string;
    name: string;
    tagline: string;
    category: string;
    price: number;
    totalStock: number;
    dropOffsetMs: number;
  }> = [
    { id: "nova-runner", name: "Nova Runner", tagline: "Reflective knit, foam sole", category: "Footwear", price: 4200, totalStock: 18, dropOffsetMs: -120_000 },
    { id: "glow-tee", name: "Glow Tee", tagline: "UV-reactive pigment print", category: "Apparel", price: 1450, totalStock: 40, dropOffsetMs: -60_000 },
    { id: "circuit-cap", name: "Circuit Cap", tagline: "Woven cable-stitch panel", category: "Accessories", price: 990, totalStock: 25, dropOffsetMs: -30_000 },
    { id: "vault-hoodie", name: "Vault Hoodie", tagline: "Heavyweight, bonded seams", category: "Apparel", price: 3600, totalStock: 15, dropOffsetMs: -10_000 },
    { id: "prism-socks", name: "Prism Socks (3-pack)", tagline: "Gradient dye, no two alike", category: "Accessories", price: 650, totalStock: 50, dropOffsetMs: -5_000 },
    { id: "ghost-jacket", name: "Ghost Jacket", tagline: "Matte shell, sealed zips", category: "Apparel", price: 7800, totalStock: 10, dropOffsetMs: 45_000 },
    { id: "arc-visor", name: "Arc Visor", tagline: "Polarized, snap-fit", category: "Accessories", price: 2100, totalStock: 20, dropOffsetMs: 90_000 },
    { id: "drift-shorts", name: "Drift Shorts", tagline: "Quick-dry ripstop", category: "Apparel", price: 1800, totalStock: 30, dropOffsetMs: 180_000 },
    { id: "relic-belt", name: "Relic Belt", tagline: "Cast buckle, waxed strap", category: "Accessories", price: 1250, totalStock: 0, dropOffsetMs: -300_000 },
    { id: "static-slides", name: "Static Slides", tagline: "Molded footbed, single strap", category: "Footwear", price: 1600, totalStock: 0, dropOffsetMs: -200_000 },
  ];

  return catalog.map((c) => {
    const dropAt = now + c.dropOffsetMs;
    const remainingStock = c.totalStock;
    return {
      id: c.id,
      name: c.name,
      tagline: c.tagline,
      category: c.category,
      price: c.price,
      totalStock: c.totalStock,
      remainingStock,
      dropAt,
      status: deriveStatus(dropAt, remainingStock, now),
      lastSimAt: now,
      lastTick: 0,
    };
  });
}

function deriveStatus(dropAt: number, remainingStock: number, now: number): Product["status"] {
  if (now < dropAt) return "upcoming";
  if (remainingStock <= 0) return "soldout";
  return "live";
}

function getWorld(): World {
  if (!globalThis.__dropDayWorld) {
    globalThis.__dropDayWorld = {
      products: new Map(seedProducts().map((p) => [p.id, p])),
      holds: new Map(),
    };
  }
  return globalThis.__dropDayWorld;
}

// Deterministic pseudo-random in [0,1) seeded by string+int, so replaying the
// same tick twice in the same request burst can't double-decrement stock.
function seededRandom(seed: string, n: number): number {
  let h = 2166136261 ^ n;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;
  return ((h >>> 0) % 100000) / 100000;
}

function delay(range: readonly [number, number]) {
  const ms = range[0] + Math.random() * (range[1] - range[0]);
  return new Promise((res) => setTimeout(res, ms));
}

function maybeFail(): void {
  if (Math.random() < FAILURE_RATE) {
    const err: any = new Error("Simulated upstream failure");
    err.code = "SERVER_ERROR";
    throw err;
  }
}

/** Simulate other shoppers nibbling at stock, purely as a function of elapsed server time. */
function simulateProduct(p: ServerProduct, now: number) {
  if (now < p.dropAt) return;
  const elapsedTicks = Math.floor((now - p.lastSimAt) / SIM_TICK_MS);
  if (elapsedTicks <= 0) return;
  for (let i = 0; i < elapsedTicks; i++) {
    if (p.remainingStock <= 0) break;
    const roll = seededRandom(p.id, p.lastTick + i);
    // Popular drops contend harder: smaller total stock => higher contention chance.
    const contention = p.totalStock <= 20 ? 0.32 : 0.18;
    if (roll < contention) p.remainingStock -= 1;
  }
  p.lastTick += elapsedTicks;
  p.lastSimAt += elapsedTicks * SIM_TICK_MS;
}

function sweepExpiredHolds(world: World, now: number) {
  for (const hold of world.holds.values()) {
    if (hold.status === "active" && hold.expiresAt <= now) {
      hold.status = "expired";
      const product = world.products.get(hold.productId);
      if (product) {
        product.remainingStock += hold.qty;
        if (product.remainingStock > product.totalStock) {
          product.remainingStock = product.totalStock;
        }
      }
    }
  }
}

function toPublicProduct(p: ServerProduct, now: number): Product {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    category: p.category,
    price: p.price,
    totalStock: p.totalStock,
    remainingStock: Math.max(0, p.remainingStock),
    dropAt: p.dropAt,
    status: deriveStatus(p.dropAt, p.remainingStock, now),
  };
}

export async function listProducts(): Promise<Product[]> {
  await delay(PRODUCT_LATENCY);
  const world = getWorld();
  const now = Date.now();
  sweepExpiredHolds(world, now);
  for (const p of world.products.values()) simulateProduct(p, now);
  return Array.from(world.products.values())
    .sort((a, b) => a.dropAt - b.dropAt)
    .map((p) => toPublicProduct(p, now));
}

export async function listHolds(): Promise<Hold[]> {
  const world = getWorld();
  const now = Date.now();
  sweepExpiredHolds(world, now);
  return Array.from(world.holds.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export async function createHold(productId: string, qty: number): Promise<Hold> {
  await delay(WRITE_LATENCY);
  const world = getWorld();
  const now = Date.now();
  sweepExpiredHolds(world, now);

  const product = world.products.get(productId);
  if (!product) {
    const err: any = new Error("Product not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  simulateProduct(product, now);
  maybeFail();

  if (product.status === "upcoming" && now < product.dropAt) {
    const err: any = new Error("Drop hasn't started yet");
    err.code = "VALIDATION";
    throw err;
  }
  if (product.remainingStock < qty) {
    const err: any = new Error("Not enough stock left");
    err.code = "OUT_OF_STOCK";
    throw err;
  }

  product.remainingStock -= qty;
  const hold: Hold = {
    id: `hold_${Math.random().toString(36).slice(2, 10)}`,
    productId: product.id,
    productName: product.name,
    qty,
    unitPrice: product.price,
    createdAt: now,
    expiresAt: now + HOLD_DURATION_MS,
    status: "active",
  };
  world.holds.set(hold.id, hold);
  return hold;
}

export async function releaseHold(holdId: string): Promise<Hold> {
  await delay(WRITE_LATENCY);
  const world = getWorld();
  const now = Date.now();
  sweepExpiredHolds(world, now);

  const hold = world.holds.get(holdId);
  if (!hold) {
    const err: any = new Error("Hold not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (hold.status === "active") {
    hold.status = "released";
    const product = world.products.get(hold.productId);
    if (product) {
      product.remainingStock = Math.min(product.totalStock, product.remainingStock + hold.qty);
    }
  }
  return hold;
}

export async function confirmCheckout(holdIds: string[]) {
  await delay(WRITE_LATENCY);
  const world = getWorld();
  const now = Date.now();
  sweepExpiredHolds(world, now);
  maybeFail();

  const holds = holdIds.map((id) => world.holds.get(id)).filter(Boolean) as Hold[];
  const expired = holds.filter((h) => h.status !== "active");
  if (expired.length > 0) {
    const err: any = new Error("Some holds expired before checkout completed");
    err.code = "HOLD_EXPIRED";
    err.expiredIds = expired.map((h) => h.id);
    throw err;
  }
  if (holds.length !== holdIds.length) {
    const err: any = new Error("One or more holds could not be found");
    err.code = "NOT_FOUND";
    throw err;
  }

  for (const h of holds) h.status = "confirmed";
  const items = holds.map((h) => ({
    productId: h.productId,
    productName: h.productName,
    qty: h.qty,
    unitPrice: h.unitPrice,
  }));
  const total = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  return {
    id: `order_${Math.random().toString(36).slice(2, 10)}`,
    items,
    total,
    confirmedAt: now,
  };
}