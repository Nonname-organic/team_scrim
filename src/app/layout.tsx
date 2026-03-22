import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VALORANT Scrim Analyzer',
  description: '競技VALORANTチームのための戦術分析ツール',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className="dark">
      <body className={`${inter.className} bg-[#0F0F14] text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
