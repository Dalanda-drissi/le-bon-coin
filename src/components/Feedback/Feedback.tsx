import type { ReactNode } from 'react'
import { ApiError, toUserMessage } from '@/lib/api/errors'
import styles from './Feedback.module.css'

interface LoadingStateProps {
  label: string
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div className={styles.container} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.muted}>{label}</span>
    </div>
  )
}

export function ConversationListSkeleton() {
  return (
    <div className={styles.skeletonList} role="status" aria-live="polite">
      <span className="visually-hidden">Chargement des conversations…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className={styles.skeletonRow}
          style={{ animationDelay: `${index * 70}ms` }}
          aria-hidden="true"
        >
          <span className={`${styles.shimmer} ${styles.skeletonAvatar}`} />
          <span className={styles.skeletonText}>
            <span className={`${styles.shimmer} ${styles.skeletonLineWide}`} />
            <span className={`${styles.shimmer} ${styles.skeletonLineNarrow}`} />
          </span>
        </div>
      ))}
    </div>
  )
}

export function MessageThreadSkeleton() {
  const widths = [62, 48, 74, 40]

  return (
    <div className={styles.skeletonThread} role="status" aria-live="polite">
      <span className="visually-hidden">Chargement des messages…</span>
      {widths.map((width, index) => (
        <span
          key={index}
          className={`${styles.shimmer} ${styles.skeletonBubble} ${
            index % 2 === 0 ? styles.skeletonBubbleOwn : ''
          }`}
          style={{ width: `${width}%`, animationDelay: `${index * 90}ms` }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <p className={styles.title}>{title}</p>
      {description !== undefined && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  )
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  isRetrying?: boolean
}

export function ErrorState({ error, onRetry, isRetrying = false }: ErrorStateProps) {
  const canRetry = onRetry !== undefined && (!(error instanceof ApiError) || error.retryable)

  return (
    <div className={styles.container} role="alert">
      <span className={styles.errorGlyph} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" focusable="false">
          <path
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1Zm0 11.5a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"
            fill="currentColor"
          />
        </svg>
      </span>
      <p className={styles.title}>{toUserMessage(error)}</p>
      {canRetry && (
        <button type="button" className={styles.retry} onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? 'Nouvelle tentative…' : 'Réessayer'}
        </button>
      )}
    </div>
  )
}

interface ErrorBannerProps {
  error: unknown
  onRetry?: () => void
  isRetrying?: boolean
}

export function ErrorBanner({ error, onRetry, isRetrying = false }: ErrorBannerProps) {
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.bannerText}>{toUserMessage(error)}</span>
      {onRetry !== undefined && (
        <button
          type="button"
          className={styles.bannerRetry}
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? '…' : 'Réessayer'}
        </button>
      )}
    </div>
  )
}
