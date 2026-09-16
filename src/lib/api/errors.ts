export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'http'
  | 'parse'
  | 'aborted'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number

  readonly retryable: boolean

  constructor(
    kind: ApiErrorKind,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = options.status
    this.cause = options.cause
    this.retryable = computeRetryable(kind, options.status)

    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

function computeRetryable(kind: ApiErrorKind, status?: number): boolean {
  switch (kind) {
    case 'network':
    case 'timeout':
      return true
    case 'http':

      return status === 408 || status === 429 || (status !== undefined && status >= 500)
    case 'parse':
    case 'aborted':
      return false
  }
}

export function isAbort(error: unknown): boolean {
  if (error instanceof ApiError) return error.kind === 'aborted'
  return error instanceof DOMException && error.name === 'AbortError'
}

export function toUserMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Une erreur inattendue s'est produite."
  }

  switch (error.kind) {
    case 'network':
      return 'Impossible de joindre le serveur. Vérifiez votre connexion internet.'
    case 'timeout':
      return 'Le serveur met trop de temps à répondre.'
    case 'parse':
      return 'La réponse du serveur est illisible.'
    case 'aborted':
      return 'Requête annulée.'
    case 'http':
      if (error.status !== undefined && error.status >= 500) {
        return "Nos serveurs rencontrent un problème. Ce n'est pas vous, c'est nous."
      }
      if (error.status === 404) return 'Ressource introuvable.'
      if (error.status === 429) return 'Trop de requêtes. Réessayez dans un instant.'
      return 'La requête a été refusée par le serveur.'
  }
}
