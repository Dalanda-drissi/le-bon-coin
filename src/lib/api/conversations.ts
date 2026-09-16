import type { Conversation } from '@/types/conversation'
import { request } from './client'
import { ApiError } from './errors'
import { parseConversation, parseList } from '../validation/parse'

export interface ConversationPartner {
  id: number
  nickname: string
}

export function getPartner(conversation: Conversation, loggedUserId: number): ConversationPartner {
  const userIsSender = conversation.senderId === loggedUserId

  return userIsSender
    ? { id: conversation.recipientId, nickname: conversation.recipientNickname }
    : { id: conversation.senderId, nickname: conversation.senderNickname }
}

export function sortByRecency(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
}

export async function fetchConversations(
  userId: number,
  signal?: AbortSignal,
): Promise<Conversation[]> {
  const payload = await request<unknown>(`/conversations/${userId}`, { signal })
  return sortByRecency(parseList(payload, parseConversation))
}

export interface CreateConversationInput {
  senderId: number
  senderNickname: string
  recipientId: number
  recipientNickname: string
}

export async function createConversation(
  input: CreateConversationInput,
  signal?: AbortSignal,
): Promise<Conversation> {
  const body = {
    ...input,
    lastMessageTimestamp: Math.floor(Date.now() / 1000),
  }

  const payload = await request<unknown>(`/conversations/${input.senderId}`, {
    method: 'POST',
    body,
    signal,
  })

  const created = parseConversation(payload)
  if (created !== null) return created

  throw new ApiError('parse', 'Conversation created but the server response was unreadable')
}
