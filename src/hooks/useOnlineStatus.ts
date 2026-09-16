import { useEffect, useState } from 'react'

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine)

    update()

    window.addEventListener('online', update)
    window.addEventListener('offline', update)

    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return isOnline
}

export function useReconnectEffect(onReconnect: () => void): void {
  const isOnline = useOnlineStatus()
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
      return
    }

    if (wasOffline) {
      setWasOffline(false)
      onReconnect()
    }
  }, [isOnline, onReconnect, wasOffline])
}
