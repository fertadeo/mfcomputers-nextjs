import {
  Package,
  Users,
  DollarSign,
  Factory,
  UserCheck,
  ShoppingCart,
  ClipboardList,
  Store,
  FileText,
  BarChart3,
  Calculator,
  Building2,
  Truck,
  Settings,
  PackageCheck,
  Shield,
  Boxes,
  FolderTree,
  BookText,
  PenLine,
  BookOpen,
  ListOrdered,
  CalendarDays,
} from "lucide-react"

// Definición de roles disponibles según el backend
export type Role = 
  | 'admin' 
  | 'manager' 
  | 'employee' 
  | 'viewer' 
  | 'gerencia' 
  | 'ventas' 
  | 'logistica' 
  | 'finanzas'

// Interfaz para items del menú
export interface MenuItem {
  id: string
  label: string
  href: string
  icon: any // Componente de icono de Lucide
  requiredRoles?: Role[]
  children?: MenuItem[]
}

// Interfaz para grupos del menú
export interface MenuGroup {
  id: string
  title: string
  icon: any // Componente de icono de Lucide
  requiredRoles?: Role[]
  items: MenuItem[]
}

// Configuración del menú con roles requeridos según las reglas del backend
export const MENU_GROUPS: MenuGroup[] = [
  {
    id: "principal",
    title: "Principal",
    icon: BarChart3,
    requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas', 'admin', 'manager', 'viewer'],
    items: [
      { 
        id: "dashboard", 
        label: "Dashboard", 
        icon: BarChart3, 
        href: "/dashboard",
        requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas', 'admin', 'manager', 'viewer']
      },
      { 
        id: "caja", 
        label: "Caja", 
        icon: DollarSign, 
        href: "/caja",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
    ]
  },
  {
    id: "inventario",
    title: "Inventario",
    icon: Package,
    requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas'],
    items: [
      { 
        id: "productos", 
        label: "Productos", 
        icon: Package, 
        href: "/productos",
        requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas']
      },
      // { 
      //   id: "categorias", 
      //   label: "Categorías", 
      //   icon: FolderTree, 
      //   href: "/categorias",
      //   requiredRoles: ['gerencia', 'ventas', 'logistica', 'finanzas']
      // },
      // { 
      //   id: "stock", 
      //   label: "Stock", 
      //   icon: Package, 
      //   href: "/stock",
      //   requiredRoles: ['gerencia', 'logistica', 'admin']
      // },
      { 
        id: "compras", 
        label: "Compras", 
        icon: ShoppingCart, 
        href: "/compras",
        requiredRoles: ['gerencia', 'finanzas', 'admin']
      },
    ]
  },
  {
    id: "ventas",
    title: "Ventas",
    icon: Users,
    requiredRoles: ['gerencia', 'ventas', 'admin'],
    items: [
      { 
        id: "clientes", 
        label: "Clientes", 
        icon: Users, 
        href: "/clientes",
        requiredRoles: ['gerencia', 'ventas', 'admin']
      },
      { 
        id: "pedidos", 
        label: "Pedidos", 
        icon: ClipboardList, 
        href: "/pedidos",
        requiredRoles: ['gerencia', 'ventas', 'admin']
      },
      { 
        id: "presupuestos", 
        label: "Presupuestos", 
        icon: Calculator, 
        href: "/presupuestos",
        requiredRoles: ['gerencia', 'ventas', 'admin']
      },
      { 
        id: "tienda", 
        label: "Tienda", 
        icon: Store, 
        href: "/tienda",
        requiredRoles: ['gerencia', 'ventas', 'admin']
      },
    ]
  },
  // {
  //   id: "contabilidad",
  //   title: "Contabilidad",
  //   icon: BookText,
  //   requiredRoles: ['gerencia', 'finanzas', 'admin'],
  //   items: [
  //     {
  //       id: "contabilidad-inicio",
  //       label: "Inicio",
  //       icon: BookText,
  //       href: "/contabilidad",
  //       requiredRoles: ['gerencia', 'finanzas', 'admin']
  //     },
  //     {
  //       id: "asientos-manuales",
  //       label: "Asientos manuales",
  //       icon: PenLine,
  //       href: "/contabilidad/asientos",
  //       requiredRoles: ['gerencia', 'finanzas', 'admin']
  //     },
  //     {
  //       id: "asientos-nuevo",
  //       label: "Nuevo asiento",
  //       icon: PenLine,
  //       href: "/contabilidad/asientos/nuevo",
  //       requiredRoles: ['gerencia', 'finanzas', 'admin']
  //     },
  //     {
  //       id: "libro-diario",
  //       label: "Libro diario",
  //       icon: BookOpen,
  //       href: "/contabilidad/libro-diario",
  //       requiredRoles: ['gerencia', 'finanzas', 'admin']
  //     },
  //     {
  //       id: "libro-mayor",
  //       label: "Libro mayor",
  //       icon: BookOpen,
  //       href: "/contabilidad/libro-mayor",
  //       requiredRoles: ['gerencia', 'finanzas', 'admin']
  //     },
  //     {
  //       id: "plan-cuentas",
  //       label: "Plan de cuentas",
  //       icon: ListOrdered,
  //       href: "/contabilidad/plan-cuentas",
  //       requiredRoles: ['gerencia', 'finanzas', 'admin']
  //     },
  //     {
  //       id: "ejercicios-contables",
  //       label: "Ejercicios contables",
  //       icon: CalendarDays,
  //       href: "/contabilidad/ejercicios",
  //       requiredRoles: ['gerencia', 'finanzas', 'admin']
  //     },
  //     {
  //       id: "reportes-contables",
  //       label: "Reportes",
  //       icon: BarChart3,
  //       href: "/contabilidad/reportes",
  //       requiredRoles: ['gerencia', 'finanzas', 'admin']
  //     },
  //   ]
  // },
  {
    id: "administracion",
    title: "Administración",
    icon: Settings,
    requiredRoles: ['admin', 'gerencia'], // Solo admin y gerencia pueden ver administración
    items: [
      { 
        id: "proveedores", 
        label: "Proveedores", 
        icon: Truck, 
        href: "/proveedores",
        requiredRoles: ['admin', 'gerencia']
      },
      { 
        id: "bancos", 
        label: "Bancos", 
        icon: Building2, 
        href: "/bancos",
        requiredRoles: ['admin', 'gerencia']
      },
      { 
        id: "configuracion", 
        label: "Configuración", 
        icon: Shield, 
        href: "/configuracion",
        requiredRoles: ['admin', 'gerencia'] // Admin y gerencia pueden gestionar roles y permisos
      },
    ]
  }
]

// Función helper para verificar si un rol tiene acceso a un item
export function hasRoleAccess(userRole: Role | undefined, requiredRoles?: Role[]): boolean {
  if (!userRole) return false
  if (!requiredRoles || requiredRoles.length === 0) return true
  return requiredRoles.includes(userRole)
}

// Función helper para verificar si un rol tiene acceso a un grupo
export function hasGroupAccess(userRole: Role | undefined, requiredRoles?: Role[]): boolean {
  return hasRoleAccess(userRole, requiredRoles)
}

// Mapeo de roles a nombres legibles en español
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  employee: 'Empleado',
  viewer: 'Visualizador',
  gerencia: 'Gerencia',
  ventas: 'Ventas',
  logistica: 'Logística',
  finanzas: 'Finanzas'
}
