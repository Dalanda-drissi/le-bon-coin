import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import type { Conversation } from '@/types/conversation'
import type { ThreadItem, UseMessagesResult } from '@/hooks/useMessages'
import { getPartner } from '@/lib/api/conversations'
import { formatAbsolute, formatDaySeparator, startsNewDay } from '@/lib/format/date'
import { useReconnectEffect } from '@/hooks/useOnlineStatus'
import { Avatar } from '@/components/Avatar/Avatar'
import { EmptyState, ErrorBanner, ErrorState, MessageThreadSkeleton } from '@/components/Feedback/Feedback'
import { MessageBubble } from './MessageBubble'
import { MessageComposer } from './MessageComposer'
import styles from './MessageThread.module.css'

interface MessageThreadProps {
  conversation: Conversation
  loggedUserId: number
  messages: UseMessagesResult
}

const STICK_TO_BOTTOM_THRESHOLD_PX = 120

interface RenderedRow {
  item: ThreadItem
  isOwn: boolean
  body: string
  timestamp: number
  authorLabel?: string
  daySeparator?: string
}

export function MessageThread({ conversation, loggedUserId, messages }: MessageThreadProps) {
  const partner = getPartner(conversation, loggedUserId)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const shouldStickToBottomRef = useRef(true)

  const { items, status, error, isRefreshing, refetch, send, retry, discard, retryNetworkFailures } =
    messages

  useReconnectEffect(retryNetworkFailures)

  const rows = useMemo<RenderedRow[]>(() => {
    let previousTimestamp: number | undefined
    let previousAuthorId: number | undefined

    return items.map((item) => {
      const isPending = item.kind === 'pending'
      const authorId = isPending ? item.pending.authorId : item.message.authorId
      const timestamp = isPending ? item.pending.timestamp : item.message.timestamp
      const body = isPending ? item.pending.body : item.message.body

      const needsSeparator = startsNewDay(previousTimestamp, timestamp)
      const speakerChanged = authorId !== previousAuthorId

      previousTimestamp = timestamp
      previousAuthorId = authorId

      const isOwn = authorId === loggedUserId

      return {
        item,
        isOwn,
        body,
        timestamp,
        authorLabel: speakerChanged && !isOwn ? partner.nickname : undefined,
        daySeparator: needsSeparator ? formatDaySeparator(timestamp) : undefined,
      }
    })
  }, [items, loggedUserId, partner.nickname])

  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current
    if (scroller === null) return

    const distanceFromBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
    shouldStickToBottomRef.current = distanceFromBottom <= STICK_TO_BOTTOM_THRESHOLD_PX
  }, [])

  useLayoutEffect(() => {
    shouldStickToBottomRef.current = true
    const scroller = scrollerRef.current
    if (scroller !== null) scroller.scrollTop = scroller.scrollHeight
  }, [conversation.id])

  useLayoutEffect(() => {
    if (!shouldStickToBottomRef.current) return
    const scroller = scrollerRef.current
    if (scroller !== null) scroller.scrollTop = scroller.scrollHeight
  }, [rows.length])
  useEffect(() => {
    headingRef.current?.focus()
  }, [conversation.id])

  const isEmpty = status === 'success' && rows.length === 0

  return (
    <section className={styles.container} aria-label={`Conversation avec ${partner.nickname}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink} aria-label="Retour à la liste des conversations">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z" fill="currentColor" />
          </svg>
        </Link>

        <Avatar nickname={partner.nickname} seed={partner.id} />

        <div className={styles.headerText}>

          <h2 className={styles.headerTitle} ref={headingRef} tabIndex={-1}>
            {partner.nickname} <span className={styles.headerYou}>- Vous</span>
          </h2>
          {conversation.lastMessageTimestamp > 0 && (
            <p className={styles.headerSubtitle}>
              Dernier message le {formatAbsolute(conversation.lastMessageTimestamp)}
            </p>
          )}
        </div>
      </header>

      {error !== null && status === 'success' && (
        <ErrorBanner error={error} onRetry={refetch} isRetrying={isRefreshing} />
      )}

      <div
        className={styles.scroller}
        ref={scrollerRef}
        onScroll={handleScroll}
        tabIndex={0}
        role="group"
        aria-label="Messages"
      >
        {status === 'loading' && <MessageThreadSkeleton />}

        {status === 'error' && <ErrorState error={error} onRetry={refetch} isRetrying={isRefreshing} />}

        {isEmpty && (
          <EmptyState
            title="Aucun message"
            description={`Envoyez le premier message à ${partner.nickname}.`}
          />
        )}

        {rows.length > 0 && (

          <div role="log" aria-live="polite" aria-relevant="additions" className={styles.log}>
            <ul className={styles.list}>
              {rows.map((row) => (
                <MessageBubbleRow
                  key={row.item.key}
                  row={row}
                  onRetry={retry}
                  onDiscard={discard}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      <MessageComposer onSend={send} recipientName={partner.nickname} />
    </section>
  )
}

interface MessageBubbleRowProps {
  row: RenderedRow
  onRetry: (tempId: string) => Promise<void>
  onDiscard: (tempId: string) => void
}

function MessageBubbleRow({ row, onRetry, onDiscard }: MessageBubbleRowProps) {
  const { item } = row
  const tempId = item.kind === 'pending' ? item.pending.tempId : null

  const handleRetry = useCallback(() => {
    if (tempId !== null) void onRetry(tempId)
  }, [onRetry, tempId])

  const handleDiscard = useCallback(() => {
    if (tempId !== null) onDiscard(tempId)
  }, [onDiscard, tempId])

  return (
    <>
      {row.daySeparator !== undefined && row.daySeparator !== '' && (
        <li className={styles.daySeparator} aria-hidden="true">
          <span>{row.daySeparator}</span>
        </li>
      )}

      <MessageBubble
        body={row.body}
        timestamp={row.timestamp}
        isOwn={row.isOwn}
        authorLabel={row.authorLabel}
        pendingStatus={item.kind === 'pending' ? item.pending.status : undefined}
        pendingError={item.kind === 'pending' ? item.pending.error : undefined}
        onRetry={handleRetry}
        onDiscard={handleDiscard}
      />
    </>
  )
}
