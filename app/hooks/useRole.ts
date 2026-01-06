import { useAuth } from "@/contexts/AuthContext"
import type { Role } from "@/app/config/menu"
import { hasAnyRole, hasRole, hasRoleOrHigher } from "@/app/lib/menuAuth"

/**
 * Hook personalizado para trabajar con roles de usuario
 * Proporciona funciones helper para verificar permisos basados en roles
 */
export function useRole() {
  const { user } = useAuth()
  
  const userRole = user?.role as Role | undefined
  
  /**
   * Verifica si el usuario actual tiene un rol específico
   * @param role Rol a verificar
   * @returns true si el usuario tiene el rol especificado
   */
  const isRole = (role: Role): boolean => {
    return hasRole(userRole, role)
  }
  
  /**
   * Verifica si el usuario actual tiene alguno de los roles especificados
   * @param roles Array de roles a verificar
   * @returns true si el usuario tiene alguno de los roles especificados
   */
  const hasAnyOfRoles = (roles: Role[]): boolean => {
    return hasAnyRole(userRole, roles)
  }
  
  /**
   * Verifica si el usuario actual tiene un rol específico o uno de mayor nivel
   * @param role Rol mínimo requerido
   * @returns true si el usuario tiene el rol o uno de mayor nivel
   */
  const isRoleOrHigher = (role: Role): boolean => {
    return hasRoleOrHigher(userRole, role)
  }
  
  /**
   * Verifica si el usuario es administrador
   * @returns true si el usuario es admin
   */
  const isAdmin = (): boolean => {
    return isRole('admin')
  }
  
  /**
   * Verifica si el usuario es de gerencia o superior
   * @returns true si el usuario es de gerencia o admin
   */
  const isManagement = (): boolean => {
    return hasAnyOfRoles(['admin', 'gerencia', 'manager'])
  }
  
  /**
   * Verifica si el usuario puede ver módulos de ventas
   * @returns true si el usuario puede ver ventas
   */
  const canViewSales = (): boolean => {
    return hasAnyOfRoles(['admin', 'gerencia', 'ventas'])
  }
  
  /**
   * Verifica si el usuario puede ver módulos de logística
   * @returns true si el usuario puede ver logística
   */
  const canViewLogistics = (): boolean => {
    return hasAnyOfRoles(['admin', 'gerencia', 'logistica'])
  }
  
  /**
   * Verifica si el usuario puede ver módulos de finanzas
   * @returns true si el usuario puede ver finanzas
   */
  const canViewFinance = (): boolean => {
    return hasAnyOfRoles(['admin', 'gerencia', 'finanzas'])
  }
  
  /**
   * Verifica si el usuario puede ver módulos de administración
   * @returns true si el usuario puede ver administración
   */
  const canViewAdministration = (): boolean => {
    return hasAnyOfRoles(['admin', 'gerencia'])
  }
  
  /**
   * Obtiene el rol actual del usuario
   * @returns El rol actual del usuario o undefined
   */
  const getCurrentRole = (): Role | undefined => {
    return userRole
  }
  
  /**
   * Obtiene el nombre legible del rol actual
   * @returns El nombre legible del rol actual
   */
  const getCurrentRoleLabel = (): string => {
    if (!userRole) return 'Sin rol'
    
    const roleLabels: Record<Role, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      employee: 'Empleado',
      viewer: 'Visualizador',
      gerencia: 'Gerencia',
      ventas: 'Ventas',
      logistica: 'Logística',
      finanzas: 'Finanzas'
    }
    
    return roleLabels[userRole] || userRole
  }
  
  return {
    userRole,
    isRole,
    hasAnyOfRoles,
    isRoleOrHigher,
    isAdmin,
    isManagement,
    canViewSales,
    canViewLogistics,
    canViewFinance,
    canViewAdministration,
    getCurrentRole,
    getCurrentRoleLabel
  }
}
