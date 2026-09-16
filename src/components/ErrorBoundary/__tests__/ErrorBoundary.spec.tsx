import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ErrorBoundary } from '../ErrorBoundary'

function Boom({ shouldThrow = true }: { shouldThrow?: boolean }): React.ReactElement {
  if (shouldThrow) throw new Error('render exploded')
  return <p>recovered content</p>
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('renders its children when nothing goes wrong', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('catches a render error and shows a recovery panel instead of a blank screen', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Quelque chose s'est mal passé/)).toBeInTheDocument()
  })

  it('contains the failure, leaving the rest of the page usable', () => {
    render(
      <div>
        <p>sidebar survives</p>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </div>,
    )

    expect(screen.getByText('sidebar survives')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('recovers when the user retries and the cause has gone', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [shouldThrow, setShouldThrow] = useState(true)
      return (
        <>
          <button type="button" onClick={() => setShouldThrow(false)}>
            fix it
          </button>
          <ErrorBoundary>
            <Boom shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </>
      )
    }

    render(<Harness />)
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'fix it' }))
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    expect(screen.getByText('recovered content')).toBeInTheDocument()
  })

  it('clears a caught error when resetKey changes, so navigation unblocks the pane', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="conversation-1">
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(
      <ErrorBoundary resetKey="conversation-2">
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('recovered content')).toBeInTheDocument()
  })

  it('reports the error, so a real monitoring hook has something to send', () => {
    const onError = jest.fn()

    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>,
    )

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'render exploded' }),
      expect.anything(),
    )
  })

  it('uses a custom fallback when one is provided', () => {
    render(
      <ErrorBoundary fallback={(error) => <p>custom: {error.message}</p>}>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByText('custom: render exploded')).toBeInTheDocument()
  })
})
