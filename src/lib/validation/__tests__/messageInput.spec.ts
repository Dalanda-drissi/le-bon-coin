import {
  MAX_MESSAGE_LENGTH,
  normaliseMessageBody,
  validateMessageBody,
} from '../messageInput'

describe('normaliseMessageBody', () => {
  it('trims surrounding whitespace', () => {
    expect(normaliseMessageBody('  hello  ')).toBe('hello')
  })

  it('normalises CRLF to LF so line endings do not vary by platform', () => {
    expect(normaliseMessageBody('a\r\nb')).toBe('a\nb')
  })

  it('collapses long runs of blank lines produced by holding Enter', () => {
    expect(normaliseMessageBody('a\n\n\n\n\nb')).toBe('a\n\nb')
  })

  it('preserves a single intentional paragraph break', () => {
    expect(normaliseMessageBody('a\n\nb')).toBe('a\n\nb')
  })

  it('strips control characters that would corrupt rendering', () => {
    expect(normaliseMessageBody('he\u0000ll\u0007o')).toBe('hello')
  })

  it('keeps newlines and tabs, which are legitimate in a message', () => {
    expect(normaliseMessageBody('a\tb\nc')).toBe('a\tb\nc')
  })
})

describe('validateMessageBody', () => {
  it('accepts a normal message and returns the trimmed body to send', () => {
    expect(validateMessageBody('  Bonjour !  ')).toEqual({ valid: true, value: 'Bonjour !' })
  })

  it('rejects an empty string', () => {
    expect(validateMessageBody('')).toMatchObject({ valid: false, error: 'empty' })
  })

  it.each(['   ', '\n\n\n', '\t', '\r\n  \r\n'])(
    'rejects the whitespace-only input %j, which would post a blank bubble',
    (input) => {
      expect(validateMessageBody(input)).toMatchObject({ valid: false, error: 'empty' })
    },
  )

  it('rejects input that is only control characters, since it normalises to nothing', () => {
    expect(validateMessageBody('\u0000\u0007')).toMatchObject({ valid: false, error: 'empty' })
  })

  it('accepts a message exactly at the length limit', () => {
    expect(validateMessageBody('a'.repeat(MAX_MESSAGE_LENGTH))).toMatchObject({ valid: true })
  })

  it('rejects a message one character over the limit', () => {
    expect(validateMessageBody('a'.repeat(MAX_MESSAGE_LENGTH + 1))).toMatchObject({
      valid: false,
      error: 'too-long',
    })
  })

  it('measures length after trimming, so trailing whitespace never blocks a valid send', () => {
    const input = `${'a'.repeat(MAX_MESSAGE_LENGTH)}      `

    expect(validateMessageBody(input)).toMatchObject({ valid: true })
  })
})
