import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useConversations, type UseConversationsResult } from '@/hooks/useConversations'
import { getLoggedUserId } from '@/utils/getLoggedUserId'

interface ConversationsContextValue extends UseConversationsResult {
  loggedUserId: number
}

const ConversationsContext = createContext<ConversationsContextValue | null>(null)

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const loggedUserId = getLoggedUserId()
  const conversations = useConversations(loggedUserId)

  const value = useMemo<ConversationsContextValue>(
    () => ({ ...conversations, loggedUserId }),
    [conversations, loggedUserId],
  )

  return <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>
}

export function useConversationsContext(): ConversationsContextValue {
  const context = useContext(ConversationsContext)

  if (context === null) {
    throw new Error('useConversationsContext must be used within a ConversationsProvider')
  }

  return context
}
