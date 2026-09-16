import type { Conversation } from '@/types/conversation'
import { EmptyState, ErrorBanner, ErrorState, ConversationListSkeleton } from '@/components/Feedback/Feedback'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import type { ApiError } from '@/lib/api/errors'
import { ConversationListItem } from './ConversationListItem'
import styles from './ConversationList.module.css'

interface ConversationListProps {
  conversations: Conversation[]
  loggedUserId: number
  selectedConversationId: number | null
  status: 'loading' | 'success' | 'error'
  error: ApiError | null
  isRefreshing: boolean
  onRetry: () => void
  onCreateConversation: () => void
}

export function ConversationList({
  conversations,
  loggedUserId,
  selectedConversationId,
  status,
  error,
  isRefreshing,
  onRetry,
  onCreateConversation,
}: ConversationListProps) {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Messages</h1>

        <div className={styles.headerActions}>
          <ThemeToggle />
          <button
            type="button"
            className={styles.newButton}
            onClick={onCreateConversation}
            aria-label="Nouvelle conversation"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
              <path d="M13 5a1 1 0 1 0-2 0v6H5a1 1 0 1 0 0 2h6v6a1 1 0 1 0 2 0v-6h6a1 1 0 1 0 0-2h-6V5Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      {error !== null && status === 'success' && (
        <ErrorBanner error={error} onRetry={onRetry} isRetrying={isRefreshing} />
      )}

      {status === 'loading' && <ConversationListSkeleton />}

      {status === 'error' && <ErrorState error={error} onRetry={onRetry} isRetrying={isRefreshing} />}

      {status === 'success' && conversations.length === 0 && (
        <EmptyState
          title="Aucune conversation"
          description="Démarrez une conversation pour échanger avec un autre utilisateur."
          action={
            <button type="button" className={styles.emptyAction} onClick={onCreateConversation}>
              Nouvelle conversation
            </button>
          }
        />
      )}

      {status === 'success' && conversations.length > 0 && (
        <nav className={styles.scroller} aria-label="Conversations">

          <ul className={styles.list}>
            {conversations.map((conversation, index) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                loggedUserId={loggedUserId}
                isSelected={conversation.id === selectedConversationId}
                index={index}
              />
            ))}
          </ul>
        </nav>
      )}
    </div>
  )
}
