import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ConversationPage from '@/pages/conversation/[id]'
import Home from '@/pages/index'
import { createMockRouter, renderWithProviders } from '@/test-utils/renderApp'
import { DEFAULT_CONVERSATIONS, installMockApi, type MockApi } from '@/test-utils/mockApi'

let api: MockApi

const RETRY_TIMEOUT = { timeout: 3000 }

beforeEach(() => {
  jest.spyOn(Math, 'random').mockReturnValue(0)
  api = installMockApi()
})

afterEach(() => {
  jest.restoreAllMocks()
})

function renderConversation(id: string) {
  const router = createMockRouter({
    pathname: '/conversation/[id]',
    query: { id },
    asPath: `/conversation/${id}`,
  })

  return renderWithProviders(<ConversationPage />, { router })
}

describe('conversation list', () => {
  it('shows a loading state, then every conversation the user takes part in', async () => {
    renderWithProviders(<Home />)

    expect(screen.getByText(/Chargement des conversations/)).toBeInTheDocument()

    const list = await screen.findByRole('navigation', { name: 'Conversations' })

    expect(within(list).getByText('Jeremie')).toBeInTheDocument()
    expect(within(list).getByText('Patrick')).toBeInTheDocument()
    expect(within(list).getByText('Elodie')).toBeInTheDocument()
  })

  it('names the other participant, not the logged user, on a conversation they received', async () => {
    renderWithProviders(<Home />)

    const list = await screen.findByRole('navigation', { name: 'Conversations' })

    expect(within(list).getByText('Elodie')).toBeInTheDocument()
    expect(within(list).queryByText('Thibaut')).not.toBeInTheDocument()
  })

  it('orders conversations by most recent activity', async () => {
    renderWithProviders(<Home />)

    const list = await screen.findByRole('navigation', { name: 'Conversations' })
    const names = within(list)
      .getAllByRole('link')
      .map((link) => link.textContent)

    expect(names[0]).toContain('Elodie')
    expect(names[1]).toContain('Jeremie')
    expect(names[2]).toContain('Patrick')
  })

  it('offers each conversation as a real link, so it can be opened in a new tab', async () => {
    renderWithProviders(<Home />)

    const list = await screen.findByRole('navigation', { name: 'Conversations' })

    expect(within(list).getByRole('link', { name: /Jeremie/ })).toHaveAttribute(
      'href',
      '/conversation/1',
    )
  })

  it('shows an empty state when the user has no conversations', async () => {
    api = installMockApi({ conversations: [] })
    renderWithProviders(<Home />)

    expect(await screen.findByText('Aucune conversation')).toBeInTheDocument()
  })
})

describe('opening a conversation', () => {
  it('shows the messages in the thread', async () => {
    renderConversation('1')

    expect(await screen.findByText('Premier message')).toBeInTheDocument()
    expect(screen.getByText('Réponse de Jeremie')).toBeInTheDocument()
  })

  it('does not show messages belonging to another conversation', async () => {
    renderConversation('1')

    await screen.findByText('Premier message')
    expect(screen.queryByText('Message de Patrick')).not.toBeInTheDocument()
  })

  it('labels the other participant above their messages but not the user\'s own', async () => {
    renderConversation('1')

    const log = await screen.findByRole('log')

    expect(within(log).getByText('Jeremie')).toBeInTheDocument()
  })

  it('moves focus to the thread heading, so the pane change is announced', async () => {
    renderConversation('1')

    const heading = await screen.findByRole('heading', { name: /Jeremie/ })
    await waitFor(() => expect(heading).toHaveFocus())
  })

  it('marks the open conversation as current in the list', async () => {
    renderConversation('1')

    const list = await screen.findByRole('navigation', { name: 'Conversations' })
    const selected = within(list).getByRole('link', { name: /Jeremie/ })

    expect(selected).toHaveAttribute('aria-current', 'true')
    expect(within(list).getByRole('link', { name: /Patrick/ })).not.toHaveAttribute('aria-current')
  })

  it('shows a not-found state for an id that does not exist', async () => {
    renderConversation('999')

    expect(await screen.findByText('Conversation introuvable')).toBeInTheDocument()
  })

  it('shows a not-found state for a non-numeric id rather than crashing', async () => {
    renderConversation('abc')

    expect(await screen.findByText('Conversation introuvable')).toBeInTheDocument()
  })

  it('shows an empty state for a conversation with no messages yet', async () => {
    api = installMockApi({ messages: [] })
    renderConversation('1')

    expect(await screen.findByText('Aucun message')).toBeInTheDocument()
  })
})

describe('sending a message', () => {
  it('appends the message to the thread and posts it to the server', async () => {
    const user = userEvent.setup()
    renderConversation('1')

    await screen.findByText('Premier message')

    const input = screen.getByLabelText(/Écrire un message/)
    await user.type(input, 'Bonjour Jeremie')
    await user.click(screen.getByRole('button', { name: 'Envoyer le message' }))

    expect(await screen.findByText('Bonjour Jeremie')).toBeInTheDocument()

    await waitFor(() => {
      expect(api.getMessages(1).some((m) => m.body === 'Bonjour Jeremie')).toBe(true)
    })
  })

  it('sends conversationId and authorId, without which the server orphans the message', async () => {
    const user = userEvent.setup()
    renderConversation('1')
    await screen.findByText('Premier message')

    await user.type(screen.getByLabelText(/Écrire un message/), 'Coucou')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      const stored = api.getMessages(1).find((m) => m.body === 'Coucou')
      expect(stored).toBeDefined()

      expect(stored).toMatchObject({ conversationId: 1, authorId: 1 })
    })
  })

  it('sends on Enter', async () => {
    const user = userEvent.setup()
    renderConversation('1')
    await screen.findByText('Premier message')

    await user.type(screen.getByLabelText(/Écrire un message/), 'Via Enter')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Via Enter')).toBeInTheDocument()
  })

  it('inserts a newline on Shift+Enter instead of sending', async () => {
    const user = userEvent.setup()
    renderConversation('1')
    await screen.findByText('Premier message')

    const input = screen.getByLabelText(/Écrire un message/) as HTMLTextAreaElement
    await user.type(input, 'ligne 1')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(input, 'ligne 2')

    expect(input.value).toBe('ligne 1\nligne 2')
    expect(api.callsTo('/messages/1')).toBe(1)
  })

  it('clears the composer after a successful send', async () => {
    const user = userEvent.setup()
    renderConversation('1')
    await screen.findByText('Premier message')

    const input = screen.getByLabelText(/Écrire un message/) as HTMLTextAreaElement
    await user.type(input, 'Un message')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(input.value).toBe(''))
  })

  it('keeps focus in the composer so a conversation can be held from the keyboard', async () => {
    const user = userEvent.setup()
    renderConversation('1')
    await screen.findByText('Premier message')

    const input = screen.getByLabelText(/Écrire un message/)
    await user.type(input, 'Un message')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(input).toHaveFocus())
  })

  describe('input validation', () => {
    it('disables the send button while the composer is empty', async () => {
      renderConversation('1')
      await screen.findByText('Premier message')

      expect(screen.getByRole('button', { name: 'Envoyer le message' })).toBeDisabled()
    })

    it('does not send a whitespace-only message', async () => {
      const user = userEvent.setup()
      renderConversation('1')
      await screen.findByText('Premier message')

      await user.type(screen.getByLabelText(/Écrire un message/), '    ')

      expect(screen.getByRole('button', { name: 'Envoyer le message' })).toBeDisabled()

      await user.keyboard('{Enter}')

      expect(await screen.findByText('Votre message est vide.')).toBeInTheDocument()
      expect(api.callsTo('/messages/1')).toBe(1)
    })

    it('refuses a message over the length limit and explains why', async () => {
      const user = userEvent.setup()
      renderConversation('1')
      await screen.findByText('Premier message')

      const input = screen.getByLabelText(/Écrire un message/)

      await user.click(input)
      await user.paste('a'.repeat(2001))
      await user.keyboard('{Enter}')

      expect(await screen.findByText(/dépasse 2000 caractères/)).toBeInTheDocument()
      expect(api.callsTo('/messages/1')).toBe(1)
    })
  })
})

describe('failure handling', () => {
  it('shows a blame-free message and a retry when the conversation list fails', async () => {
    api = installMockApi()
    api.failWith({ status: 503 })

    renderWithProviders(<Home />)

    expect(await screen.findByText(/Ce n'est pas vous, c'est nous/, {}, RETRY_TIMEOUT)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })

  it('recovers when the user retries and the server has come back', async () => {
    const user = userEvent.setup()
    api = installMockApi()
    api.failWith({ status: 503 })

    renderWithProviders(<Home />)
    await screen.findByText(/Ce n'est pas vous, c'est nous/, {}, RETRY_TIMEOUT)

    api.failWith(null)
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    const list = await screen.findByRole('navigation', { name: 'Conversations' })
    expect(within(list).getByText('Jeremie')).toBeInTheDocument()
  })

  it('reports a network failure as a connection problem', async () => {
    api = installMockApi()
    api.failWith({ network: true })

    renderWithProviders(<Home />)

    expect(await screen.findByText(/Vérifiez votre connexion/, {}, RETRY_TIMEOUT)).toBeInTheDocument()
  })

  it('does not offer a retry for a 400, which would fail identically', async () => {
    api = installMockApi()
    api.failWith({ status: 400 })

    renderWithProviders(<Home />)

    await screen.findByText(/refusée par le serveur/, {}, RETRY_TIMEOUT)
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument()
  })

  it('keeps a failed message on screen and offers to send it again', async () => {
    const user = userEvent.setup()
    renderConversation('1')
    await screen.findByText('Premier message')

    api.failWith({ status: 503 })
    await user.type(screen.getByLabelText(/Écrire un message/), 'Message perdu')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Message perdu')).toBeInTheDocument()
    expect(await screen.findByText('Non envoyé')).toBeInTheDocument()

    api.failWith(null)
    await user.click(screen.getByRole('button', { name: 'Réessayer' }))

    await waitFor(() => {
      expect(api.getMessages(1).some((m) => m.body === 'Message perdu')).toBe(true)
    })
    await waitFor(() => expect(screen.queryByText('Non envoyé')).not.toBeInTheDocument())
  })

  it('lets the user discard a message that will not send', async () => {
    const user = userEvent.setup()
    renderConversation('1')
    await screen.findByText('Premier message')

    api.failWith({ status: 503 })
    await user.type(screen.getByLabelText(/Écrire un message/), 'À supprimer')
    await user.keyboard('{Enter}')

    await screen.findByText('Non envoyé')
    await user.click(screen.getByRole('button', { name: 'Supprimer' }))

    await waitFor(() => expect(screen.queryByText('À supprimer')).not.toBeInTheDocument())
  })

  it('keeps the conversation list usable when only the message fetch fails', async () => {
    api = installMockApi({ messages: [] })
    renderConversation('1')

    const list = await screen.findByRole('navigation', { name: 'Conversations' })
    expect(within(list).getByText('Jeremie')).toBeInTheDocument()
  })
})

describe('creating a conversation', () => {
  it('lets the user start a conversation with another user and navigates to it', async () => {
    const user = userEvent.setup()
    const { router } = renderWithProviders(<Home />)

    await screen.findByRole('navigation', { name: 'Conversations' })
    await user.click(screen.getByRole('button', { name: /Nouvelle conversation/ }))

    const dialog = await screen.findByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: /Jeremie/ }))

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/conversation/1'))
  })

  it('creates a new conversation when there is no existing one', async () => {
    const user = userEvent.setup()

    api = installMockApi({ conversations: [DEFAULT_CONVERSATIONS[0]] })
    const { router } = renderWithProviders(<Home />)

    await screen.findByRole('navigation', { name: 'Conversations' })
    await user.click(screen.getByRole('button', { name: /Nouvelle conversation/ }))

    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /Patrick/ }))

    await waitFor(() => {
      const created = api.getConversations().find((c) => c.recipientId === 3 && c.senderId === 1)
      expect(created).toBeDefined()

      expect(created).toMatchObject({ senderNickname: 'Thibaut', recipientNickname: 'Patrick' })
    })

    expect(router.push).toHaveBeenCalled()
  })

  it('never offers the logged user a conversation with themselves', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Home />)

    await screen.findByRole('navigation', { name: 'Conversations' })
    await user.click(screen.getByRole('button', { name: /Nouvelle conversation/ }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByText('Thibaut')).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Home />)

    await screen.findByRole('navigation', { name: 'Conversations' })
    await user.click(screen.getByRole('button', { name: /Nouvelle conversation/ }))
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
