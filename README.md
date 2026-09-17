# Messagerie leboncoin

A messaging interface built on the provided Next.js scaffold: a list of conversations, a thread per
conversation, and sending — on desktop and mobile.

The original exercise statement is preserved at the [bottom of this file](#the-original-brief).

---

## Running it

Two processes, two terminals. Node 22.14 (`.nvmrc`).

```bash
npm install

npm run start-server # mock API on http://localhost:3005
npm run dev          # app on http://localhost:3000
```

```bash
npm run verify       # what CI runs: lint -> typecheck -> tests -> build
npm test             # 143 tests, 9 suites
```

To see the error handling, the mock server can be made to fail on purpose (off by default):

```bash
FAILURE_RATE=0.3 npm run start-server   # ~30% of requests answer 503
```

---

## Structure

```
src/
  lib/          api client, validation, date formatting — pure, no React
  hooks/        useAsyncData, useConversations, useMessages, useOnlineStatus
  context/      the shared conversation list
  components/   ConversationList, MessageThread, NewConversationDialog, …
  pages/        index.tsx, conversation/[id].tsx
```

The layering is the point: `lib` is framework-free, `hooks` adapt it to React, components only render.
That is what makes most of the logic testable without a DOM.

**Each component folder has its own `README.md`** — its props, its behaviour and the reasoning behind the
parts that look arbitrary from the outside (for example why the conversation rows are real links, or why the
message composer has no `maxLength`). Start with
[`components/MessagingLayout`](./src/components/MessagingLayout/README.md), which is the shell everything else
renders inside.

---

## The main choices

**Responsiveness is CSS-only.** Both panes always render; one media query at 768px decides whether they sit
side by side or one replaces the other. No viewport detection in JS, so no layout flash on first paint.

**CSS Modules, no framework.** The UI is a list and a thread; a utility framework would have been more bytes
than styles. Design tokens live in `globals.css`.

**No runtime dependency was added.** The additions are dev-only: types and test tooling.

---

## Robustness

> *"As your application can be used by millions of users, make sure to provide some robust safety guards."*

**One choke point for every network call** ([`src/lib/api/client.ts`](./src/lib/api/client.ts)). It only
rejects with a typed `ApiError`, always respects the caller's `AbortSignal`, and never hangs — every attempt
is bounded by a 10s deadline.

**Retries know what is safe to repeat.** Reads retry twice with exponential backoff. Sends never retry
automatically: a request that timed out may already have gone through, and a blind replay would post the
message twice. Retrying a send is an explicit choice offered in the UI instead.

**Stale responses can't win.** Switching conversations quickly fires overlapping requests that may resolve
out of order. Every run is tagged, only the newest may write to state, and the superseded request is aborted.
Four tests cover this, including the out-of-order case.

**Responses are validated at runtime.** Malformed records are dropped rather than thrown on — a list missing
one broken row beats a blank screen. A record is rejected only when the missing field would make it *wrong*:
a message with no author is dropped, because putting it on the wrong side of the thread would attribute
someone else's words to the user; a conversation with a bad timestamp is kept and sorted last, because hiding
a real conversation is worse.

**Input is validated in one place**, backing both the send button's state and the send itself, so the two
cannot drift.

**Error boundaries at two levels** — one per pane, so a crash in the list cannot take the thread with it,
plus one around the app. They only catch render errors, which is why async failures are handled separately in
the data layer.

**Every screen has a loading, empty and error state.** When content is already on screen, a failed refresh
degrades to a banner instead of replacing it with an error page.

---

## The bonuses

**Create a conversation.** A dialog lists the other users and flags anyone already talked to, so selecting
them reopens the existing thread instead of creating a duplicate. Code-split, since most sessions never open it.

**Graceful failure.** Failures are classified (network, timeout, server, offline) and each gets specific,
blame-free copy. A message that fails to send is never discarded: it stays in the thread marked *"Non envoyé"*
with **Réessayer** and **Supprimer**. Going offline shows a banner, and coming back online refreshes by itself.
Messages that failed while offline are re-sent automatically — but only those that provably never reached the
server, so a replay cannot duplicate anything.

---

## Accessibility

Semantic HTML first: the list is a `<ul>` of links in a labelled `<nav>`, so tab order and Enter-to-open come
from the browser rather than hand-written key handlers. Opening a conversation moves focus to the thread
heading; the dialog traps Tab, closes on Escape and restores focus. The thread is a polite live region, Enter
sends and Shift+Enter adds a newline, and the whole app can be used from the keyboard. Contrast is measured,
not assumed, and `prefers-reduced-motion` is respected.

Automated axe checks run over seven states, and they earned their place immediately — they caught that the live
region was overriding the message list's implicit role, breaking how a screen reader counts messages. That was a
bug I had written and would not have found by eye.

---

## Testing

**143 tests, 9 suites**, with coverage thresholds in the Jest config so a regression fails the build.

Unit tests cover validation, formatting and the fetch client; hook tests cover loading and race conditions; an
integration suite drives the real components and hooks with only `fetch` replaced, covering list → open → send
plus both bonuses and the failure paths. Tests assert through the accessibility tree rather than CSS classes, so
they describe what a user can do.

CI was the real gap. The provided workflow ran the tests and nothing else — lint, typecheck and the build were
ungated. It now runs all four, each with `if: !cancelled()` so one push reports every problem at once.

I also verified the app end to end in a real browser: desktop and mobile layouts, back navigation, sending,
persistence, keyboard reachability and recovery from a server error.

