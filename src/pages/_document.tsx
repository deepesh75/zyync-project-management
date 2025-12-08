import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect to your database/API domains for faster loading */}
        <link rel="preconnect" href="https://ep-aged-boat-a1tc9c50-pooler.ap-southeast-1.aws.neon.tech" />
        <link rel="dns-prefetch" href="https://ep-aged-boat-a1tc9c50-pooler.ap-southeast-1.aws.neon.tech" />
        
        {/* Optimize font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
