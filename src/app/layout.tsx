import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FastWellBook — Free Booking Websites for Wellness Businesses',
  description: 'Free booking websites for UK wellness businesses. No monthly fee. 8.69% commission only.',
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
