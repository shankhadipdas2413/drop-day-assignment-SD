# Drop Day

A flash-sale storefront for limited-stock product drops — timed releases,
60-second holds, contested stock, and honest failure states.

## Setup

```
pnpm install
pnpm dev
```

Open http://localhost:3000. No env vars, no database, no auth.

## Architecture tour

**One API boundary, everything behind it.** Every component talks to data
through `lib/api-client.ts` — nothing else calls `fetch()`. Behind that
boundary are real Next.js Route Handlers (`app/api/products`,
`app/api/holds`, `app/api/holds/[id]`, `app/api/checkout`), which in turn
call `lib/server-store.ts`, the in-memory "backend." Swapping the mock for a
real server means changing what's behind `api-client.ts` and touching
nothing that imports it.

**The mock is a simulation, not a sleep()**. `lib/server-store.ts` models:
- **Latency** — every call has a randomized delay.
- **Failures** — writes fail ~10% of the time, on purpose.
- **Other shoppers** — stock decays as a deterministic function of *elapsed
  server time* (not a background `setInterval`), so it behaves the same
  whether you're polling every second or came back after a minute — and it
  survives serverless environments where nothing runs between requests.
- **Hold expiry** — enforced in `sweepExpiredHolds`, which runs at the top of
  every read and write. The UI never decides a hold is expired; it only
  finds out.

**State**: `lib/store.ts` is a single Zustand store. It polls
`/api/products` and `/api/holds` every 2.5s (correcting for clock drift each
time) and runs a 250ms tick so countdowns animate smoothly between polls. See
`DECISIONS.md` for why Zustand over Context here specifically.

**Wildcard: Panic Mode.** The final 10 seconds of any hold flip into a
distinct visual state (`components/Countdown.tsx`) — hazard-red drain bar,
a subtle shake, an explicit label — so the highest-stakes moment of the app
is also the most legible one, not a number quietly ticking to zero.

## What's not here (by design, per the brief's timebox)

No auth, no payments, no real database, no exhaustive test suite. The
in-memory store resets on server restart — if this is deployed to Vercel,
each cold serverless instance gets its own fresh catalog.

## File map

```
app/
  page.tsx                 storefront shell (grid + holds panel + checkout modal)
  api/products/route.ts    GET all products
  api/holds/route.ts       GET active holds, POST a new hold
  api/holds/[id]/route.ts  DELETE (release) a hold
  api/checkout/route.ts    POST confirm an order
lib/
  types.ts                 shared Product / Hold / Order types
  server-store.ts          the mock backend: latency, failures, contention, expiry
  api-client.ts             the ONE module that calls fetch()
  store.ts                 Zustand client store: polling, clock offset, actions
components/
  DropGrid.tsx             loading / error / empty / loaded states
  ProductCard.tsx          live / dropping-soon / sold-out card + qty stepper
  HoldsPanel.tsx           sidebar cart with per-item countdowns
  CheckoutPanel.tsx        summary → confirm → success/failure modal
  Countdown.tsx            shared countdown bar + panic-mode state
```
