import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  resetKey?: string | number
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.error !== null && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (error === null) return this.props.children

    if (this.props.fallback !== undefined) return this.props.fallback(error, this.reset)

    return (
      <div className={styles.container} role="alert">
        <p className={styles.title}>Quelque chose s&apos;est mal passé</p>
        <p className={styles.description}>
          Cette partie de la page n&apos;a pas pu s&apos;afficher. Le reste de l&apos;application
          reste utilisable.
        </p>
        <button type="button" className={styles.retry} onClick={this.reset}>
          Réessayer
        </button>
      </div>
    )
  }
}
