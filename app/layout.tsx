import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'hazel — every patient, perfectly prepared',
  description: 'hazel handles bookings, intake, and patient continuity for skin clinics — 24/7.',
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
