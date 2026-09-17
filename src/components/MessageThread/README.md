# MessageThread

The right pane: the conversation header, the scrolling list of messages, and the composer.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `conversation` | `Conversation` | The open conversation. |
| `loggedUserId` | `number` | Decides which side each message sits on. |
| `messages` | `UseMessagesResult` | Everything from [`useMessages`](../../hooks/useMessages.ts): items, status, error, and the `send` / `retry` / `discard` / `refetch` actions. |

Passing the whole hook result in keeps the data logic in one place and leaves this component rendering only.

## Rows are derived in one pass

`items` from the hook mixes confirmed messages with pending ones. A single `useMemo` walks them once and works
out, per row: which side it belongs on, whether a day separator is needed, and whether to print the author's
name (only when the speaker changes, so a run of consecutive messages is not labelled repeatedly).

## Scrolling

The thread sticks to the bottom **only when the user is already within 120px of it**. Someone scrolled up
reading history is not yanked back down when a message arrives. Switching conversations always jumps to the
bottom, in a `useLayoutEffect`, so the jump happens before paint rather than as a visible scroll.

## Focus

Opening a conversation moves focus to the thread heading. Without that, focus stays in the list and a screen
reader user gets no signal that the pane beside them changed.

## MessageBubble

Memoised, and receives only primitives — the per-message `retry` / `discard` callbacks are bound in a small
`MessageBubbleRow` wrapper, so the memoised bubble is not handed a new function identity on every render and
its memoisation actually holds.

A bubble has three appearances: confirmed (with a `<time>`), *sending*, and **failed** — which keeps the text on
screen with the reason and two buttons, **Réessayer** and **Supprimer**. A message that fails to send is never
silently dropped.

## MessageComposer

- **Enter sends, Shift+Enter inserts a newline**, and `isComposing` is checked so an IME user picking a
  candidate with Enter is not cut off mid-word.
- **Validation comes from one place** ([`lib/validation/messageInput`](../../lib/validation/messageInput.ts)),
  backing both the disabled state of the send button and the actual submit path, so the two cannot drift.
- **No `maxLength` on the textarea.** Silently truncating what someone pasted is worse than telling them it is
  too long; a counter appears near the limit and the error is wired via `aria-describedby`.
- **The field clears optimistically and keeps focus** after sending, so a conversation can be held entirely
  from the keyboard.
- The textarea grows with its content up to six rows, then scrolls.

## Accessibility

The message list is wrapped in a `role="log"` / `aria-live="polite"` container rather than having the role put
on the `<ul>` itself — `role="log"` *replaces* the list's implicit role, which leaves every `<li>` without a
list parent and breaks how a screen reader counts and navigates messages. The axe suite caught that.

## Files

- `MessageThread.tsx` — header, row derivation, scroll and focus behaviour
- `MessageBubble.tsx` — one memoised message, including the failed state
- `MessageComposer.tsx` — the input, validation and keyboard handling
- `MessageThread.module.css`
