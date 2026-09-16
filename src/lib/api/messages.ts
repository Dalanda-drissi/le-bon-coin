import type { Message } from '@/types/message'
import { request } from './client'
import { ApiError } from './errors'
import { parseList, parseMessage } from '../validation/parse'

export function sortChronologically(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => a.timestamp - b.timestamp || a.id - b.id)
}

export async function fetchMessages(
  conversationId: number,
  signal?: AbortSignal,
): Promise<Message[]> {
  const payload = await request<unknown>(`/messages/${conversationId}`, { signal })
  return sortChronologically(parseList(payload, parseMessage))
}

export interface SendMessageInput {
  conversationId: number
  authorId: number
  body: string
}

export async function sendMessage(input: SendMessageInput, signal?: AbortSignal): Promise<Message> {
  const body = {
    conversationId: input.conversationId,
    authorId: input.authorId,
    body: input.body,
    timestamp: Math.floor(Date.now() / 1000),
  }

  const payload = await request<unknown>(`/messages/${input.conversationId}`, {
    method: 'POST',
    body,
    signal,
  })

  const created = parseMessage(payload)
  if (created !== null) return created

  throw new ApiError('parse', 'Message sent but the server response was unreadable')
}
