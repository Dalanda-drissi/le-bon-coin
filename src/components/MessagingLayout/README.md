# MessagingLayout

The shell both pages render inside: the conversation list on the left, the current page in the detail pane on
the right, plus the offline banner and the new-conversation dialog.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `selectedConversationId` | `number \| null` | Highlights the open row and drives the mobile layout. `null` on the list page. |
| `children` | `ReactNode` | The detail pane — a thread, or the desktop placeholder. |

The conversation list itself is not passed in: it comes from
[`ConversationsContext`](../../context/ConversationsContext.tsx), so it survives navigation between the two
pages instead of refetching on every route change.

## Responsive behaviour is CSS-only

Both panes always render. `data-has-selection` on the shell tells CSS which pane to show below 768px, and one
media query decides between side-by-side and one-at-a-time. There is no viewport detection in JS, so there is
no layout flash on first paint and no resize listener.

## Two error boundaries, not one

Each pane is wrapped separately, so a crash in the list cannot take the open thread with it. The detail pane
passes `resetKey={selectedConversationId}`, so navigating to another conversation clears a caught error
instead of leaving the pane broken for the rest of the session.

## Other details

- **The dialog is code-split** with `next/dynamic` (`ssr: false`), since most sessions never open it. Its
  focus-trap logic and user fetch are not in the initial bundle.
- **Creating a conversation** adds it to the context and navigates to it in one step, so the new thread is
  open before the list has refetched.
- **`useReconnectEffect(refetch)`** refreshes the list when the browser comes back online, rather than leaving
  the user looking at a stale error with a button to press.

## Files

- `MessagingLayout.tsx`
- `MessagingLayout.module.css`
