import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbort } from '@/lib/api/errors'

export type AsyncStatus = 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  error: ApiError | null
  status: AsyncStatus

  isRefreshing: boolean
}

export interface AsyncResource<T> extends AsyncState<T> {
  refetch: () => void

  setData: (updater: T | ((current: T | null) => T)) => void
}

export function useAsyncData<T>(
  key: string | number | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
): AsyncResource<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    status: key === null ? 'success' : 'loading',
    isRefreshing: false,
  })

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const runIdRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      controllerRef.current?.abort()
    }
  }, [])

  const load = useCallback(
    (mode: 'initial' | 'refresh') => {
      if (key === null) return

      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      const runId = runIdRef.current + 1
      runIdRef.current = runId

      setState((current) => ({
        ...current,

        status: mode === 'refresh' && current.data !== null ? 'success' : 'loading',
        isRefreshing: mode === 'refresh',
        error: mode === 'refresh' ? current.error : null,
      }))

      fetcherRef
        .current(controller.signal)
        .then((data) => {
          if (runId !== runIdRef.current || !mountedRef.current) return
          setState({ data, error: null, status: 'success', isRefreshing: false })
        })
        .catch((error: unknown) => {
          if (runId !== runIdRef.current || !mountedRef.current) return

          if (isAbort(error)) return

          setState((current) => ({
            ...current,
            error: error instanceof ApiError ? error : new ApiError('network', 'Request failed', { cause: error }),
            status: 'error',
            isRefreshing: false,
          }))
        })
    },
    [key],
  )

  useEffect(() => {
    if (key === null) {
      setState({ data: null, error: null, status: 'success', isRefreshing: false })
      return
    }
    load('initial')
  }, [key, load])

  const refetch = useCallback(() => {
    load('refresh')
  }, [load])

  const setData = useCallback((updater: T | ((current: T | null) => T)) => {
    setState((current) => ({
      ...current,
      data: typeof updater === 'function' ? (updater as (c: T | null) => T)(current.data) : updater,

      status: 'success',
      error: null,
    }))
  }, [])

  return { ...state, refetch, setData }
}
