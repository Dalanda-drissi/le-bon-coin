import { request } from '../client'
import { ApiError, toUserMessage } from '../errors'

const fetchMock = jest.fn()
global.fetch = fetchMock as unknown as typeof fetch

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response
}

function emptyResponse(status = 200): Response {
  return { ok: status >= 200 && status < 300, status, text: async () => '' } as Response
}

beforeEach(() => {
  fetchMock.mockReset()

  jest.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('request', () => {
  it('returns the parsed JSON body on success', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: 1 }]))

    await expect(request('/users')).resolves.toEqual([{ id: 1 }])
  })

  it('serialises a JSON body and sets the content type on POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 5 }))

    await request('/messages/1', { method: 'POST', body: { body: 'hi' } })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3005/messages/1',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ body: 'hi' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  it('treats an empty 2xx body as undefined rather than a parse failure', async () => {
    fetchMock.mockResolvedValue(emptyResponse(200))

    await expect(request('/message/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('raises a typed parse error when a 2xx body is not JSON', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '<html>' } as Response)

    await expect(request('/users', { retries: 0 })).rejects.toMatchObject({
      kind: 'parse',
      retryable: false,
    })
  })

  it('wraps a rejected fetch as a retryable network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(request('/users', { retries: 0 })).rejects.toMatchObject({
      kind: 'network',
      retryable: true,
    })
  })

  it('never leaks a raw fetch rejection to the caller', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(request('/users', { retries: 0 })).rejects.toBeInstanceOf(ApiError)
  })

  describe('HTTP failures', () => {
    it('reports a 4xx as a non-retryable http error', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 400))

      await expect(request('/users')).rejects.toMatchObject({
        kind: 'http',
        status: 400,
        retryable: false,
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('marks a 503 retryable and retries it', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 503))

      await expect(request('/users', { retries: 1 })).rejects.toMatchObject({
        kind: 'http',
        status: 503,
        retryable: true,
      })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('retries a 429, which explicitly means "try again"', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 429))

      await expect(request('/users', { retries: 1 })).rejects.toMatchObject({ retryable: true })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('retry behaviour', () => {
    it('recovers when a flaky server succeeds on a later attempt', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({}, 503))
        .mockResolvedValueOnce(jsonResponse([{ id: 1 }]))

      await expect(request('/users', { retries: 2 })).resolves.toEqual([{ id: 1 }])
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('does not retry a POST by default, which would risk sending the message twice', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 503))

      await expect(
        request('/messages/1', { method: 'POST', body: { body: 'hi' } }),
      ).rejects.toMatchObject({ status: 503 })

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('cancellation', () => {
    it('rejects immediately when the signal is already aborted, without calling fetch', async () => {
      const controller = new AbortController()
      controller.abort()

      await expect(request('/users', { signal: controller.signal })).rejects.toMatchObject({
        kind: 'aborted',
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('classifies an in-flight abort as aborted, not as a network failure', async () => {
      const controller = new AbortController()

      fetchMock.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            controller.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          }),
      )

      const pending = request('/users', { signal: controller.signal, retries: 0 })
      controller.abort()

      await expect(pending).rejects.toMatchObject({ kind: 'aborted', retryable: false })
    })
  })

  describe('timeout', () => {
    it('aborts a hanging request and reports it as a timeout', async () => {
      jest.useFakeTimers()

      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          }),
      )

      const pending = request('/users', { timeoutMs: 1000, retries: 0 })
      const assertion = expect(pending).rejects.toMatchObject({ kind: 'timeout', retryable: true })

      await jest.advanceTimersByTimeAsync(1001)
      await assertion

      jest.useRealTimers()
    })
  })
})

describe('toUserMessage', () => {
  it('blames the infrastructure, not the user, on a 5xx', () => {
    const message = toUserMessage(new ApiError('http', 'boom', { status: 503 }))

    expect(message).toMatch(/pas vous/i)
  })

  it('suggests checking the connection on a network failure', () => {
    expect(toUserMessage(new ApiError('network', 'boom'))).toMatch(/connexion/i)
  })

  it('falls back to a generic message for a non-ApiError', () => {
    expect(toUserMessage(new Error('unexpected'))).toMatch(/inattendue/i)
  })
})
