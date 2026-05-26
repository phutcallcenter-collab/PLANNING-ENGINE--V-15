// force-refresh
import type { Metadata, Viewport } from 'next'
import ClientLayout from './ClientLayout'
import './globals.css'
import '../ui/theme/theme.css'

export const metadata: Metadata = {
  title: 'Nexo — Control Operativo',
  description: 'Operación diaria y planificación en un solo lugar.',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
    shortcut: '/icon-192.png'
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#2e5266',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
