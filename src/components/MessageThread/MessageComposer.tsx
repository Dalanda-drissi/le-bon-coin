import { useCallback, useId, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import {
  MAX_MESSAGE_LENGTH,
  MESSAGE_LENGTH_WARNING_THRESHOLD,
  messageValidationMessage,
  validateMessageBody,
  type MessageValidationError,
} from '@/lib/validation/messageInput'
import styles from './MessageThread.module.css'

interface MessageComposerProps {
  onSend: (body: string) => Promise<void>
  disabled?: boolean
  recipientName: string
}

const MAX_TEXTAREA_ROWS = 6

export function MessageComposer({ onSend, disabled = false, recipientName }: MessageComposerProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<MessageValidationError | null>(null)
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const errorId = useId()
  const counterId = useId()

  const validation = validateMessageBody(value)
  const canSend = validation.valid && !isSending && !disabled
  const length = value.trim().length
  const isNearLimit = length >= MESSAGE_LENGTH_WARNING_THRESHOLD

  const resize = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea === null) return

    textarea.style.height = 'auto'
    const lineHeight = 22
    const maxHeight = lineHeight * MAX_TEXTAREA_ROWS
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [])

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setValue(event.target.value)
      setError(null)
      resize()
    },
    [resize],
  )

  const submit = useCallback(async () => {
    const result = validateMessageBody(value)

    if (!result.valid) {
      setError(result.error ?? 'empty')
      textareaRef.current?.focus()
      return
    }

    if (isSending || disabled) return

    setIsSending(true)
    setValue('')
    setError(null)

    try {
      await onSend(result.value)
    } finally {
      setIsSending(false)
      requestAnimationFrame(resize)
      textareaRef.current?.focus()
    }
  }, [disabled, isSending, onSend, resize, value])

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      void submit()
    },
    [submit],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault()
        void submit()
      }
    },
    [submit],
  )

  const describedBy = [error !== null ? errorId : null, isNearLimit ? counterId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <label htmlFor="message-input" className="visually-hidden">
        {`Écrire un message à ${recipientName}`}
      </label>

      <div className={styles.composerRow}>
        <textarea
          id="message-input"
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message…"
          rows={1}
          disabled={disabled}
          aria-invalid={error !== null}
          aria-describedby={describedBy === '' ? undefined : describedBy}
        />

        <button
          type="submit"
          className={styles.sendButton}
          disabled={!canSend}
          aria-label="Envoyer le message"
        >
          <svg
            className={styles.sendIcon}
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M3.4 20.4 20.85 12.92a1 1 0 0 0 0-1.84L3.4 3.6a.99.99 0 0 0-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91Z" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div className={styles.composerFooter}>
        {error !== null && (
          <span id={errorId} className={styles.composerError} role="alert">
            {messageValidationMessage(error)}
          </span>
        )}

        {isNearLimit && (
          <span
            id={counterId}
            className={`${styles.counter} ${length > MAX_MESSAGE_LENGTH ? styles.counterOver : ''}`}
            aria-live="polite"
          >
            {length} / {MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
    </form>
  )
}
