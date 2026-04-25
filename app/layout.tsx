import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hazel — AI Receptionist for Skin Clinics',
  description: 'Intelligent booking, intake, and patient tracking for private UK skin clinics.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
