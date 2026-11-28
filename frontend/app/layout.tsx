import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Anton, Galada, Onest } from 'next/font/google'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site-config'
import './globals.css'

const onest = Onest({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-onest' })
const galada = Galada({ subsets: ['latin'], weight: '400', variable: '--font-galada' })
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton' })

const TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: SITE_NAME,
    title: TITLE,
    description: SITE_DESCRIPTION,
    url: '/',
    images: [{ url: '/images/brand/logo-mark.png', width: 225, height: 225, alt: `Logo ${SITE_NAME}` }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: SITE_DESCRIPTION,
    images: ['/images/brand/logo-mark.png'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#091c33',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning className={`${onest.variable} ${anton.variable} ${galada.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
