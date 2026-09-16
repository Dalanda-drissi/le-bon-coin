const LOCALE = 'fr-FR'

const timeFormatter = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const weekdayFormatter = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' })
const dayMonthFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' })
const fullDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const fullDateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: 'full',
  timeStyle: 'short',
})

const MS_PER_DAY = 86_400_000

export function toDate(unixSeconds: number): Date {
  return new Date(unixSeconds * 1000)
}

export function isValidTimestamp(unixSeconds: number): boolean {
  return (
    Number.isFinite(unixSeconds) &&
    unixSeconds > 0 &&
    !Number.isNaN(toDate(unixSeconds).getTime())
  )
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY)
}

export function formatConversationTimestamp(unixSeconds: number, now: Date = new Date()): string {
  if (!isValidTimestamp(unixSeconds)) return ''

  const date = toDate(unixSeconds)
  const delta = daysBetween(date, now)

  if (delta === 0) return timeFormatter.format(date)
  if (delta === 1) return 'Hier'
  if (delta > 0 && delta < 7) return weekdayFormatter.format(date)
  if (date.getFullYear() === now.getFullYear()) return dayMonthFormatter.format(date)
  return fullDateFormatter.format(date)
}

export function formatDaySeparator(unixSeconds: number, now: Date = new Date()): string {
  if (!isValidTimestamp(unixSeconds)) return ''

  const date = toDate(unixSeconds)
  const delta = daysBetween(date, now)

  if (delta === 0) return "Aujourd'hui"
  if (delta === 1) return 'Hier'
  if (date.getFullYear() === now.getFullYear()) return dayMonthFormatter.format(date)
  return fullDateFormatter.format(date)
}

export function formatMessageTime(unixSeconds: number): string {
  if (!isValidTimestamp(unixSeconds)) return ''
  return timeFormatter.format(toDate(unixSeconds))
}

export function formatAbsolute(unixSeconds: number): string {
  if (!isValidTimestamp(unixSeconds)) return ''
  return fullDateTimeFormatter.format(toDate(unixSeconds))
}

export function toIsoString(unixSeconds: number): string | undefined {
  if (!isValidTimestamp(unixSeconds)) return undefined
  return toDate(unixSeconds).toISOString()
}

export function startsNewDay(previous: number | undefined, current: number): boolean {
  if (previous === undefined) return true
  if (!isValidTimestamp(previous) || !isValidTimestamp(current)) return false
  return startOfDay(toDate(previous)) !== startOfDay(toDate(current))
}
