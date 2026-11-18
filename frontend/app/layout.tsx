import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Anton, Galada, Onest } from 'next/font/google'
import './globals.css'

const onest = Onest({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-onest' })
const galada = Galada({ subsets: ['latin'], weight: '400', variable: '--font-galada' })
const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton' })

export const metadata: Metadata = {
  title: 'Pit Stop Barbershop — Men & Kids',
  description:
    'Pit Stop Barbershop Men & Kids. Lihat portofolio kapster, coba gaya rambut secara virtual, dan reservasi slot potong rambut online tanpa antre.',
  icons: { icon: '/images/brand/logo-mark.png', apple: '/images/brand/logo-mark.png' },
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
    <html lang="id" className={`${onest.variable} ${anton.variable} ${galada.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
