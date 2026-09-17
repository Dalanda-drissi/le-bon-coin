# ThemeToggle

The light/dark switch in the conversation list header. Takes no props and owns its own state.

## How the theme resolves

1. On mount, a stored choice in `localStorage` (`lbc-theme`) wins and is written to
   `document.documentElement.dataset.theme`, which the CSS variables in `globals.css` key off.
2. With nothing stored, the button reflects `prefers-color-scheme` **without** writing the attribute — the
   stylesheet already follows the system preference, so there is nothing to override.
3. Clicking pins an explicit choice and stores it.

That order is the point: someone who never touches the toggle keeps following their OS, including when it
switches at sunset. Only an explicit click opts out of that.

## Details worth knowing

- **`localStorage` is wrapped in `try/catch`.** It throws in Safari private mode and when site data is
  blocked; a theme preference is not worth crashing the header over.
- **The button is disabled until the effect runs.** The server cannot know the user's preference, so state
  starts `undefined`; rendering an enabled toggle in the wrong position and flipping it after hydration
  would be worse than a brief disabled one.
- **`aria-pressed` and a label that names the action** (*"Activer le thème sombre"*), so the control makes
  sense to a screen reader without the icon.

## Files

- `ThemeToggle.tsx`
- `ThemeToggle.module.css`
