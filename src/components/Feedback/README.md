# Feedback

The shared loading, empty and error states. One module rather than one component per state, because they are
small, always used together, and sharing a stylesheet keeps them visually consistent.

## Exports

| Component | Used for |
| --- | --- |
| `LoadingState` | A labelled spinner, where the shape of the incoming content is unknown (the dialog's user list). |
| `ConversationListSkeleton` | Six placeholder rows while conversations load. |
| `MessageThreadSkeleton` | Four placeholder bubbles, alternating sides, while a thread loads. |
| `EmptyState` | A title, an optional description and an optional action. |
| `ErrorState` | A full-pane failure, with a retry button when retrying can help. |
| `ErrorBanner` | A non-blocking strip for a failure that happened while content is already on screen. |

## The choices behind them

**Skeletons over spinners where the shape is known.** A skeleton reserves the space the real content will
occupy, so nothing jumps when data lands. A spinner is used only where the result's shape is unpredictable.

**`ErrorState` vs `ErrorBanner` is about what is already on screen.** A first load that fails has nothing to
show, so it gets the full state. A *refresh* that fails still has valid content behind it — replacing that
with an error page would destroy something the user was reading, so it degrades to a banner instead.

**Retry is offered only when it could work.** `ErrorState` hides the button for a non-retryable `ApiError`
(4xx), which will fail identically however many times it is pressed. Offering a button that cannot help is
worse than not offering one.

**The copy comes from `toUserMessage`** in [`lib/api/errors`](../../lib/api/errors.ts), so the same failure
reads the same way everywhere, and the wording stays blame-free — a 5xx says the servers are at fault, not
the user.

## Accessibility

Loading states are `role="status"` / `aria-live="polite"` and carry a `visually-hidden` label, so a screen
reader hears *"Chargement des conversations…"* rather than nothing while the decorative shimmer rows are
`aria-hidden`. Error states are `role="alert"`, which is announced immediately.

## Files

- `Feedback.tsx`
- `Feedback.module.css` — includes the shimmer animation, which respects `prefers-reduced-motion`
