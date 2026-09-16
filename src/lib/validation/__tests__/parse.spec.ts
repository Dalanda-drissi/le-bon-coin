import {
  parseConversation,
  parseList,
  parseMessage,
  parseSingle,
  parseUser,
} from '../parse'

describe('parseConversation', () => {
  const valid = {
    id: 1,
    senderId: 1,
    senderNickname: 'Thibaut',
    recipientId: 2,
    recipientNickname: 'Jeremie',
    lastMessageTimestamp: 1625637849,
  }

  it('parses a well-formed conversation', () => {
    expect(parseConversation(valid)).toEqual(valid)
  })

  it('coerces stringified ids, so a backend switching to string ids does not break the app', () => {
    const parsed = parseConversation({ ...valid, id: '7', senderId: '1', recipientId: '2' })

    expect(parsed).toMatchObject({ id: 7, senderId: 1, recipientId: 2 })
  })

  it.each([
    ['missing id', { ...valid, id: undefined }],
    ['missing senderId', { ...valid, senderId: undefined }],
    ['missing recipientId', { ...valid, recipientId: undefined }],
    ['non-numeric id', { ...valid, id: 'abc' }],
  ])('rejects a conversation with %s, because it cannot be keyed or routed', (_label, input) => {
    expect(parseConversation(input)).toBeNull()
  })

  it.each([null, undefined, 42, 'string', []])('rejects the non-object %p', (input) => {
    expect(parseConversation(input)).toBeNull()
  })

  it('substitutes a readable placeholder rather than rendering a missing nickname', () => {
    const parsed = parseConversation({ ...valid, senderNickname: undefined, recipientNickname: '  ' })

    expect(parsed?.senderNickname).toBe('Utilisateur inconnu')
    expect(parsed?.recipientNickname).toBe('Utilisateur inconnu')
  })

  it('keeps a conversation whose timestamp is unusable, sorting it last instead of hiding it', () => {
    const parsed = parseConversation({ ...valid, lastMessageTimestamp: 'not-a-date' })

    expect(parsed).not.toBeNull()
    expect(parsed?.lastMessageTimestamp).toBe(0)
  })
})

describe('parseMessage', () => {
  const valid = {
    id: 1,
    conversationId: 1,
    authorId: 2,
    timestamp: 1625637849,
    body: 'Bonjour',
  }

  it('parses a well-formed message', () => {
    expect(parseMessage(valid)).toEqual(valid)
  })

  it('rejects a message with no authorId, which could otherwise be shown as the wrong person', () => {
    expect(parseMessage({ ...valid, authorId: undefined })).toBeNull()
  })

  it('rejects a message with no conversationId', () => {
    expect(parseMessage({ ...valid, conversationId: null })).toBeNull()
  })

  it('keeps an empty body rather than dropping the message', () => {
    expect(parseMessage({ ...valid, body: undefined })?.body).toBe('')
  })
})

describe('parseUser', () => {
  it('parses a well-formed user', () => {
    expect(parseUser({ id: 1, nickname: 'Thibaut', token: 'xxxx' })).toEqual({
      id: 1,
      nickname: 'Thibaut',
      token: 'xxxx',
    })
  })

  it('rejects a user with no id', () => {
    expect(parseUser({ nickname: 'Thibaut' })).toBeNull()
  })
})

describe('parseList', () => {
  it('drops malformed entries but keeps the rest of the list renderable', () => {
    const payload = [
      { id: 1, conversationId: 1, authorId: 1, timestamp: 1, body: 'ok' },
      null,
      { id: 2, body: 'no author' },
      'garbage',
      { id: 3, conversationId: 1, authorId: 2, timestamp: 2, body: 'also ok' },
    ]

    const parsed = parseList(payload, parseMessage)

    expect(parsed.map((m) => m.id)).toEqual([1, 3])
  })

  it.each([null, undefined, {}, 'nope'])(
    'treats the non-array payload %p as empty instead of throwing',
    (payload) => {
      expect(parseList(payload, parseMessage)).toEqual([])
    },
  )
})

describe('parseSingle', () => {
  it('unwraps the single-element array the server actually returns', () => {
    expect(parseSingle([{ id: 2, nickname: 'Jeremie', token: 'x' }], parseUser)).toMatchObject({
      id: 2,
    })
  })

  it('also accepts the bare object the swagger promises', () => {
    expect(parseSingle({ id: 2, nickname: 'Jeremie', token: 'x' }, parseUser)).toMatchObject({
      id: 2,
    })
  })

  it('returns null for an empty array', () => {
    expect(parseSingle([], parseUser)).toBeNull()
  })
})
