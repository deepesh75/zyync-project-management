import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '../contexts/ThemeContext'
import PageLoader from '../components/PageLoader'

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <PageLoader />
        <Component {...pageProps} />
      </ThemeProvider>
    </SessionProvider>
  )
}
