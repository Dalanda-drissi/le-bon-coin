import type { ReactElement } from 'react'
import { MessagingLayout } from '@/components/MessagingLayout/MessagingLayout'
import styles from '@/styles/Placeholder.module.css'

export default function Home(): ReactElement {
  return (
    <MessagingLayout selectedConversationId={null}>
      <div className={styles.placeholder}>
        <span className={styles.glyph} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" focusable="false">
            <path
              d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm0 14H5.2L4 17.2V4h16v12Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <p className={styles.title}>Sélectionnez une conversation</p>
        <p className={styles.description}>
          Choisissez une conversation dans la liste pour afficher les messages.
        </p>
      </div>
    </MessagingLayout>
  )
}
