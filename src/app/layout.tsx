import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Metalyde — Agency OS",
  description: "AI-native marketing operations, orchestrated end to end.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  )
}
