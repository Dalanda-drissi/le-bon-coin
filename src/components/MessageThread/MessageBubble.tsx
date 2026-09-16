import { memo } from 'react'
import { formatAbsolute, formatMessageTime, toIsoString } from '@/lib/format/date'
import { toUserMessage } from '@/lib/api/errors'
import styles from './MessageThread.module.css'

interface MessageBubbleProps {
  body: string
  timestamp: number
  isOwn: boolean
  authorLabel?: string
  pendingStatus?: 'sending' | 'failed'
  pendingError?: unknown
  onRetry?: () => void
  onDiscard?: () => void
}

export const MessageBubble = memo(function MessageBubble({
  body,
  timestamp,
  isOwn,
  authorLabel,
  pendingStatus,
  pendingError,
  onRetry,
  onDiscard,
}: MessageBubbleProps) {
  const time = formatMessageTime(timestamp)
  const hasFailed = pendingStatus === 'failed'

  return (
    <li className={`${styles.row} ${isOwn ? styles.rowOwn : styles.rowTheirs}`}>
      {authorLabel !== undefined && <span className={styles.author}>{authorLabel}</span>}

      <div
        className={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleTheirs,
          pendingStatus === 'sending' ? styles.bubbleSending : '',
          hasFailed ? styles.bubbleFailed : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >

        <p className={styles.text}>{body}</p>

        <span className={styles.meta}>
          {pendingStatus === 'sending' && <span className={styles.status}>Envoi…</span>}
          {hasFailed && <span className={styles.status}>Non envoyé</span>}
          {pendingStatus === undefined && time !== '' && (
            <time className={styles.time} dateTime={toIsoString(timestamp)} title={formatAbsolute(timestamp)}>
              {time}
            </time>
          )}
        </span>
      </div>

      {hasFailed && (
        <div className={styles.failure} role="alert">
          <span className={styles.failureText}>{toUserMessage(pendingError)}</span>
          <span className={styles.failureActions}>
            <button type="button" className={styles.failureButton} onClick={onRetry}>
              Réessayer
            </button>
            <button type="button" className={styles.failureButton} onClick={onDiscard}>
              Supprimer
            </button>
          </span>
        </div>
      )}
    </li>
  )
})
