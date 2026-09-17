# ConversationList

The left pane: the header (title, theme toggle, new-conversation button) and the list of conversations, in
whichever of its four states applies.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `conversations` | `Conversation[]` | Already sorted by the hook; this component does not sort. |
| `loggedUserId` | `number` | Used to work out who the other party is in each row. |
| `selectedConversationId` | `number \| null` | Marks the open row. |
| `status` | `'loading' \| 'success' \| 'error'` | Which state to render. |
| `error` | `ApiError \| null` | Shown as a full state, or as a banner when content already exists. |
| `isRefreshing` | `boolean` | Disables the retry button while a refresh is in flight. |
| `onRetry` | `() => void` | Retries the load. |
| `onCreateConversation` | `() => void` | Opens the dialog. |

It is a pure render: every piece of data and every callback is a prop, which is what makes it easy to test in
any state.

## The four states

`loading` renders a skeleton; `error` with nothing on screen renders a full error state; `success` with an
empty array renders an empty state that offers the same "new conversation" action; `success` with an error
present (a failed *refresh*) keeps the list and adds a non-blocking banner above it.

## Navigation is links, not click handlers

Each row is a `next/link` inside a `<ul>` inside a labelled `<nav>`. That is deliberate: real links give
Enter-to-open, tab order, middle-click and "open in new tab", browser history and the focus ring for free.
A `<div onClick>` would mean re-implementing all of it, usually incompletely.

The open row carries `aria-current="true"`, and is also marked by an ember rail and a weight change — never by
colour alone, so it survives colour blindness and greyscale.

## ConversationListItem

Split out and **memoised**, because sending a message reorders the list and every keystroke in the composer
re-renders the tree; rows whose data has not changed should not re-render. It receives only primitives and the
conversation object, so the memoisation actually holds.

Each row shows the partner's nickname (resolved by `getPartner`) and a relative timestamp in a `<time>` element
whose `dateTime` is the ISO value and whose `title` is the absolute date — so "il y a 2 h" stays precise on hover
and machine-readable to assistive tech.

## Files

- `ConversationList.tsx` — states, header, and the list container
- `ConversationListItem.tsx` — a single memoised row
- `ConversationList.module.css`
