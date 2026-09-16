import { memo } from 'react'
import Link from 'next/link'
import type { Conversation } from '@/types/conversation'
import { getPartner } from '@/lib/api/conversations'
import { formatAbsolute, formatConversationTimestamp, toIsoString } from '@/lib/format/date'
import { Avatar } from '@/components/Avatar/Avatar'
import styles from './ConversationList.module.css'

interface ConversationListItemProps {
  conversation: Conversation
  loggedUserId: number
  isSelected: boolean
  index: number
}

export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  loggedUserId,
  isSelected,
  index,
}: ConversationListItemProps) {
  const partner = getPartner(conversation, loggedUserId)
  const relativeDate = formatConversationTimestamp(conversation.lastMessageTimestamp)
  const isoDate = toIsoString(conversation.lastMessageTimestamp)

  return (
    <li
      className={styles.item}

      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <Link
        href={`/conversation/${conversation.id}`}
        className={`${styles.link} ${isSelected ? styles.linkSelected : ''}`}

        aria-current={isSelected ? 'true' : undefined}
      >
        <Avatar nickname={partner.nickname} seed={partner.id} />

        <span className={styles.body}>
          <span className={styles.name}>{partner.nickname}</span>
          {relativeDate !== '' && (
            <time className={styles.date} dateTime={isoDate} title={formatAbsolute(conversation.lastMessageTimestamp)}>
              {relativeDate}
            </time>
          )}
        </span>
      </Link>
    </li>
  )
})
