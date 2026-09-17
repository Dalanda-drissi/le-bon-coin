# NewConversationDialog

The modal for starting a conversation (Bonus 1). It lists the other users and creates a conversation with the
one selected.

Loaded with `next/dynamic` from [`MessagingLayout`](../MessagingLayout/README.md), so neither it, its user
fetch nor its focus-trap logic are in the initial bundle — most sessions never open it.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `loggedUserId` | `number` | Filtered out of the list, and sent as the sender. |
| `conversations` | `Conversation[]` | Used to detect who the user already talks to. |
| `onClose` | `() => void` | Closes without creating. |
| `onCreated` | `(conversation) => void` | Called with the new *or existing* conversation. |

## Duplicates are prevented, not created

Users who already have a conversation are marked *"Conversation existante"*, and selecting one calls
`onCreated` with the conversation that already exists instead of posting a new one. The lookup is a `Map` built
once per render with `useMemo`, so the list stays O(1) per row.

This matters because nothing server-side stops two conversations existing between the same pair — the guard has
to be here.

## Focus and keyboard

A modal that does not manage focus is unusable with a keyboard or a screen reader, so:

- focus moves into the dialog on open, and **returns to the button that opened it** on close;
- **Tab is trapped**, cycling within the dialog rather than wandering into the page behind it;
- **Escape closes**, and the listener uses the capture phase so it wins over anything below;
- clicking the overlay closes, but only on a `mousedown` that started on the overlay itself — otherwise a drag
  that ends outside the dialog would close it and lose the selection.

It is a `role="dialog"` with `aria-modal="true"` and is labelled by its title.

## Failure handling

The user list has its own loading, error (with retry) and empty states. A failed creation shows the reason in a
`role="alert"` and leaves the dialog open with the selection intact, rather than closing and losing the user's
place. Aborts are ignored rather than reported — they are not failures.

While a creation is in flight, every row is disabled, so an impatient double-click cannot create two
conversations.

## Files

- `NewConversationDialog.tsx`
- `NewConversationDialog.module.css`
