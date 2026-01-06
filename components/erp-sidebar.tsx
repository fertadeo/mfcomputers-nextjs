"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import { useRole } from "@/app/hooks/useRole"
import { MENU_GROUPS } from "@/app/config/menu"
import { filterMenuGroupsByRole } from "@/app/lib/menuAuth"
import {
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react"

interface ERPSidebarProps {
  activeItem?: string
  onItemClick?: (itemId: string) => void
}

export function ERPSidebar({ activeItem, onItemClick }: ERPSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const { logout, user } = useAuth()
  const { getCurrentRole, getCurrentRoleLabel } = useRole()
  const router = useRouter()
  const pathname = usePathname()

  // Filtrar grupos del menú según el rol del usuario
  const filteredGroups = filterMenuGroupsByRole(MENU_GROUPS, getCurrentRole())

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-background/80 backdrop-blur-sm border hover:bg-background/90 hover:scale-110 transition-all duration-300 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 shadow-lg",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border bg-sidebar/50">
            {!isCollapsed && (
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
               MF Computers
              </h1>
            )}
            <div className="flex items-center gap-2">
              {/* Theme toggle button */}
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex hover:bg-sidebar-accent hover:scale-110 transition-all duration-300 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
            {filteredGroups.map((group) => {
              const GroupIcon = group.icon
              const isGroupCollapsed = collapsedGroups.has(group.id)
              
              return (
                <div key={group.id} className="space-y-1">
                  {/* Group Header */}
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between gap-2 h-10 px-3 transition-all duration-300 ease-in-out group",
                      "text-muted-foreground hover:text-foreground",
                      "hover:bg-slate-100 dark:hover:bg-slate-700",
                      "focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                    )}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="flex items-center gap-2">
                      <GroupIcon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="text-xs font-semibold uppercase tracking-wider truncate">
                          {group.title}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="transition-transform duration-300">
                        {isGroupCollapsed ? (
                          <ChevronRight className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </Button>

                  {/* Group Items */}
                  {!isGroupCollapsed && (
                    <div className="space-y-1 ml-2">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href

                        return (
                          <Button
                            key={item.id}
                            variant={isActive ? "default" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-3 h-9 transition-all duration-300 ease-in-out group relative overflow-hidden",
                              isActive && "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]",
                              !isActive && [
                                "text-sidebar-foreground",
                                "hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50",
                                "dark:hover:bg-gradient-to-r dark:hover:from-slate-700 dark:hover:to-slate-600",
                                "hover:text-slate-900 dark:hover:text-slate-100",
                                "hover:shadow-md hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
                                "hover:scale-[1.02] hover:translate-x-1",
                                "focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800",
                                "active:scale-[0.98] active:translate-x-0"
                              ],
                              isCollapsed && "px-2"
                            )}
                            onClick={() => {
                              router.push(item.href)
                              onItemClick?.(item.id)
                              setIsMobileOpen(false)
                            }}
                          >
                            <Icon className={cn(
                              "h-4 w-4 flex-shrink-0 transition-all duration-300",
                              isActive && "scale-110",
                              !isActive && "group-hover:scale-110 group-hover:text-primary dark:group-hover:text-primary"
                            )} />
                            {!isCollapsed && (
                              <span className={cn(
                                "truncate font-medium transition-all duration-300",
                                isActive && "font-semibold",
                                !isActive && "group-hover:font-semibold"
                              )}>
                                {item.label}
                              </span>
                            )}
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border bg-sidebar/30 space-y-3">
            {/* Información del usuario */}
            {!isCollapsed && user && (
              <div className="text-xs text-muted-foreground text-center pb-2 border-b border-sidebar-border">
                <div className="font-medium text-foreground">{user.firstName} {user.lastName}</div>
                <div className="text-xs opacity-70">{getCurrentRoleLabel()}</div>
              </div>
            )}

            {/* Botón de Logout */}
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-10 transition-all duration-300 ease-in-out group",
                "text-red-600 hover:text-red-700 hover:bg-red-50",
                "dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20",
                "hover:scale-[1.02] hover:translate-x-1",
                "focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 dark:focus:ring-offset-slate-800",
                isCollapsed && "px-2 justify-center"
              )}
              onClick={logout}
            >
              <LogOut className={cn(
                "h-4 w-4 flex-shrink-0 transition-all duration-300",
                "group-hover:scale-110"
              )} />
              {!isCollapsed && (
                <span className="truncate font-medium transition-all duration-300 group-hover:font-semibold">
                  Cerrar Sesión
                </span>
              )}
            </Button>

            {/* Información de versión */}
            {!isCollapsed && (
              <div className="text-xs text-muted-foreground text-center">
                <div className="font-medium">ERP Demo v1.0</div>
                <div className="text-xs opacity-70">Sistema de Gestión</div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
