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

// Funciones auxiliares
const formatDate = (dateString: string) => {
  if (!dateString) return "-"
  try {
    return new Date(dateString).toLocaleDateString('es-AR')
  } catch {
    return dateString
  }
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "completado":
      return "default" as const
    case "en_proceso":
    case "aprobado":
      return "secondary" as const
    case "pendiente_preparacion":
    case "pendiente":
      return "outline" as const
    case "listo_despacho":
      return "secondary" as const
    case "pagado":
      return "default" as const
    case "atrasado":
      return "destructive" as const
    case "cancelado":
    case "cancelled":
      return "destructive" as const
    default:
      return "outline" as const
  }
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
      if (response.success) {
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
      }
    } catch (error) {
      console.error("Error al cargar pedidos:", error)
      toast.error("Error al cargar los pedidos")
    }
  }

  const loadStats = async () => {
    try {
      const response = await getOrderStats()
      if (response.success) {
        setStats(response.data)
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
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
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
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
