import type { Conversation } from '@/types/conversation'
import type { Message } from '@/types/message'
import type { User } from '@/types/user'

export interface MockApiOptions {
  users?: User[]
  conversations?: Conversation[]
  messages?: Message[]
}

export interface MockApi {
  fetch: jest.Mock

  failWith: (failure: { status?: number; network?: boolean } | null) => void

  setDelay: (ms: number) => void
  getMessages: (conversationId: number) => Message[]
  getConversations: () => Conversation[]
  callsTo: (pattern: string) => number
}

export const DEFAULT_USERS: User[] = [
  { id: 1, nickname: 'Thibaut', token: 'xxxx' },
  { id: 2, nickname: 'Jeremie', token: 'xxxx' },
  { id: 3, nickname: 'Patrick', token: 'xxxx' },
  { id: 4, nickname: 'Elodie', token: 'xxxx' },
]

export const DEFAULT_CONVERSATIONS: Conversation[] = [
  {
    id: 1,
    senderId: 1,
    senderNickname: 'Thibaut',
    recipientId: 2,
    recipientNickname: 'Jeremie',
    lastMessageTimestamp: 1625637849,
  },
  {
    id: 2,
    senderId: 1,
    senderNickname: 'Thibaut',
    recipientId: 3,
    recipientNickname: 'Patrick',
    lastMessageTimestamp: 1620284667,
  },
  {
    id: 3,
    senderId: 4,
    senderNickname: 'Elodie',
    recipientId: 1,
    recipientNickname: 'Thibaut',
    lastMessageTimestamp: 1625648667,
  },
]

export const DEFAULT_MESSAGES: Message[] = [
  { id: 1, conversationId: 1, authorId: 1, timestamp: 1625637849, body: 'Premier message' },
  { id: 2, conversationId: 1, authorId: 2, timestamp: 1625637867, body: 'Réponse de Jeremie' },
  { id: 4, conversationId: 2, authorId: 3, timestamp: 1620284667, body: 'Message de Patrick' },
]

export function installMockApi(options: MockApiOptions = {}): MockApi {
  const users = [...(options.users ?? DEFAULT_USERS)]
  let conversations = [...(options.conversations ?? DEFAULT_CONVERSATIONS)]
  let messages = [...(options.messages ?? DEFAULT_MESSAGES)]

  let failure: { status?: number; network?: boolean } | null = null
  let delayMs = 0
  let nextId = 100
  const calls: string[] = []

  const fetchMock = jest.fn(async (url: string, init: RequestInit = {}) => {
    calls.push(url)

    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs))

    if (failure !== null) {
      if (failure.network === true) throw new TypeError('Failed to fetch')
      return jsonResponse({ error: 'boom' }, failure.status ?? 503)
    }

    const path = url.replace('http://localhost:3005', '')
    const method = init.method ?? 'GET'
    const body = init.body === undefined ? undefined : JSON.parse(String(init.body))

    if (path === '/users') return jsonResponse(users)

    const userMatch = /^\/user\/(\d+)$/.exec(path)
    if (userMatch !== null) {
      return jsonResponse(users.filter((user) => user.id === Number(userMatch[1])))
    }

    const conversationsMatch = /^\/conversations\/(\d+)$/.exec(path)
    if (conversationsMatch !== null) {
      const userId = Number(conversationsMatch[1])

      if (method === 'POST') {
        const created = { ...body, id: nextId++ } as Conversation
        conversations = [...conversations, created]
        return jsonResponse(created, 201)
      }

      return jsonResponse(
        conversations.filter((c) => c.senderId === userId || c.recipientId === userId),
      )
    }

    const messagesMatch = /^\/messages\/(\d+)$/.exec(path)
    if (messagesMatch !== null) {
      const conversationId = Number(messagesMatch[1])

      if (method === 'POST') {
        const created = { ...body, id: nextId++ } as Message
        messages = [...messages, created]
        return jsonResponse(created, 201)
      }

      return jsonResponse(messages.filter((m) => m.conversationId === conversationId))
    }

    return jsonResponse({}, 404)
  })

  global.fetch = fetchMock as unknown as typeof fetch

  return {
    fetch: fetchMock,
    failWith: (next) => {
      failure = next
    },
    setDelay: (ms) => {
      delayMs = ms
    },
    getMessages: (conversationId) => messages.filter((m) => m.conversationId === conversationId),
    getConversations: () => conversations,
    callsTo: (pattern) => calls.filter((url) => url.includes(pattern)).length,
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response
}
