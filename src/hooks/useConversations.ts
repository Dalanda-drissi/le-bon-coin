import { useCallback, useMemo, useState } from 'react'
import type { Conversation } from '@/types/conversation'
import { fetchConversations, sortByRecency } from '@/lib/api/conversations'
import { useAsyncData } from './useAsyncData'
import type { ApiError } from '@/lib/api/errors'

export interface UseConversationsResult {
  conversations: Conversation[]
  status: 'loading' | 'success' | 'error'
  error: ApiError | null
  isRefreshing: boolean
  refetch: () => void

  addConversation: (conversation: Conversation) => void

  touchConversation: (conversationId: number, timestamp: number) => void
}

export function useConversations(loggedUserId: number): UseConversationsResult {
  const [localConversations, setLocalConversations] = useState<Conversation[]>([])
  const [timestampOverrides, setTimestampOverrides] = useState<Record<number, number>>({})

  const resource = useAsyncData<Conversation[]>(loggedUserId, (signal) =>
    fetchConversations(loggedUserId, signal),
  )

  const { data } = resource

  const conversations = useMemo(() => {
    const byId = new Map<number, Conversation>()

    for (const conversation of localConversations) byId.set(conversation.id, conversation)
    for (const conversation of data ?? []) byId.set(conversation.id, conversation)

    const merged = Array.from(byId.values(), (conversation) => {
      const override = timestampOverrides[conversation.id]

      return override !== undefined && override > conversation.lastMessageTimestamp
        ? { ...conversation, lastMessageTimestamp: override }
        : conversation
    })

    return sortByRecency(merged)
  }, [data, localConversations, timestampOverrides])

  const addConversation = useCallback((conversation: Conversation) => {
    setLocalConversations((current) =>
      current.some((existing) => existing.id === conversation.id)
        ? current
        : [...current, conversation],
    )
  }, [])

  const touchConversation = useCallback((conversationId: number, timestamp: number) => {
    setTimestampOverrides((current) =>
      (current[conversationId] ?? 0) >= timestamp
        ? current
        : { ...current, [conversationId]: timestamp },
    )
  }, [])

  return {
    conversations,

    status: conversations.length > 0 && resource.status === 'error' ? 'success' : resource.status,
    error: resource.error,
    isRefreshing: resource.isRefreshing,
    refetch: resource.refetch,
    addConversation,
    touchConversation,
  }
}
