import {
  formatConversationTimestamp,
  formatDaySeparator,
  formatMessageTime,
  isValidTimestamp,
  startsNewDay,
  toIsoString,
} from '../date'

const NOW = new Date(2021, 6, 7, 14, 30)

function at(year: number, month: number, day: number, hour = 12, minute = 0): number {
  return Math.floor(new Date(year, month, day, hour, minute).getTime() / 1000)
}

describe('isValidTimestamp', () => {
  it.each([0, -1, NaN, Infinity])('rejects %p', (input) => {
    expect(isValidTimestamp(input)).toBe(false)
  })

  it('accepts a real timestamp', () => {
    expect(isValidTimestamp(1625637849)).toBe(true)
  })
})

describe('formatConversationTimestamp', () => {
  it('shows the time for a conversation active today', () => {
    expect(formatConversationTimestamp(at(2021, 6, 7, 9, 5), NOW)).toMatch(/09.05/)
  })

  it('shows "Hier" for yesterday', () => {
    expect(formatConversationTimestamp(at(2021, 6, 6), NOW)).toBe('Hier')
  })

  it('shows the weekday within the last week', () => {
    expect(formatConversationTimestamp(at(2021, 6, 4), NOW)).toBe('dimanche')
  })

  it('shows day and month earlier in the same year', () => {
    expect(formatConversationTimestamp(at(2021, 3, 24), NOW)).toBe('24 avril')
  })

  it('includes the year for a conversation from a previous year', () => {
    expect(formatConversationTimestamp(at(2020, 3, 24), NOW)).toBe('24 avril 2020')
  })

  it('returns an empty string for an unusable timestamp rather than "Invalid Date"', () => {
    expect(formatConversationTimestamp(0, NOW)).toBe('')
    expect(formatConversationTimestamp(NaN, NOW)).toBe('')
  })
})

describe('formatDaySeparator', () => {
  it('labels today', () => {
    expect(formatDaySeparator(at(2021, 6, 7), NOW)).toBe("Aujourd'hui")
  })

  it('labels yesterday', () => {
    expect(formatDaySeparator(at(2021, 6, 6), NOW)).toBe('Hier')
  })

  it('uses the date for anything older, where a weekday alone would be ambiguous', () => {
    expect(formatDaySeparator(at(2021, 6, 4), NOW)).toBe('4 juillet')
  })
})

describe('formatMessageTime', () => {
  it('formats to hours and minutes', () => {
    expect(formatMessageTime(at(2021, 6, 7, 9, 5))).toMatch(/09.05/)
  })

  it('returns an empty string for an unusable timestamp', () => {
    expect(formatMessageTime(0)).toBe('')
  })
})

describe('toIsoString', () => {
  it('produces a machine-readable value for the <time> element', () => {
    expect(toIsoString(1625637849)).toBe('2021-07-07T06:04:09.000Z')
  })

  it('returns undefined for an unusable timestamp, so the attribute is omitted', () => {
    expect(toIsoString(0)).toBeUndefined()
  })
})

describe('startsNewDay', () => {
  it('is true for the first message, which always opens a day group', () => {
    expect(startsNewDay(undefined, at(2021, 6, 7))).toBe(true)
  })

  it('is false for two messages on the same day', () => {
    expect(startsNewDay(at(2021, 6, 7, 9), at(2021, 6, 7, 18))).toBe(false)
  })

  it('is true when the calendar day changes', () => {
    expect(startsNewDay(at(2021, 6, 6, 23), at(2021, 6, 7, 1))).toBe(true)
  })

  it('does not insert a separator around an unusable timestamp', () => {
    expect(startsNewDay(0, at(2021, 6, 7))).toBe(false)
  })
})
