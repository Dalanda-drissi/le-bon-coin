# Messagerie leboncoin — technical test write-up

The original exercise statement is preserved in [`README.md`](./README.md). This document covers
what I built, the decisions behind it, and what I would do next.

---

## Running it

Two processes, two terminals. Node 22.14 (`.nvmrc`), and `engine-strict=true` is set in `.npmrc`.

```bash
nvm use              # or any Node >= 18
npm install

npm run start-server # mock API on http://localhost:3005
npm run dev          # app on http://localhost:3000
```

```bash
npm run verify       # everything CI runs: lint -> typecheck -> tests -> build
npm test             # 143 tests, 9 suites (with coverage thresholds)
npm run lint         # eslint via next lint
npm run typecheck    # tsc --noEmit, strict
npm run build        # production build
```

The API base URL falls back to `http://localhost:3005` and can be overridden with
`NEXT_PUBLIC_API_URL`.

**To see the error handling**, the mock server can be made to fail on purpose. This is off by
default, so the provided behaviour is unchanged:

```bash
FAILURE_RATE=0.3 npm run start-server   # ~30% of requests answer 503
```

---

## What I found in the API

I probed the running server rather than coding against the swagger alone, and the two disagree in
four places. Each one changed the implementation, so they are worth stating up front.

**1. `POST /messages/:id` silently orphans messages.** The swagger documents the request body as
`{ body, timestamp }`. Sending exactly that is accepted with a `201`:

```
POST /messages/1  {"body":"hello","timestamp":1700000000}
→ 201 {"body":"hello","timestamp":1700000000,"id":5}
```

But json-server persists the body verbatim, so the stored row has no `conversationId` and no
`authorId`. `GET /messages/1` filters on `conversationId`, so the message is never seen again — it
is written and lost. The client therefore sends the full record
([`src/lib/api/messages.ts`](./src/lib/api/messages.ts)), and a test asserts it
(`sends conversationId and authorId, without which the server orphans the message`).

The same applies to `POST /conversations/:userId`: posting only `{ recipientId }` as documented
writes a conversation with no sender and no nicknames, which can never appear in any list.

**2. `GET /conversations/:userId` serves a snapshot frozen at server start.** The provided
middleware does `require('../db.json')` at module load, so its view of the data never updates.
Conversations created afterwards *are* written to disk but do not come back from the list endpoint
until the server is restarted.

This directly affects Bonus 1: create a conversation, refetch, and it is not there. Rather than let
that look like a bug in the app, conversations created during a session are held client-side and
merged into every result, with the server copy winning on conflict
([`src/hooks/useConversations.ts`](./src/hooks/useConversations.ts)). Once the middleware is fixed —
or a real backend replaces it — that merge quietly becomes a no-op rather than shadowing real data.

**3. `GET /user/:id` returns an array**, not the `User` object the swagger promises, because
`routes.json` rewrites it to a query filter. `parseSingle` accepts either shape.

**4. Empty results are `200 []`, not the documented `404`.** So "no conversations" is an empty
state, not an error — an important distinction for what the user is shown.

Two smaller notes: `Message.timestamp` is typed as `string` in the swagger but is a Unix-seconds
number in practice (both are accepted); and `DELETE /conversation/:id` and `DELETE /message/:id`
both return `404` against the running server, since the route rewrites to a query filter that
json-server will not delete through. Nothing in the exercise needs deletion, so I left those alone.

---

## Architecture

```
src/
  lib/
    api/          client.ts (fetch, retry, timeout), errors.ts, conversations.ts, messages.ts, users.ts
    validation/   parse.ts (runtime shape guards), messageInput.ts (composer rules)
    format/       date.ts
  hooks/          useAsyncData.ts, useConversations.ts, useMessages.ts, useOnlineStatus.ts
  context/        ConversationsContext.tsx
  components/     ConversationList/ MessageThread/ NewConversationDialog/
                  MessagingLayout/ ErrorBoundary/ Feedback/ Avatar/
                  OfflineBanner/ ThemeToggle/
  pages/          index.tsx, conversation/[id].tsx
```

The layering is deliberate: `lib` is pure and framework-free, `hooks` adapt it to React, and
components only ever render. That is what makes most of the logic testable without a DOM.

**Routing — real URLs, not local state.** `/` is the list, `/conversation/[id]` is a thread. The
alternative (one page, selection in `useState`) is less code but gives up the back button, deep
links, "open in new tab", and the browser's own focus and history handling. For a list-detail app
those are not extras.

**State — no state-management dependency.** There is exactly one piece of shared state, the
conversation list, and it lives in a context mounted in `_app` so it survives navigation instead of
refetching on every route change. Message state stays local to the open thread. TanStack Query is
what I would reach for in production — it gives caching, deduplication and background refetching for
free — but for two endpoints it is not worth the bundle, and writing `useAsyncData` myself made the
race-condition handling explicit rather than implicit. Flagged as a trade-off, not a preference.

**Styling — CSS Modules**, already wired into the Jest config via `identity-obj-proxy`. Design
tokens in `globals.css`. No CSS framework: the UI is a list and a thread, and a utility framework
would have been more bytes than styles.

**Responsiveness is CSS-only.** Both panes always render; a single media query at 768px decides
whether they sit side by side or one replaces the other. No viewport detection in JS, so there is no
layout flash on first paint and no resize listener.

**Dependencies added:** `@types/jest`, `@testing-library/user-event`, `jest-axe` and
`@types/jest-axe` — all dev-only, all types or tests. The one production addition is
`next/font`, which ships with Next. **No runtime dependency was added.**

---

## Design

The brief invited creativity, so the UI is a deliberate visual system rather than default styling.
It is called **Braise** (ember): paper-toned surfaces, depth from layered light rather than hard
borders, and a leboncoin-derived ember accent.

**The signature decision is the message bubble.** Vivid leboncoin orange with white text is a
non-starter — it measures **3.08:1**, well under the 4.5:1 AA floor. The usual escape is to darken
the orange until white works (`#c2410c`, 5.18:1), but that trades away exactly the vividness that
makes it feel like leboncoin. Inverting the problem instead — keeping the *vivid* gradient
`#ff9a2e → #ff6b1a` and putting near-black ink on it — measures **6.14:1 at the worst point along
the ramp**. More vivid *and* more legible than the safe option.

That "worst point along the ramp" matters: a gradient has to pass at every stop, not just its
endpoints, so each one is sampled across its length. The same check applies to the eight avatar
gradients, whose lightest points all clear 5.4:1 against the white initial.

Everything else follows from that: **squircle avatars** with per-identity gradients and an inner
highlight; **floating panes** on a slow aurora ground instead of edge-to-edge panels; **frosted
headers and composer** so scrolled content dissolves under them; **skeletons** rather than spinners
where the shape of the incoming content is known, so nothing jumps when data lands; and a
**springy entrance** on each message, so sending feels like placing something down.

**Full dark theme**, following the system preference by default, with a toggle that only pins an
explicit choice once the user makes one — someone who never touches it still follows their OS at
sunset. Both themes are contrast-checked independently.

Two restraints worth naming. The aurora **drifts over 32s rather than animating visibly**: it sits
behind text people are reading, and a permanently moving backdrop is a permanent distraction.
And selection is **never signalled by colour alone** — the ember rail, a tinted surface and a
weight change all carry it, so it survives colour blindness and greyscale.

Typography is Plus Jakarta Sans via `next/font`, self-hosted at build time, so there is no
render-blocking request to Google and no layout shift when the face swaps in.

---

## Robustness

> *"As your application can be used by millions of users, make sure to provide some robust safety guards."*

**Every network call goes through one choke point** ([`lib/api/client.ts`](./src/lib/api/client.ts))
that guarantees three things: it only ever rejects with a typed `ApiError`, never a raw fetch
rejection; it always respects the caller's `AbortSignal`, including mid-backoff; and it never hangs,
because every attempt is bounded by a 10s deadline.

**Retries are idempotency-aware.** GETs retry twice with exponential backoff and jitter. POSTs do
not retry at all — a POST that timed out may already have committed server-side, and a blind replay
would send the user's message twice. Retrying a send is instead an explicit choice offered in the
UI. Retry is also skipped for 4xx, which will fail identically however many times it is repeated,
and the error UI does not offer a retry button in that case.

**Race conditions are handled at the source.** Switching conversations quickly fires overlapping
requests that can resolve out of order. In `useAsyncData` every run is tagged with a monotonic id and
only the newest tag may write to state, so a slow response for conversation A can never overwrite
conversation B's messages. The superseded request is aborted rather than left running. There are
four tests covering exactly this, including the out-of-order resolution case.

**API responses are never trusted.** Every payload passes through a parser that drops malformed
records instead of throwing — a list missing one broken row beats a blank screen. Records are
rejected only when a missing field would make them *wrong* rather than merely incomplete: a message
with no `authorId` is dropped, because rendering it on the wrong side of the thread would attribute
someone else's words to the user; a conversation with an unusable timestamp is kept and sorted last,
because hiding a real conversation is worse.

**Input is validated in one place.** `validateMessageBody` backs both the send button's disabled
state and the actual send path, so the two cannot drift. It rejects empty and whitespace-only input,
caps length at 2000 characters, normalises CRLF, collapses runs of blank lines, and strips C0/C1
control characters. There is deliberately no `maxLength` on the textarea: silently truncating what
someone pasted is worse than telling them it is too long.

**Error boundaries at two levels.** One per pane inside the layout, so a crash in the list cannot
take the open thread with it, plus one around the whole app. The pane-level boundary takes a
`resetKey` so navigating elsewhere clears a caught error instead of leaving the pane permanently
broken. Note that error boundaries only catch render errors — async failures are handled explicitly
in the data layer, which is why both exist.

**Every call has an explicit loading, empty and error state.** Where content is already on screen, a
failed *refresh* degrades to a non-blocking banner rather than replacing the list with an error page.

---

## Bonuses

**Bonus 1 — create a conversation.** A dialog lists the other users, skipping the logged user, and
flags anyone already talked to so selecting them reopens the existing thread instead of creating a
duplicate. It posts the full conversation record (see API finding #1) and works around the stale
list endpoint (finding #2). Code-split with `next/dynamic`, since most sessions never open it.

**Bonus 2 — graceful failure.** `ApiError` classifies failures as network / timeout / http / parse /
aborted, and each maps to specific, blame-free copy — a 5xx reads *"Nos serveurs rencontrent un
problème. Ce n'est pas vous, c'est nous."* Retry is offered where retrying could actually help. A
message that fails to send is never discarded: it stays in the thread marked "Non envoyé", with
**Réessayer** and **Supprimer**.

**Offline is treated as its own state**, not as three panes failing at once. A banner appears when
the browser goes offline, and coming back online refreshes the conversation list by itself rather
than leaving the user looking at a stale error with a button to press.

Messages that failed while offline are **re-sent automatically on reconnect — but only those that
failed with a `network` error**, where the request provably never reached the server and a replay
cannot duplicate anything. A timeout or a 5xx may have committed server-side before the connection
broke, so those stay on manual retry, where the user is choosing to take that risk.

Since this repo's mock server never actually fails, I added the opt-in `FAILURE_RATE` flag described
above so the behaviour is demonstrable rather than merely asserted in tests.

---

## Performance

First load JS is **104 kB** for `/` and **108 kB** for a conversation, of which 98.9 kB is the React
and Next framework — the app's own code is 3–6.75 kB.

- The new-conversation dialog, its user fetch and its focus-trap logic are lazy-loaded via
  `next/dynamic`.
- **Messages are cached per conversation for the session**, so switching back to a thread you have
  already opened renders instantly from cache while a refresh runs behind it — no spinner flashed
  over content we already have. Fresh data always wins; the cache only fills the gap.
- `MessageBubble`, `ConversationListItem` and `Avatar` are memoised. This matters because every
  keystroke in the composer re-renders the thread, and sending a message reorders the list; neither
  should re-render every row. The per-message callbacks are bound in a small wrapper component so
  the memoised bubble only ever receives primitives and its memoisation actually holds.
- `Intl.DateTimeFormat` instances are constructed once per module rather than per render.
  Constructing them is expensive and they are stateless.
- Scroll containers use `overscroll-behavior: contain`, and the thread only auto-scrolls when the
  user is already within 120px of the bottom — reading history is never interrupted by an arriving
  message.

---

## Accessibility

- **Semantic HTML first.** The conversation list is a `<ul>` of `<a>` elements inside a labelled
  `<nav>`, so tab order, Enter-to-open and focus handling come from the browser rather than from
  re-implemented `onKeyDown` handlers. The open conversation is marked `aria-current="true"`.
- **Focus management.** Opening a conversation moves focus to the thread heading — without it,
  focus stays in the list and a screen reader user gets no signal that the pane beside them changed.
  The dialog traps Tab, closes on Escape, and restores focus to the button that opened it.
- **Live regions.** The message list is `role="log"` / `aria-live="polite"` so incoming messages are
  announced without interrupting.
- **Keyboard sending.** Enter sends, Shift+Enter inserts a newline, and `isComposing` is checked so
  IME users are not cut off mid-candidate. Focus stays in the composer after sending, so a
  conversation can be held entirely from the keyboard.
- **Contrast is verified, not assumed.** I measured the palette against WCAG 2.1 AA. The leboncoin
  brand orange `#ec6e24` only reaches **3.08:1** against white, so it is used decoratively only;
  anything carrying text uses `#c2410c` at **5.18:1**. Avatar colours are all ≥ 5.4:1.
- Decorative avatars and icons are `aria-hidden`; icon-only buttons carry `aria-label`. The
  composer's error and character counter are wired via `aria-describedby`, and
  `prefers-reduced-motion` is respected (every animation is decoration, never the only signal that
  something changed, so disabling it costs nothing). The viewport meta sets no `maximum-scale`, so
  zoom is never blocked.
- **Automated axe checks across seven states** (list, loading, thread, empty, error, dialog, failed
  send). These earned their place immediately: axe caught that `role="log"` on the message `<ul>`
  **overrides the list's implicit role**, leaving every `<li>` without a list parent and breaking how
  a screen reader counts and navigates messages. The live region now wraps the list instead of
  replacing its role. It also caught the dialog's `<header>` creating a second `banner` landmark
  colliding with the app header. Both were bugs I had written and would not have found by eye.

---

## Testing

**143 tests across 9 suites**, with coverage thresholds wired into the Jest config so a regression
fails the build rather than going unnoticed (currently 88% statements / 91% lines; the branch
threshold sits lower by design, since much of the uncovered branching is defensive fallbacks that
only fire on malformed API payloads).

Unit tests cover the parsers, input validation, date formatting and the fetch client (retry policy,
timeout, abort classification, error taxonomy). Hook tests cover `useAsyncData`, with four dedicated
to race conditions. An `ErrorBoundary` suite asserts that a failing subtree is contained and
recoverable. A dedicated axe suite covers accessibility.

The integration suite (`src/__tests__/messaging.integration.spec.tsx`) drives the real components,
hooks and API layer with only `fetch` replaced, covering the full journey — list → open → send —
plus validation, both bonuses, and the failure paths. The mock server reproduces the *real* server's
quirks rather than the swagger's promises, so a regression on any of the four findings above fails a
test.

Tests assert behaviour through the accessibility tree (`getByRole`, `getByLabelText`) rather than
CSS classes, so they document what a user can actually do.

**CI was the real gap, and it is now closed.** The provided workflow ran `npm test` and nothing
else — lint, typecheck and the production build were all ungated, which is a thin basis for
"confident enough about the upcoming automatic deployment". It now runs lint, typecheck, tests with
coverage, and a production build, each with `if: !cancelled()` so one push reports every problem at
once instead of revealing them one re-run at a time. `npm run verify` runs the identical chain
locally.

**I also verified the app end to end in a real browser** (Playwright, against the actual json-server
mock): 23 checks covering desktop master-detail, mobile single-pane and back navigation, sending via
Enter, server-side persistence of the sent message, keyboard reachability, no horizontal overflow at
390px, and recovery from an injected 503. All passed, with no uncaught page errors. That script was
a verification tool rather than a deliverable, so it lives outside the repo — the committed test
suite is the Jest one.

---

## Trade-offs

- **No TanStack Query.** Right call for two endpoints; wrong call the moment a third screen needs
  the same data. Caching, deduplication and background refetch are all things I implemented narrowly
  or not at all.
- **No message virtualisation.** The threads here are three messages long. A real inbox needs
  windowing and paginated history; the memoisation is in place, but the list renders in full.
- **No polling or websocket.** Incoming messages only appear on refetch. Real-time was out of scope
  for the time budget, and the mock has no push channel.
- **The logged user stays hardcoded** to id 1 via the provided `getLoggedUserId`, as the scaffold
  intends. Real auth is out of scope, but the id is threaded through as a parameter rather than read
  from a global, so swapping in a real session is a one-file change.
- **Locally-merged conversations are a workaround for a server bug**, and I would rather fix the
  middleware. I left the provided server semantics untouched (beyond the opt-in failure flag) on the
  basis that the exercise is about the frontend.
- **French UI copy, English code.** The app has `i18n: { locales: ['fr'] }` configured, so strings
  are inline rather than extracted. A second locale would need a proper i18n layer.
- **`tsconfig` target is `es5`**, which is why the code uses `Array.from` over string spread in one
  place. I left it as provided rather than modernising config that was not mine to change.
- **The design uses `backdrop-filter`**, which is well supported but costs a compositing layer. The
  frosted surfaces degrade to solid colour where it is unsupported — they are translucent, not
  transparent — so nothing becomes unreadable.
- **No avatar photography or presence indicators.** The API has neither, and inventing an "online"
  dot that reflects nothing real would be a lie told in pixels.

## With more time

1. **Real-time updates** — websocket, or polling with a visibility check, so a reply arrives without
   a refetch.
2. **Virtualised message list and paginated history**, which is the first thing to break at scale.
3. **Optimistic send queue that survives reload** — persist unsent messages so closing the tab mid-send
   does not lose them.
4. **TanStack Query**, once a third consumer of the same data exists.
5. **Commit the Playwright flows as a real E2E suite** running against the mock in CI. The axe
   checks are already in the Jest suite; the browser-level ones are not yet.
6. **Fix the mock server's middleware** so the list endpoint reads live data, which would let the
   client-side merge be deleted.
7. **Visual regression testing** (Playwright screenshots in CI), which is what the design system
   above really needs now that there are two themes to keep from drifting apart.
