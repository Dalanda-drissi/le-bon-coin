# ErrorBoundary

Catches a render error in a subtree and shows a recoverable message instead of letting it unmount the whole
app. A class component, because React has no hook equivalent.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `children` | `ReactNode` | The protected subtree. |
| `fallback` | `(error, reset) => ReactNode` | Optional custom UI. Defaults to a message with a **Réessayer** button. |
| `resetKey` | `string \| number` | When this changes, a caught error is cleared automatically. |
| `onError` | `(error, info) => void` | Optional hook for reporting. |

## Where it is used

Two levels, in [`MessagingLayout`](../MessagingLayout/README.md):

- **One per pane**, so a crash in the conversation list cannot take the open thread down with it.
- **One around the app**, as the last line of defence.

## Why `resetKey`

Without it, a pane that caught an error stays broken for the rest of the session — the error state has no
reason to clear, even after the user navigates somewhere else. The detail pane passes the selected
conversation id, so opening a different conversation gives the pane a clean render.

## What it does not do

Error boundaries only catch errors thrown **during render**. A failed fetch rejects a promise and never
reaches them, which is why async failures are handled explicitly in the data layer and the two mechanisms
both exist.

## Files

- `ErrorBoundary.tsx`
- `ErrorBoundary.module.css`
- `__tests__/ErrorBoundary.spec.tsx` — asserts a failing subtree is contained and recoverable
