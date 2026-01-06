"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { canAccessRoute } from "@/app/lib/menuAuth"
import { MENU_GROUPS } from "@/app/config/menu"
import type { Role } from "@/app/config/menu"

interface ProtectedProps {
  children: React.ReactNode
  requiredRoles?: Role[]
  fallback?: React.ReactNode
  redirectTo?: string
}

/**
 * Componente que protege el contenido basado en roles de usuario
 * Redirige a login si no está autenticado o a 403 si no tiene permisos
 */
export function Protected({ 
  children, 
  requiredRoles, 
  fallback = null,
  redirectTo 
}: ProtectedProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // No hacer nada si aún está cargando
    if (isLoading) return

    // Si no está autenticado, redirigir al login
    if (!isAuthenticated || !user) {
      console.log('🔒 [PROTECTED] Usuario no autenticado, redirigiendo al login')
      router.replace('/login')
      return
    }

    // Si no se especifican roles requeridos, permitir acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      console.log('🔒 [PROTECTED] Sin roles requeridos, permitiendo acceso')
      return
    }

    const userRole = user.role as Role
    
    // Verificar si el usuario tiene alguno de los roles requeridos
    const hasAccess = requiredRoles.includes(userRole)
    
    if (!hasAccess) {
      console.log('🔒 [PROTECTED] Usuario sin permisos:', { 
        userRole, 
        requiredRoles,
        user: user.username 
      })
      router.replace(redirectTo || '/403')
      return
    }

    console.log('✅ [PROTECTED] Usuario autorizado:', { 
      userRole, 
      requiredRoles,
      user: user.username 
    })
  }, [isAuthenticated, isLoading, user, requiredRoles, router, redirectTo])

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Si no está autenticado, no mostrar nada (se redirigirá)
  if (!isAuthenticated || !user) {
    return fallback
  }

  // Si hay roles requeridos, verificar permisos
  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = user.role as Role
    if (!requiredRoles.includes(userRole)) {
      return fallback
    }
  }

  // Si todo está bien, mostrar el contenido
  return <>{children}</>
}

/**
 * Hook para verificar si el usuario puede acceder a una ruta específica
 * @param route Ruta a verificar
 * @returns true si el usuario puede acceder a la ruta
 */
export function useRouteAccess(route: string): boolean {
  const { isAuthenticated, user } = useAuth()
  const { getCurrentRole } = useRole()
  
  if (!isAuthenticated || !user) {
    return false
  }
  
  const userRole = getCurrentRole()
  if (!userRole) {
    return false
  }
  
  return canAccessRoute(route, userRole, MENU_GROUPS)
}

/**
 * Componente que protege el contenido basado en una ruta específica
 * Útil para proteger páginas individuales
 */
interface ProtectedRouteProps {
  children: React.ReactNode
  route: string
  fallback?: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  route, 
  fallback = null,
  redirectTo 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const { getCurrentRole } = useRole()
  const router = useRouter()

  useEffect(() => {
    // No hacer nada si aún está cargando
    if (isLoading) return

    // Si no está autenticado, redirigir al login
    if (!isAuthenticated || !user) {
      console.log('🔒 [PROTECTED_ROUTE] Usuario no autenticado, redirigiendo al login')
      router.replace('/login')
      return
    }

    const userRole = getCurrentRole()
    
    // Si no se puede determinar el rol del usuario, denegar acceso
    if (!userRole) {
      console.log('🔒 [PROTECTED_ROUTE] No se pudo determinar el rol del usuario')
      router.replace('/403')
      return
    }

    // Verificar si el usuario puede acceder a la ruta
    const hasAccess = canAccessRoute(route, userRole, MENU_GROUPS)
    
    if (!hasAccess) {
      console.log('🔒 [PROTECTED_ROUTE] Usuario sin permisos para la ruta:', { 
        route,
        userRole, 
        user: user.username 
      })
      router.replace(redirectTo || '/403')
      return
    }

    console.log('✅ [PROTECTED_ROUTE] Usuario autorizado para la ruta:', { 
      route,
      userRole, 
      user: user.username 
    })
  }, [isAuthenticated, isLoading, user, route, router, getCurrentRole, redirectTo])

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Si no está autenticado, no mostrar nada (se redirigirá)
  if (!isAuthenticated || !user) {
    return fallback
  }

  // Verificar acceso a la ruta
  const userRole = getCurrentRole()
  if (!userRole || !canAccessRoute(route, userRole, MENU_GROUPS)) {
    return fallback
  }

  // Si todo está bien, mostrar el contenido
  return <>{children}</>
}
