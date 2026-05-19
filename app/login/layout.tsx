import type React from "react"

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen">
      <link rel="preload" as="image" href="/images/bglogin.webp" type="image/webp" />
      {children}
    </div>
  )
}
