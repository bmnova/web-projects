import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SocialSaaS — Social Media Content Platform',
  description: 'Create and publish social media content for your startup',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">{children}</body>
    </html>
  )
}
