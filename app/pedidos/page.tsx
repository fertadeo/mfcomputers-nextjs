"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NewOrderModal } from "@/components/new-order-modal"
import { ClipboardList, Search, Plus, Clock, CheckCircle, AlertTriangle, Filter, Download, Eye, RefreshCw } from "lucide-react"
import { 
  getOrders, 
  getOrderStats, 
  type Order, 
  type OrderStats 
} from "@/lib/api"
import { toast } from "sonner"
import { OrderDetailModal } from "@/components/order-detail-modal"

// Datos hardcodeados para desarrollo/demo
const MOCK_ORDERS: Order[] = [
  {
    id: 1001,
    order_number: "PED-2024-001",
    client_id: 1,
    client_name: "Juan Pérez",
    client_email: "juan.perez@email.com",
    order_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "en_proceso",
    total_amount: 125000.50,
    items_count: 3,
    priority: "Alta",
    canal_venta: "local",
    currency: "ARS",
    delivery_address: "Av. Corrientes 1234",
    delivery_city: "Buenos Aires",
    delivery_phone: "+54 11 1234-5678",
    transport_company: "OCA",
    payment_method_title: "Transferencia bancaria",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    json: {
      number: "PED-2024-001",
      status: "processing",
      total: "125000.50",
      currency: "ARS",
      date_created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      billing: {
        first_name: "Juan",
        last_name: "Pérez",
        email: "juan.perez@email.com",
        phone: "+54 11 1234-5678",
        address_1: "Av. Corrientes 1234",
        city: "Buenos Aires",
        state: "CABA",
        postcode: "C1043",
        country: "AR"
      },
      shipping: {
        first_name: "Juan",
        last_name: "Pérez",
        address_1: "Av. Corrientes 1234",
        city: "Buenos Aires",
        state: "CABA",
        postcode: "C1043",
        country: "AR"
      },
      line_items: [
        {
          id: 1,
          name: "Notebook Dell Inspiron 15",
          sku: "DELL-INS15-001",
          quantity: 1,
          price: "85000.00",
          total: "85000.00"
        },
        {
          id: 2,
          name: "Mouse Logitech MX Master",
          sku: "LOG-MX-001",
          quantity: 2,
          price: "15000.00",
          total: "30000.00"
        },
        {
          id: 3,
          name: "Teclado Mecánico RGB",
          sku: "TEC-RGB-001",
          quantity: 1,
          price: "10000.50",
          total: "10000.50"
        }
      ],
      shipping_lines: [
        {
          id: 1,
          method_title: "OCA - Envío Estándar",
          total: "0.00"
        }
      ],
      payment_method_title: "Transferencia bancaria"
    }
  },
  {
    id: 1002,
    order_number: "WC-2024-0456",
    woocommerce_order_id: 456,
    client_id: 2,
    client_name: "María González",
    client_email: "maria.gonzalez@email.com",
    order_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pendiente_preparacion",
    total_amount: 45000.00,
    items_count: 2,
    priority: "Normal",
    canal_venta: "woocommerce",
    currency: "ARS",
    delivery_address: "Calle Falsa 456",
    delivery_city: "Córdoba",
    delivery_phone: "+54 351 123-4567",
    transport_company: "Andreani",
    payment_method_title: "Tarjeta de crédito",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    json: {
      number: "456",
      status: "on-hold",
      total: "45000.00",
      currency: "ARS",
      date_created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      date_paid: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      billing: {
        first_name: "María",
        last_name: "González",
        email: "maria.gonzalez@email.com",
        phone: "+54 351 123-4567",
        address_1: "Calle Falsa 456",
        city: "Córdoba",
        state: "Córdoba",
        postcode: "5000",
        country: "AR"
      },
      shipping: {
        first_name: "María",
        last_name: "González",
        address_1: "Calle Falsa 456",
        city: "Córdoba",
        state: "Córdoba",
        postcode: "5000",
        country: "AR",
        phone: "+54 351 123-4567"
      },
      line_items: [
        {
          id: 1,
          name: "Monitor LG 24 pulgadas",
          sku: "LG-24-001",
          quantity: 1,
          price: "35000.00",
          total: "35000.00"
        },
        {
          id: 2,
          name: "Webcam Logitech C920",
          sku: "LOG-C920",
          quantity: 1,
          price: "10000.00",
          total: "10000.00"
        }
      ],
      shipping_lines: [
        {
          id: 1,
          method_title: "Andreani - Envío Estándar",
          total: "0.00"
        }
      ],
      payment_method_title: "Tarjeta de crédito",
      transaction_id: "TXN-2024-0456"
    }
  },
  {
    id: 1003,
    order_number: "PED-2024-002",
    client_id: 3,
    client_name: "Carlos Rodríguez",
    client_email: "carlos.rodriguez@email.com",
    order_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    delivery_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "completado",
    total_amount: 78000.75,
    items_count: 4,
    priority: "Normal",
    canal_venta: "local",
    currency: "ARS",
    delivery_address: "Av. Santa Fe 789",
    delivery_city: "Buenos Aires",
    delivery_phone: "+54 11 9876-5432",
    transport_company: "Correo Argentino",
    payment_method_title: "Efectivo",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    json: {
      number: "PED-2024-002",
      status: "completed",
      total: "78000.75",
      currency: "ARS",
      date_created: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      date_paid: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      billing: {
        first_name: "Carlos",
        last_name: "Rodríguez",
        email: "carlos.rodriguez@email.com",
        phone: "+54 11 9876-5432",
        address_1: "Av. Santa Fe 789",
        city: "Buenos Aires",
        state: "CABA",
        postcode: "C1059",
        country: "AR"
      },
      shipping: {
        first_name: "Carlos",
        last_name: "Rodríguez",
        address_1: "Av. Santa Fe 789",
        city: "Buenos Aires",
        state: "CABA",
        postcode: "C1059",
        country: "AR"
      },
      line_items: [
        {
          id: 1,
          name: "SSD Samsung 500GB",
          sku: "SAM-SSD-500",
          quantity: 2,
          price: "25000.00",
          total: "50000.00"
        },
        {
          id: 2,
          name: "Memoria RAM 8GB DDR4",
          sku: "RAM-8GB-DDR4",
          quantity: 2,
          price: "14000.00",
          total: "28000.75"
        }
      ],
      shipping_lines: [
        {
          id: 1,
          method_title: "Correo Argentino",
          total: "0.00"
        }
      ],
      payment_method_title: "Efectivo"
    }
  },
  {
    id: 1004,
    order_number: "WC-2024-0457",
    woocommerce_order_id: 457,
    client_id: 4,
    client_name: "Ana Martínez",
    client_email: "ana.martinez@email.com",
    order_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "atrasado",
    total_amount: 95000.00,
    items_count: 1,
    priority: "Crítica",
    canal_venta: "woocommerce",
    currency: "ARS",
    delivery_address: "Av. Libertador 321",
    delivery_city: "Rosario",
    delivery_phone: "+54 341 456-7890",
    transport_company: "OCA",
    payment_method_title: "Mercado Pago",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    json: {
      number: "457",
      status: "processing",
      total: "95000.00",
      currency: "ARS",
      date_created: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      billing: {
        first_name: "Ana",
        last_name: "Martínez",
        email: "ana.martinez@email.com",
        phone: "+54 341 456-7890",
        address_1: "Av. Libertador 321",
        city: "Rosario",
        state: "Santa Fe",
        postcode: "2000",
        country: "AR"
      },
      shipping: {
        first_name: "Ana",
        last_name: "Martínez",
        address_1: "Av. Libertador 321",
        city: "Rosario",
        state: "Santa Fe",
        postcode: "2000",
        country: "AR"
      },
      line_items: [
        {
          id: 1,
          name: "Notebook HP Pavilion 15",
          sku: "HP-PAV15-001",
          quantity: 1,
          price: "95000.00",
          total: "95000.00"
        }
      ],
      shipping_lines: [
        {
          id: 1,
          method_title: "OCA - Envío Express",
          total: "0.00"
        }
      ],
      payment_method_title: "Mercado Pago",
      transaction_id: "MP-2024-0457"
    }
  },
  {
    id: 1005,
    order_number: "PED-2024-003",
    client_id: 5,
    client_name: "Roberto Silva",
    client_email: "roberto.silva@email.com",
    order_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "listo_despacho",
    total_amount: 32000.00,
    items_count: 2,
    priority: "Normal",
    canal_venta: "local",
    currency: "ARS",
    delivery_address: "Calle Mitre 567",
    delivery_city: "La Plata",
    delivery_phone: "+54 221 789-0123",
    transport_company: "Andreani",
    payment_method_title: "Transferencia bancaria",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    json: {
      number: "PED-2024-003",
      status: "processing",
      total: "32000.00",
      currency: "ARS",
      date_created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      billing: {
        first_name: "Roberto",
        last_name: "Silva",
        email: "roberto.silva@email.com",
        phone: "+54 221 789-0123",
        address_1: "Calle Mitre 567",
        city: "La Plata",
        state: "Buenos Aires",
        postcode: "1900",
        country: "AR"
      },
      shipping: {
        first_name: "Roberto",
        last_name: "Silva",
        address_1: "Calle Mitre 567",
        city: "La Plata",
        state: "Buenos Aires",
        postcode: "1900",
        country: "AR"
      },
      line_items: [
        {
          id: 1,
          name: "Auriculares Sony WH-1000XM4",
          sku: "SONY-WH1000",
          quantity: 1,
          price: "20000.00",
          total: "20000.00"
        },
        {
          id: 2,
          name: "Cable USB-C 2m",
          sku: "CAB-USB-C-2M",
          quantity: 2,
          price: "6000.00",
          total: "12000.00"
        }
      ],
      shipping_lines: [
        {
          id: 1,
          method_title: "Andreani - Envío Estándar",
          total: "0.00"
        }
      ],
      payment_method_title: "Transferencia bancaria"
    }
  }
]

const MOCK_STATS: OrderStats = {
  total_orders: 5,
  pending_orders: 2,
  completed_orders: 1,
  delayed_orders: 1,
  total_amount: 375000.25,
  average_amount: 75000.05
}

// Funciones auxiliares
const formatDate = (dateString: string) => {
  if (!dateString) return "-"
  try {
    return new Date(dateString).toLocaleDateString('es-AR')
  } catch {
    return dateString
  }
}

// Colores de WooCommerce para estados
const getStatusBadgeStyle = (status: string) => {
  const statusLower = status.toLowerCase()
  
  // Mapeo de estados locales a estados WooCommerce
  const statusMap: Record<string, { bgColor: string; textColor: string; borderColor?: string }> = {
    // Estados WooCommerce directos
    "pending": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7" },
    "processing": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "on-hold": { bgColor: "#f8dda7", textColor: "#94660c", borderColor: "#f0b849" },
    "completed": { bgColor: "#c8e6c9", textColor: "#155724", borderColor: "#46b450" },
    "cancelled": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#dc3232" },
    "refunded": { bgColor: "#e5e5e5", textColor: "#777", borderColor: "#999" },
    "failed": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#a00" },
    
    // Estados locales mapeados a WooCommerce
    "pendiente": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7" },
    "pendiente_preparacion": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7" },
    "en_proceso": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "aprobado": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "listo_despacho": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "pagado": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a" },
    "completado": { bgColor: "#c8e6c9", textColor: "#155724", borderColor: "#46b450" },
    "cancelado": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#dc3232" },
    "atrasado": { bgColor: "#f8dda7", textColor: "#94660c", borderColor: "#f0b849" },
  }
  
  return statusMap[statusLower] || { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7" }
}

const getStatusBadgeVariant = (status: string) => {
  // Mantener compatibilidad con el sistema de variantes, pero usaremos estilos personalizados
  return "outline" as const
}

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    "pendiente_preparacion": "Pendiente Preparación",
    "listo_despacho": "Listo Despacho",
    "pagado": "Pagado",
    "aprobado": "Aprobado",
    "pendiente": "Pendiente",
    "en_proceso": "En Proceso",
    "completado": "Completado",
    "atrasado": "Atrasado",
    "cancelado": "Cancelado",
    "cancelled": "Cancelado"
  }
  return statusMap[status] || status
}

const getPriorityBadgeVariant = (priority?: string) => {
  switch (priority) {
    case "Crítica":
      return "destructive" as const
    case "Alta":
      return "secondary" as const
    default:
      return "outline" as const
  }
}

const getSalesChannelLabel = (channel?: string) => {
  const channelMap: Record<string, string> = {
    "woocommerce": "WooCommerce",
    "local": "Venta en Local",
    "woocommerce_minorista": "WooCommerce", // Compatibilidad con datos antiguos
    "sistema_mf": "Venta en Local",
    "sistema_principal": "Venta en Local",
    "manual": "Venta en Local",
    "mercadolibre": "MercadoLibre",
    "otro": "Otro"
  }
  return channelMap[channel || ""] || "-"
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Cargar datos iniciales
  useEffect(() => {
    loadData()
  }, [])

  // Cargar pedidos cuando cambien los filtros
  useEffect(() => {
    loadOrders()
  }, [searchTerm, statusFilter, currentPage])

  const loadData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadOrders(),
        loadStats()
      ])
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar los datos")
    } finally {
      setIsLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      const params: any = {
        page: currentPage,
        limit: 10
      }

      if (searchTerm) params.search = searchTerm
      if (statusFilter !== "all") params.status = statusFilter

      const response = await getOrders(params)
      
      // Verificar si hay datos reales de la BD
      const hasRealData = response.success && response.data.orders && response.data.orders.length > 0
      
      if (hasRealData) {
        // Usar datos reales de la BD
        setOrders(response.data.orders)
        // La respuesta puede tener pagination o solo total
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages)
        } else if (response.data.total) {
          // Calcular totalPages basado en total y limit
          const limit = params.limit || 10
          setTotalPages(Math.ceil(response.data.total / limit))
        } else {
          setTotalPages(1)
        }
      } else {
        // Usar datos hardcodeados cuando no hay datos de la BD
        let filteredOrders = [...MOCK_ORDERS]
        
        // Aplicar filtro de búsqueda
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          filteredOrders = filteredOrders.filter(order => 
            order.order_number?.toLowerCase().includes(searchLower) ||
            order.client_name?.toLowerCase().includes(searchLower) ||
            order.client_email?.toLowerCase().includes(searchLower)
          )
        }
        
        // Aplicar filtro de estado
        if (statusFilter !== "all") {
          filteredOrders = filteredOrders.filter(order => order.status === statusFilter)
        }
        
        // Aplicar paginación
        const limit = params.limit || 10
        const startIndex = (currentPage - 1) * limit
        const endIndex = startIndex + limit
        const paginatedOrders = filteredOrders.slice(startIndex, endIndex)
        
        setOrders(paginatedOrders)
        setTotalPages(Math.ceil(filteredOrders.length / limit))
      }
    } catch (error) {
      console.error("Error al cargar pedidos:", error)
      // En caso de error, usar datos hardcodeados
      const limit = 10
      const startIndex = (currentPage - 1) * limit
      const endIndex = startIndex + limit
      setOrders(MOCK_ORDERS.slice(startIndex, endIndex))
      setTotalPages(Math.ceil(MOCK_ORDERS.length / limit))
    }
  }

  const loadStats = async () => {
    try {
      const response = await getOrderStats()
      
      // Verificar si hay datos reales de la BD
      const hasRealData = response.success && response.data && response.data.total_orders > 0
      
      if (hasRealData) {
        // Usar datos reales de la BD
        setStats(response.data)
      } else {
        // Usar datos hardcodeados cuando no hay datos de la BD
        setStats(MOCK_STATS)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
      // En caso de error, usar datos hardcodeados
      setStats(MOCK_STATS)
    }
  }

  return (
    <Protected requiredRoles={['gerencia', 'ventas', 'admin']}>
      <ERPLayout activeItem="pedidos">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Pedidos</h1>
            <p className="text-muted-foreground">Administra y rastrea todos los pedidos de clientes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setIsNewOrderOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pedido
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : stats?.total_orders.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {isLoading ? "..." : stats?.pending_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <CheckCircle className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">
                {isLoading ? "..." : stats?.completed_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats && stats.total_orders > 0 
                  ? `${Math.round((stats.completed_orders / stats.total_orders) * 100)}% del total`
                  : "0% del total"
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {isLoading ? "..." : stats?.delayed_orders || 0}
              </div>
              <p className="text-xs text-muted-foreground">Acción requerida</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Pedidos</CardTitle>
            <CardDescription>Todos los pedidos ordenados por fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar pedidos..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente_preparacion">Pendiente Preparación</SelectItem>
                  <SelectItem value="listo_despacho">Listo Despacho</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="en_proceso">En Proceso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-turquoise-600 mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Cargando pedidos...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No se encontraron pedidos</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Canal de Venta</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow 
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedOrder(order)
                          setIsDetailModalOpen(true)
                        }}
                      >
                        <TableCell className="font-medium">
                          {order.order_number || `PED${order.id.toString().padStart(3, '0')}`}
                        </TableCell>
                        <TableCell>{order.client_name || `Cliente #${order.client_id}`}</TableCell>
                        <TableCell>{formatDate(order.order_date)}</TableCell>
                        <TableCell>
                          {(() => {
                            const style = getStatusBadgeStyle(order.status)
                            return (
                              <Badge 
                                variant="outline"
                                className="font-medium border-2"
                                style={{
                                  backgroundColor: style.bgColor,
                                  color: style.textColor,
                                  borderColor: style.borderColor || style.bgColor,
                                }}
                              >
                                {getStatusLabel(order.status)}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getSalesChannelLabel(order.canal_venta || order.sales_channel)}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.items_count || 0}</TableCell>
                        <TableCell>
                          ${typeof order.total_amount === 'string' 
                            ? parseFloat(order.total_amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })
                            : order.total_amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })
                          }
                        </TableCell>
                        <TableCell>{formatDate(order.delivery_date || "")}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityBadgeVariant(order.priority)}>
                            {order.priority || "Normal"}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order)
                              setIsDetailModalOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || isLoading}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || isLoading}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Modal de Nuevo Pedido */}
        <NewOrderModal
          isOpen={isNewOrderOpen}
          onClose={() => setIsNewOrderOpen(false)}
          onSuccess={() => {
            setIsNewOrderOpen(false)
            loadData()
            toast.success("Pedido creado exitosamente")
          }}
        />

        {/* Modal de Detalles del Pedido */}
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false)
            setSelectedOrder(null)
          }}
        />
      </ERPLayout>
    </Protected>
  )
}
