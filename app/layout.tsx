import type { Metadata } from "next"
import type { ReactNode } from "react"

import "./globals.css"

export const metadata: Metadata = {
  title: "SpireOps | Command Center",
  description: "Enterprise transport operations command center.",
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  return <html lang="en"><body>{children}</body></html>
}
