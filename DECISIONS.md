# Decisions

### 1. What exactly happens on screen the moment a hold expires?

Nothing disappears silently. Every held item shows a live countdown bar
(`components/Countdown.tsx`) that drains in real time. In the final 10 seconds
it flips into "panic" state — red hazard bar, a shake, an explicit `⚠ PANIC`
label — so the last moments are the loudest, not the quietest. When the timer
actually hits zero, the item is removed from the holds list on the next poll
(the server has already returned the stock to the pool), and if that item was
mid-checkout, the checkout panel shows a specific message ("One or more holds
expired while you were checking out") rather than a generic failure, and drops
only the expired lines from the order — anything still valid can still be
confirmed.

### 2. Whose clock is the truth — client or the API layer? How do you handle drift?

The server. `expiresAt` and `dropAt` are timestamps minted by the API layer
(`lib/server-store.ts`) and never recomputed by the client. The client keeps
a `clockOffset` (serverNow − Date.now()) refreshed on every poll and every
write, and renders countdowns against `Date.now() + clockOffset` — so between
polls the UI ticks smoothly off the local clock, but it's always corrected
back to the server's version every 2.5s. Expiry itself is enforced server-side
in `sweepExpiredHolds`, which runs at the top of every read and write, so even
if a client's tab is asleep or its clock is wrong, the stock is never wrong.

### 3. Optimistic UI or wait-for-server when placing a hold? Why?

Wait-for-server. A hold is a claim on a shared, contested resource — showing
it as reserved before the server confirms it would lie about scarcity that
another shopper might have just claimed. The "Holding…" button state covers
the round trip (which itself has simulated latency and a 10% failure rate),
and a failed hold surfaces a specific reason (sold out to someone else vs. a
dropped request) instead of silently rolling back an optimistic card. The one
place this project is optimistic is releasing a hold: that only removes stock
from *this* shopper, so it's safe to reflect immediately and reconcile after.

### 4. Zustand vs. Context API — why your pick, for this app specifically?

Zustand. This app's state changes on a timer, not just on user action —
holds tick down every 250ms and the whole grid resyncs every 2.5s. Context
re-renders every consumer on any Provider value change, so a naive
`useState` + Context version would re-render the entire grid every tick just
because one hold's countdown moved. Zustand's selector API
(`useDropDayStore((s) => s.holds)`) lets each component subscribe to only the
slice it needs, so a countdown ticking in the holds panel doesn't re-render
product cards. It also gives a natural home for the imperative bits — polling
intervals, the clock offset, in-flight request state — without threading them
through a reducer.

### 5. What does a user with two open tabs experience?

This is a frontend-only submission with no auth, so the two tabs are two
clients against the same in-memory server world — there's no per-user
isolation. Practically: adding an item to cart in tab A does not appear in
tab B until tab B's next poll (up to 2.5s later), but the *stock number* both
tabs see is always accurate, because that's read fresh from the server on
every poll. If tab A holds the last unit, tab B's next poll will show it sold
out even though tab B never clicked anything — which is the honest behavior
for shared, contested inventory. This was a deliberate choice rather than an
oversight: building per-tab session isolation would have meant inventing a
fake per-user identity system, which felt like solving a problem the brief
didn't ask for at the cost of the one it did (real contention).
