import type { Metadata, Viewport } from 'next'
import ClientLayout from './ClientLayout'
import '../ui/theme/theme.css'

export const metadata: Metadata = {
  title: 'Control Operativo',
  description: 'Incidencias y Horarios',
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
