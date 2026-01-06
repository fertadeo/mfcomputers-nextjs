"use client"

import type React from "react"
import { useState } from "react"
import { ERPSidebar } from "./erp-sidebar"
import { cn } from "@/lib/utils"

interface ERPLayoutProps {
  children: React.ReactNode
  activeItem?: string
}

export function ERPLayout({ children, activeItem }: ERPLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <ERPSidebar
        activeItem={activeItem}
        onItemClick={(itemId) => {
          // En una app real, aquí manejarías la navegación
          console.log(`Navigating to: ${itemId}`)
        }}
      />

      {/* Main content */}
      <main className={cn("transition-all duration-300 md:ml-64", "min-h-screen")}>
        <div className="p-4 md:p-6 pt-16 md:pt-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  )
}
