import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import styles from './OfflineBanner.module.css'
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      Vous êtes hors ligne. Vos messages seront envoyés dès le retour de la connexion.
    </div>
  )
}
