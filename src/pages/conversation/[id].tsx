import { useCallback, type ReactElement } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { MessagingLayout } from '@/components/MessagingLayout/MessagingLayout'
import { MessageThread } from '@/components/MessageThread/MessageThread'
import { EmptyState, LoadingState } from '@/components/Feedback/Feedback'
import { useConversationsContext } from '@/context/ConversationsContext'
import { useMessages } from '@/hooks/useMessages'
import styles from '@/styles/Placeholder.module.css'

function useConversationIdFromRoute(): { id: number | null; isReady: boolean } {
  const router = useRouter()

  if (!router.isReady) return { id: null, isReady: false }

  const raw = router.query.id
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === undefined) return { id: null, isReady: true }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) return { id: null, isReady: true }

  return { id: parsed, isReady: true }
}

export default function ConversationPage(): ReactElement {
  const { id, isReady } = useConversationIdFromRoute()
  const { conversations, loggedUserId, status, touchConversation } = useConversationsContext()

  const conversation = id === null ? undefined : conversations.find((item) => item.id === id)

  const messages = useMessages(conversation?.id ?? null, loggedUserId)
  const { send } = messages

  const handleSend = useCallback(
    async (body: string) => {
      await send(body)
      if (conversation !== undefined) {
        touchConversation(conversation.id, Math.floor(Date.now() / 1000))
      }
    },
    [conversation, send, touchConversation],
  )

  return (
    <MessagingLayout selectedConversationId={id}>
      {renderContent()}
    </MessagingLayout>
  )

  function renderContent(): ReactElement {
    if (!isReady || (status === 'loading' && conversation === undefined)) {
      return <LoadingState label="Chargement de la conversation…" />
    }

    if (conversation === undefined) {
      return (
        <div className={styles.placeholder}>
          <EmptyState
            title="Conversation introuvable"
            description="Cette conversation n'existe pas ou n'est plus accessible."
            action={
              <Link href="/" className={styles.backAction}>
                Retour aux conversations
              </Link>
            }
          />
        </div>
      )
    }

    return (
      <MessageThread
        conversation={conversation}
        loggedUserId={loggedUserId}
        messages={{ ...messages, send: handleSend }}
      />
    )
  }
}
