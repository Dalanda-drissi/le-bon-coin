import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Conversation } from '@/types/conversation'
import type { User } from '@/types/user'
import { createConversation, getPartner } from '@/lib/api/conversations'
import { fetchUsers } from '@/lib/api/users'
import { ApiError, isAbort, toUserMessage } from '@/lib/api/errors'
import { useAsyncData } from '@/hooks/useAsyncData'
import { Avatar } from '@/components/Avatar/Avatar'
import { ErrorState, LoadingState } from '@/components/Feedback/Feedback'
import styles from './NewConversationDialog.module.css'

interface NewConversationDialogProps {
  loggedUserId: number
  conversations: Conversation[]
  onClose: () => void
  onCreated: (conversation: Conversation) => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function NewConversationDialog({
  loggedUserId,
  conversations,
  onClose,
  onCreated,
}: NewConversationDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  const [submittingUserId, setSubmittingUserId] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<ApiError | null>(null)

  const usersResource = useAsyncData<User[]>('users', (signal) => fetchUsers(signal))

  const existingByUserId = useMemo(() => {
    const byUserId = new Map<number, Conversation>()
    for (const conversation of conversations) {
      const partner = getPartner(conversation, loggedUserId)
      if (!byUserId.has(partner.id)) byUserId.set(partner.id, conversation)
    }
    return byUserId
  }, [conversations, loggedUserId])

  const loggedUser = (usersResource.data ?? []).find((user) => user.id === loggedUserId)
  const candidates = (usersResource.data ?? []).filter((user) => user.id !== loggedUserId)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    return () => previouslyFocusedRef.current?.focus()
  }, [])

  useEffect(() => {
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
    firstFocusable?.focus()
  }, [usersResource.status])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  const handleSelect = useCallback(
    async (user: User) => {
      const existing = existingByUserId.get(user.id)
      if (existing !== undefined) {
        onCreated(existing)
        return
      }

      if (submittingUserId !== null) return

      setSubmittingUserId(user.id)
      setSubmitError(null)

      try {
        const created = await createConversation({
          senderId: loggedUserId,
          senderNickname: loggedUser?.nickname ?? 'Moi',
          recipientId: user.id,
          recipientNickname: user.nickname,
        })

        onCreated(created)
      } catch (error) {
        if (isAbort(error)) return
        setSubmitError(
          error instanceof ApiError ? error : new ApiError('network', 'Creation failed', { cause: error }),
        )
      } finally {
        setSubmittingUserId(null)
      }
    },
    [existingByUserId, loggedUser?.nickname, loggedUserId, onCreated, submittingUserId],
  )

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={styles.dialog}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >

        <div className={styles.header}>
          <h2 className={styles.title} id={titleId}>
            Nouvelle conversation
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
              <path
                d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {usersResource.status === 'loading' && <LoadingState label="Chargement des utilisateurs…" />}

          {usersResource.status === 'error' && (
            <ErrorState error={usersResource.error} onRetry={usersResource.refetch} />
          )}

          {usersResource.status === 'success' && candidates.length === 0 && (
            <p className={styles.empty}>Aucun autre utilisateur disponible.</p>
          )}

          {submitError !== null && (
            <p className={styles.submitError} role="alert">
              {toUserMessage(submitError)}
            </p>
          )}

          {candidates.length > 0 && (
            <ul className={styles.list}>
              {candidates.map((user) => {
                const existing = existingByUserId.get(user.id)
                const isSubmitting = submittingUserId === user.id

                return (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={styles.userButton}
                      onClick={() => void handleSelect(user)}
                      disabled={submittingUserId !== null}
                    >
                      <Avatar nickname={user.nickname} seed={user.id} />
                      <span className={styles.userText}>
                        <span className={styles.userName}>{user.nickname}</span>
                        {existing !== undefined && (
                          <span className={styles.userHint}>Conversation existante</span>
                        )}
                      </span>
                      {isSubmitting && <span className={styles.userStatus}>Création…</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
