import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Anton, Onest } from 'next/font/google'
import './globals.css'

const onest = Onest({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-onest' })
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton' })

export const metadata: Metadata = {
  title: 'Pit Stop Barbershop — Men & Kids',
  description:
    'Pit Stop Barbershop Men & Kids. Lihat portofolio kapster, coba gaya rambut secara virtual, dan reservasi slot potong rambut online tanpa antre.',
  generator: 'v0.app',
  icons: { icon: '/images/logo.png', apple: '/images/logo.png' },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#07080c',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${onest.variable} ${anton.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
