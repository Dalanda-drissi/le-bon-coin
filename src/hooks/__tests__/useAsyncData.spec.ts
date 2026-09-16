import { act, renderHook, waitFor } from '@testing-library/react'
import { useAsyncData } from '../useAsyncData'
import { ApiError } from '@/lib/api/errors'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAsyncData', () => {
  it('loads data for a key', async () => {
    const { result } = renderHook(() => useAsyncData('a', async () => 'value'))

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.data).toBe('value')
  })

  it('surfaces a failure as a typed error', async () => {
    const { result } = renderHook(() =>
      useAsyncData('a', async () => {
        throw new ApiError('http', 'boom', { status: 503 })
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toMatchObject({ kind: 'http', status: 503 })
  })

  it('does not fetch when the key is null', async () => {
    const fetcher = jest.fn()
    const { result } = renderHook(() => useAsyncData(null, fetcher))

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.status).toBe('success')
    expect(result.current.data).toBeNull()
  })

  describe('race conditions', () => {
    it('ignores a slow response that lands after the key has changed', async () => {
      const slow = deferred<string>()
      const fast = deferred<string>()

      const fetcher = jest.fn((key: string) => (key === 'a' ? slow.promise : fast.promise))

      const { result, rerender } = renderHook(
        ({ key }: { key: string }) => useAsyncData(key, () => fetcher(key)),
        { initialProps: { key: 'a' } },
      )

      rerender({ key: 'b' })

      await act(async () => {
        fast.resolve('data-for-b')
      })
      await waitFor(() => expect(result.current.data).toBe('data-for-b'))

      await act(async () => {
        slow.resolve('data-for-a')
      })

      expect(result.current.data).toBe('data-for-b')
    })

    it('aborts the in-flight request when the key changes', async () => {
      const signals: AbortSignal[] = []
      const { rerender } = renderHook(
        ({ key }: { key: string }) =>
          useAsyncData(key, (signal) => {
            signals.push(signal)
            return new Promise<string>(() => {
            })
          }),
        { initialProps: { key: 'a' } },
      )

      rerender({ key: 'b' })

      await waitFor(() => expect(signals).toHaveLength(2))

      expect(signals[0].aborted).toBe(true)
      expect(signals[1].aborted).toBe(false)
    })

    it('does not report an error when a request is aborted by a key change', async () => {
      const { result, rerender } = renderHook(
        ({ key }: { key: string }) =>
          useAsyncData(key, async (signal) => {
            if (key === 'a') {
              await new Promise((resolve) => setTimeout(resolve, 5))
              throw new ApiError('aborted', 'Request aborted by caller')
            }
            return `data-${key}`
          }),
        { initialProps: { key: 'a' } },
      )

      rerender({ key: 'b' })

      await waitFor(() => expect(result.current.status).toBe('success'))

      expect(result.current.error).toBeNull()
    })

    it('aborts the pending request on unmount', async () => {
      const signals: AbortSignal[] = []
      const { unmount } = renderHook(() =>
        useAsyncData('a', (signal) => {
          signals.push(signal)
          return new Promise<string>(() => {
          })
        }),
      )

      await waitFor(() => expect(signals).toHaveLength(1))
      unmount()

      expect(signals[0].aborted).toBe(true)
    })
  })

  describe('refetch', () => {
    it('keeps the existing data on screen while refreshing', async () => {
      let value = 'first'
      const { result } = renderHook(() => useAsyncData('a', async () => value))

      await waitFor(() => expect(result.current.data).toBe('first'))

      value = 'second'
      act(() => result.current.refetch())

      expect(result.current.data).toBe('first')
      expect(result.current.status).toBe('success')

      await waitFor(() => expect(result.current.data).toBe('second'))
      await waitFor(() => expect(result.current.isRefreshing).toBe(false))
    })

    it('clears a previous error once a retry succeeds', async () => {
      let shouldFail = true
      const { result } = renderHook(() =>
        useAsyncData('a', async () => {
          if (shouldFail) throw new ApiError('http', 'boom', { status: 503 })
          return 'recovered'
        }),
      )

      await waitFor(() => expect(result.current.status).toBe('error'))

      shouldFail = false
      act(() => result.current.refetch())

      await waitFor(() => expect(result.current.data).toBe('recovered'))
      expect(result.current.error).toBeNull()
    })
  })

  it('lets a caller write into the cache for an optimistic update', async () => {
    const { result } = renderHook(() => useAsyncData('a', async () => ['one']))

    await waitFor(() => expect(result.current.data).toEqual(['one']))

    act(() => result.current.setData((current) => [...(current ?? []), 'two']))

    expect(result.current.data).toEqual(['one', 'two'])
  })
})
