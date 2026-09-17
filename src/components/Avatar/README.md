# Avatar

The circular initial shown next to a conversation, a message author and a user in the new-conversation
dialog. Purely presentational — no data fetching, no state.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `nickname` | `string` | The displayed name. Only its first character is rendered. |
| `seed` | `number` | Picks the colour. The user id is passed, so a person keeps the same colour everywhere. |

## Behaviour

- **The colour is derived, not stored.** `seed % 8` indexes a fixed gradient list, so the same user is
  always the same colour across the list, the thread header and the dialog, with no colour field in the API.
- **The initial falls back to `?`** when the nickname is empty or whitespace, so the shape never collapses.
  `Array.from` is used rather than `nickname[0]` so an emoji or accented character is not split mid-codepoint.
- **`aria-hidden="true"`.** The avatar repeats the nickname that is already next to it in text; announcing
  the letter again would just be noise for a screen reader.
- **Memoised.** It renders once per row in the list and once per message row; without `memo` every keystroke
  in the composer would re-render all of them.

## Contrast

The eight gradients were checked against the white initial: the lightest point of each clears 5.4:1, above
the 4.5:1 AA floor. Both ends of a gradient have to pass, not just the average.

## Files

- `Avatar.tsx` — the component and the gradient table
- `Avatar.module.css` — the squircle shape and inner highlight
