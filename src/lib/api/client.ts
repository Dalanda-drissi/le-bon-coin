import { ApiError } from './errors'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005'

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_RETRIES = 2
const RETRY_BASE_DELAY_MS = 300

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown

  signal?: AbortSignal
  timeoutMs?: number

  retries?: number
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = method === 'GET' ? DEFAULT_RETRIES : 0,
  } = options

  const url = `${API_BASE_URL}${path}`
  let lastError: ApiError = new ApiError('network', 'Request never ran')

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal?.aborted) throw new ApiError('aborted', 'Request aborted by caller')

    try {
      return await attemptRequest<T>(url, method, body, signal, timeoutMs)
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('network', 'Request failed', { cause: error })

      if (!apiError.retryable || attempt === retries) throw apiError

      lastError = apiError

      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt * (0.5 + Math.random())
      await sleep(delay, signal)
    }
  }

  throw lastError
}

async function attemptRequest<T>(
  url: string,
  method: string,
  body: unknown,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController()
  const onExternalAbort = () => controller.abort()
  signal?.addEventListener('abort', onExternalAbort)

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (error) {
    if (timedOut) throw new ApiError('timeout', `Request to ${url} timed out`, { cause: error })
    if (signal?.aborted) throw new ApiError('aborted', 'Request aborted by caller', { cause: error })
    throw new ApiError('network', `Could not reach ${url}`, { cause: error })
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onExternalAbort)
  }

  if (!response.ok) {
    throw new ApiError('http', `${method} ${url} failed with ${response.status}`, {
      status: response.status,
    })
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  if (text.trim() === '') return undefined as T

  try {
    return JSON.parse(text) as T
  } catch (error) {
    throw new ApiError('parse', `Response from ${url} was not valid JSON`, { cause: error })
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(new ApiError('aborted', 'Request aborted by caller'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
