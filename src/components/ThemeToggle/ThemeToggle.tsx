import { useCallback, useEffect, useState } from 'react'
import styles from './ThemeToggle.module.css'

type Theme = 'light' | 'dark'

const STORAGE_KEY = 'lbc-theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | undefined>(undefined)

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = window.localStorage.getItem(STORAGE_KEY)
    } catch {
    }

    if (stored === 'light' || stored === 'dark') {
      setTheme(stored)
      document.documentElement.dataset.theme = stored
      return
    }

    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches

    setTheme(prefersDark ? 'dark' : 'light')
  }, [])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {
      }
      return next
    })
  }, [])

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
      aria-pressed={isDark}
      disabled={theme === undefined}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb}>
          {isDark ? (
            <svg viewBox="0 0 24 24" width="15" height="15" focusable="false">
              <path
                d="M12.3 3a1 1 0 0 0-1.1 1.4 7 7 0 0 0 8.4 9.4 1 1 0 0 1 1.2 1.4A9 9 0 1 1 12.3 3Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="15" height="15" focusable="false">

              <circle cx="12" cy="12" r="4.4" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="2.5" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="21.5" />
                <line x1="2.5" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="21.5" y2="12" />
              </g>
            </svg>
          )}
        </span>
      </span>
    </button>
  )
}
