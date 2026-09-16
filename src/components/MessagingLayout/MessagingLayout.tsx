import { useCallback, useState, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import type { Conversation } from '@/types/conversation'
import { ConversationList } from '@/components/ConversationList/ConversationList'
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'
import { OfflineBanner } from '@/components/OfflineBanner/OfflineBanner'
import { useConversationsContext } from '@/context/ConversationsContext'
import { useReconnectEffect } from '@/hooks/useOnlineStatus'
import styles from './MessagingLayout.module.css'

const NewConversationDialog = dynamic(
  () => import('@/components/NewConversationDialog/NewConversationDialog').then((m) => m.NewConversationDialog),
  { ssr: false },
)

interface MessagingLayoutProps {
  selectedConversationId: number | null
  children: ReactNode
}

export function MessagingLayout({ selectedConversationId, children }: MessagingLayoutProps) {
  const router = useRouter()
  const [isDialogOpen, setDialogOpen] = useState(false)
  const {
    conversations,
    loggedUserId,
    status,
    error,
    isRefreshing,
    refetch,
    addConversation,
  } = useConversationsContext()

  useReconnectEffect(refetch)

  const handleCreated = useCallback(
    (conversation: Conversation) => {
      addConversation(conversation)
      setDialogOpen(false)
      void router.push(`/conversation/${conversation.id}`)
    },
    [addConversation, router],
  )

  return (
    <div className={styles.shell} data-has-selection={selectedConversationId !== null}>
      <OfflineBanner />

      <div className={styles.panes}>
      <div className={styles.listPane}>

        <ErrorBoundary>
          <ConversationList
            conversations={conversations}
            loggedUserId={loggedUserId}
            selectedConversationId={selectedConversationId}
            status={status}
            error={error}
            isRefreshing={isRefreshing}
            onRetry={refetch}
            onCreateConversation={() => setDialogOpen(true)}
          />
        </ErrorBoundary>
      </div>

      <main className={styles.detailPane}>

        <ErrorBoundary resetKey={selectedConversationId ?? 'none'}>{children}</ErrorBoundary>
      </main>
      </div>

      {isDialogOpen && (
        <NewConversationDialog
          loggedUserId={loggedUserId}
          conversations={conversations}
          onClose={() => setDialogOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
