// force-refresh
import type { Metadata, Viewport } from 'next'
import ClientLayout from './ClientLayout'
import '../ui/theme/theme.css'

export const metadata: Metadata = {
  title: 'Control Operativo - Incidencias y Horarios',
  description: 'Sistema de gestión de turnos y control operativo',
  icons: {
    icon: '/icon_final.jpg',
    apple: '/icon_final.jpg',
    shortcut: '/icon_final.jpg'
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#000000',
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
