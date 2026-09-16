import type { ReactElement } from 'react'
import { render, type RenderResult } from '@testing-library/react'
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime'
import type { NextRouter } from 'next/router'
import { ConversationsProvider } from '@/context/ConversationsContext'

export function createMockRouter(overrides: Partial<NextRouter> = {}): NextRouter {
  const router = {
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    basePath: '',
    isLocaleDomain: false,
    isReady: true,
    isPreview: false,
    isFallback: false,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    push: jest.fn(() => Promise.resolve(true)),
    replace: jest.fn(() => Promise.resolve(true)),
    reload: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(() => Promise.resolve()),
    beforePopState: jest.fn(),
    ...overrides,
  } as unknown as NextRouter

  return router
}

interface RenderWithProvidersResult extends RenderResult {
  router: NextRouter
}

export function renderWithProviders(
  ui: ReactElement,
  { router = createMockRouter() }: { router?: NextRouter } = {},
): RenderWithProvidersResult {
  const result = render(
    <RouterContext.Provider value={router}>
      <ConversationsProvider>{ui}</ConversationsProvider>
    </RouterContext.Provider>,
  )

  return { ...result, router }
}
