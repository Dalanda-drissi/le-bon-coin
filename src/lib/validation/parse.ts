import type { Conversation } from '@/types/conversation'
import type { Message } from '@/types/message'
import type { User } from '@/types/user'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toTimestamp(value: unknown): number | null {
  const id = toId(value)
  if (id === null || id < 0) return null
  return id
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toNickname(value: unknown): string {
  const text = toText(value).trim()
  return text === '' ? 'Utilisateur inconnu' : text
}

export function parseConversation(value: unknown): Conversation | null {
  if (!isRecord(value)) return null

  const id = toId(value.id)
  const senderId = toId(value.senderId)
  const recipientId = toId(value.recipientId)

  if (id === null || senderId === null || recipientId === null) return null

  return {
    id,
    senderId,
    recipientId,
    senderNickname: toNickname(value.senderNickname),
    recipientNickname: toNickname(value.recipientNickname),

    lastMessageTimestamp: toTimestamp(value.lastMessageTimestamp) ?? 0,
  }
}

export function parseMessage(value: unknown): Message | null {
  if (!isRecord(value)) return null

  const id = toId(value.id)
  const conversationId = toId(value.conversationId)
  const authorId = toId(value.authorId)

  if (id === null || conversationId === null || authorId === null) return null

  return {
    id,
    conversationId,
    authorId,
    timestamp: toTimestamp(value.timestamp) ?? 0,
    body: toText(value.body),
  }
}

export function parseUser(value: unknown): User | null {
  if (!isRecord(value)) return null

  const id = toId(value.id)
  if (id === null) return null

  return { id, nickname: toNickname(value.nickname), token: toText(value.token) }
}

export function parseList<T>(value: unknown, parse: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return []

  const result: T[] = []
  for (const item of value) {
    const parsed = parse(item)
    if (parsed !== null) result.push(parsed)
  }
  return result
}

export function parseSingle<T>(value: unknown, parse: (item: unknown) => T | null): T | null {
  if (Array.isArray(value)) return value.length > 0 ? parse(value[0]) : null
  return parse(value)
}
