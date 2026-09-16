import { useCallback, useMemo, useRef, useState } from 'react'
import type { Message } from '@/types/message'
import { fetchMessages, sendMessage, sortChronologically } from '@/lib/api/messages'
import { ApiError, isAbort } from '@/lib/api/errors'
import { useAsyncData } from './useAsyncData'

export interface PendingMessage {
  tempId: string
  conversationId: number
  authorId: number
  body: string
  timestamp: number
  status: 'sending' | 'failed'
  error?: ApiError
}

export type ThreadItem =
  | { kind: 'sent'; key: string; message: Message }
  | { kind: 'pending'; key: string; pending: PendingMessage }

export interface UseMessagesResult {
  items: ThreadItem[]
  status: 'loading' | 'success' | 'error'
  error: ApiError | null
  isRefreshing: boolean
  refetch: () => void
  send: (body: string) => Promise<void>

  retry: (tempId: string) => Promise<void>

  discard: (tempId: string) => void

  retryNetworkFailures: () => void
}

const EMPTY_PENDING: PendingMessage[] = []

let tempIdCounter = 0
function nextTempId(): string {
  tempIdCounter += 1
  return `pending-${tempIdCounter}`
}

export function useMessages(
  conversationId: number | null,
  authorId: number,
): UseMessagesResult {
  const [pendingByConversation, setPendingByConversation] = useState<
    Record<number, PendingMessage[]>
  >({})

  const resource = useAsyncData<Message[]>(conversationId, (signal) => {
    if (conversationId === null) return Promise.resolve([])
    return fetchMessages(conversationId, signal)
  })

  const conversationIdRef = useRef(conversationId)
  conversationIdRef.current = conversationId

  const { data, setData } = resource

  const cacheRef = useRef(new Map<number, Message[]>())

  if (conversationId !== null && data !== null) {
    cacheRef.current.set(conversationId, data)
  }

  const cachedData = conversationId === null ? null : cacheRef.current.get(conversationId) ?? null

  const effectiveData = data ?? cachedData
  const isServingFromCache = data === null && cachedData !== null

  const pending = useMemo<PendingMessage[]>(
    () => (conversationId === null ? EMPTY_PENDING : pendingByConversation[conversationId] ?? EMPTY_PENDING),
    [conversationId, pendingByConversation],
  )

  const updatePending = useCallback(
    (targetConversationId: number, updater: (current: PendingMessage[]) => PendingMessage[]) => {
      setPendingByConversation((current) => ({
        ...current,
        [targetConversationId]: updater(current[targetConversationId] ?? []),
      }))
    },
    [],
  )

  const dispatchSend = useCallback(
    async (entry: PendingMessage) => {
      const targetConversationId = entry.conversationId

      try {
        const created = await sendMessage({
          conversationId: targetConversationId,
          authorId: entry.authorId,
          body: entry.body,
        })

        updatePending(targetConversationId, (current) =>
          current.filter((item) => item.tempId !== entry.tempId),
        )

        if (conversationIdRef.current === targetConversationId) {
          setData((current) => sortChronologically([...(current ?? []), created]))
        }
      } catch (error) {
        if (isAbort(error)) return

        const apiError =
          error instanceof ApiError ? error : new ApiError('network', 'Send failed', { cause: error })

        updatePending(targetConversationId, (current) =>
          current.map((item) =>
            item.tempId === entry.tempId ? { ...item, status: 'failed', error: apiError } : item,
          ),
        )
      }
    },
    [setData, updatePending],
  )

  const send = useCallback(
    async (body: string) => {
      if (conversationId === null) return

      const entry: PendingMessage = {
        tempId: nextTempId(),
        conversationId,
        authorId,
        body,
        timestamp: Math.floor(Date.now() / 1000),
        status: 'sending',
      }

      updatePending(conversationId, (current) => [...current, entry])
      await dispatchSend(entry)
    },
    [authorId, conversationId, dispatchSend, updatePending],
  )

  const retry = useCallback(
    async (tempId: string) => {
      if (conversationId === null) return

      const entry = (pendingByConversation[conversationId] ?? []).find(
        (item) => item.tempId === tempId,
      )
      if (entry === undefined || entry.status === 'sending') return

      updatePending(conversationId, (current) =>
        current.map((item) =>
          item.tempId === tempId ? { ...item, status: 'sending', error: undefined } : item,
        ),
      )

      await dispatchSend({ ...entry, status: 'sending' })
    },
    [conversationId, dispatchSend, pendingByConversation, updatePending],
  )

  const discard = useCallback(
    (tempId: string) => {
      if (conversationId === null) return
      updatePending(conversationId, (current) => current.filter((item) => item.tempId !== tempId))
    },
    [conversationId, updatePending],
  )

  const retryNetworkFailures = useCallback(() => {
    setPendingByConversation((current) => {
      const resendable: PendingMessage[] = []

      for (const entries of Object.values(current)) {
        for (const entry of entries) {
          if (entry.status === 'failed' && entry.error?.kind === 'network') resendable.push(entry)
        }
      }

      if (resendable.length === 0) return current

      queueMicrotask(() => {
        for (const entry of resendable) void dispatchSend({ ...entry, status: 'sending' })
      })

      const resendableIds = new Set(resendable.map((entry) => entry.tempId))
      const next: Record<number, PendingMessage[]> = {}

      for (const [key, entries] of Object.entries(current)) {
        next[Number(key)] = entries.map((entry) =>
          resendableIds.has(entry.tempId)
            ? { ...entry, status: 'sending' as const, error: undefined }
            : entry,
        )
      }

      return next
    })
  }, [dispatchSend])

  const items = useMemo<ThreadItem[]>(() => {
    const sent: ThreadItem[] = (effectiveData ?? []).map((message) => ({
      kind: 'sent',
      key: `message-${message.id}`,
      message,
    }))

    const optimistic: ThreadItem[] = pending.map((item) => ({
      kind: 'pending',
      key: item.tempId,
      pending: item,
    }))

    return [...sent, ...optimistic]
  }, [effectiveData, pending])

  return {
    items,

    status:
      isServingFromCache || (items.length > 0 && resource.status === 'error')
        ? 'success'
        : resource.status,
    error: resource.error,

    isRefreshing: resource.isRefreshing || isServingFromCache,
    refetch: resource.refetch,
    send,
    retry,
    discard,
    retryNetworkFailures,
  }
}
