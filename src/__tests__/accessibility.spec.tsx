import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import ConversationPage from '@/pages/conversation/[id]'
import Home from '@/pages/index'
import { createMockRouter, renderWithProviders } from '@/test-utils/renderApp'
import { installMockApi } from '@/test-utils/mockApi'

expect.extend(toHaveNoViolations)

beforeEach(() => {
  jest.spyOn(Math, 'random').mockReturnValue(0)
  installMockApi()
})

afterEach(() => {
  jest.restoreAllMocks()
})

function renderConversation(id: string) {
  return renderWithProviders(<ConversationPage />, {
    router: createMockRouter({
      pathname: '/conversation/[id]',
      query: { id },
      asPath: `/conversation/${id}`,
    }),
  })
}

describe('accessibility', () => {
  it('has no violations on the conversation list', async () => {
    const { container } = renderWithProviders(<Home />)
    await screen.findByRole('navigation', { name: 'Conversations' })

    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations while the list is loading', async () => {
    const { container } = renderWithProviders(<Home />)

    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations on an open conversation', async () => {
    const { container } = renderConversation('1')
    await screen.findByText('Premier message')

    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations on the empty state', async () => {
    installMockApi({ conversations: [] })
    const { container } = renderWithProviders(<Home />)
    await screen.findByText('Aucune conversation')

    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations on the error state', async () => {
    const api = installMockApi()
    api.failWith({ status: 503 })

    const { container } = renderWithProviders(<Home />)
    await screen.findByText(/Ce n'est pas vous/, {}, { timeout: 3000 })

    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations in the new-conversation dialog', async () => {
    const user = userEvent.setup()
    const { container } = renderWithProviders(<Home />)

    await screen.findByRole('navigation', { name: 'Conversations' })
    await user.click(screen.getByRole('button', { name: /Nouvelle conversation/ }))
    await screen.findByRole('dialog')

    expect(await axe(container)).toHaveNoViolations()
  })

  it('has no violations when a message has failed to send', async () => {
    const user = userEvent.setup()
    const api = installMockApi()
    const { container } = renderConversation('1')
    await screen.findByText('Premier message')

    api.failWith({ status: 503 })
    await user.type(screen.getByLabelText(/Écrire un message/), 'Message perdu')
    await user.keyboard('{Enter}')
    await screen.findByText('Non envoyé')

    expect(await axe(container)).toHaveNoViolations()
  })

  describe('named controls', () => {
    it('gives every icon-only button an accessible name', async () => {
      renderWithProviders(<Home />)
      await screen.findByRole('navigation', { name: 'Conversations' })

      expect(screen.getByRole('button', { name: /Nouvelle conversation/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /thème/i })).toBeInTheDocument()
    })

    it('exposes the theme toggle as a pressable control, not a bare button', async () => {
      renderWithProviders(<Home />)
      await screen.findByRole('navigation', { name: 'Conversations' })

      const toggle = screen.getByRole('button', { name: /thème/i })
      await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed'))
    })

    it('labels the composer even though its label is visually hidden', async () => {
      renderConversation('1')
      await screen.findByText('Premier message')

      expect(screen.getByLabelText(/Écrire un message à Jeremie/)).toBeInTheDocument()
    })
  })
})
