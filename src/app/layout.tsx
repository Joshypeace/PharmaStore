import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import  Providers  from '@/components/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PharmaStore - Pharmacy Management System',
  description: 'Professional pharmacy management system for Malawi',
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
