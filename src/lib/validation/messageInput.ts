export const MAX_MESSAGE_LENGTH = 2000

export const MESSAGE_LENGTH_WARNING_THRESHOLD = Math.floor(MAX_MESSAGE_LENGTH * 0.9)

export type MessageValidationError = 'empty' | 'too-long'

export interface MessageValidationResult {
  valid: boolean

  value: string
  error?: MessageValidationError
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g

export function normaliseMessageBody(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(CONTROL_CHARS, '')

    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function validateMessageBody(raw: string): MessageValidationResult {
  const value = normaliseMessageBody(raw)

  if (value === '') return { valid: false, value: '', error: 'empty' }

  if (value.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, value: '', error: 'too-long' }
  }

  return { valid: true, value }
}

export function messageValidationMessage(error: MessageValidationError): string {
  switch (error) {
    case 'empty':
      return 'Votre message est vide.'
    case 'too-long':
      return `Votre message dépasse ${MAX_MESSAGE_LENGTH} caractères.`
  }
}
