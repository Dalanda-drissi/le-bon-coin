# OfflineBanner

A strip at the top of the app, shown only while the browser reports no connection.

Takes no props: it reads [`useOnlineStatus`](../../hooks/useOnlineStatus.ts) itself and returns `null` when
online, so mounting it unconditionally in the layout costs nothing.

## Why it exists

Losing the connection would otherwise surface as three panes failing at once with three separate error
messages, none of which say the real cause. One banner names it once.

The copy promises what the app actually does — messages that failed with a network error are re-sent
automatically on reconnect — rather than asking the user to retry by hand.

## Accessibility

`role="status"` with `aria-live="polite"`: the change is announced, but it waits for a pause instead of
interrupting someone mid-sentence. The dot is decorative and `aria-hidden`; the state is never carried by
colour alone.

## Files

- `OfflineBanner.tsx`
- `OfflineBanner.module.css`
