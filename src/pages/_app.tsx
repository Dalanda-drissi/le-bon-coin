import type { AppProps } from 'next/app'
import Head from 'next/head'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ErrorBoundary } from '@/components/ErrorBoundary/ErrorBoundary'
import { ConversationsProvider } from '@/context/ConversationsContext'
import '../styles/globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-display',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
})

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Messages - leboncoin</title>
        <meta name="description" content="Consultez et envoyez vos messages leboncoin." />

        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>

      <div className={`${jakarta.variable} appRoot`}>
        <ErrorBoundary>
          <ConversationsProvider>
            <Component {...pageProps} />
          </ConversationsProvider>
        </ErrorBoundary>
      </div>
    </>
  )
}
