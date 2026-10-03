import type { Metadata } from 'next'
import './globals.css'
import { Ubuntu } from 'next/font/google'

const font = Ubuntu({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  manifest: "/manifest.json",
  themeColor: "#0b141a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hadir — Absensi Organisasi",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <meta name="theme-color" content="#0b141a" />
      </head>
      <body className={font.className}>
        {children}
      </body>
    </html>
  )
}
