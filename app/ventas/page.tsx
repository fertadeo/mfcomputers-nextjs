"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getSales,
  getSalesStats,
  getOrders,
  getOrderStats,
  getSale,
  type Sale,
  type SalesStats,
  type Order,
  type OrderStats,
  type SaleResponseData,
  type SalePaymentMethod,
} from "@/lib/api"
import { SaleDetailModal } from "@/components/sale-detail-modal"
import { OrderDetailModal } from "@/components/order-detail-modal"
import { Pagination } from "@/components/ui/pagination"
import {
  Receipt,
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
  Loader2,
  TrendingUp,
  ExternalLink,
} from "lucide-react"
import { toast } from "sonner"

type OrderStatusFilter =
  | "all"
  | "pendiente_preparacion"
  | "listo_despacho"
  | "pagado"
  | "aprobado"
  | "en_proceso"
  | "completado"
  | "cancelado"

const PAYMENT_METHODS: { value: SalePaymentMethod; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "transferencia", label: "Transferencia" },
  { value: "mixto", label: "Mixto" },
]

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return dateStr
  }
}

function getSyncStatusBadge(sync_status?: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendiente", variant: "secondary" },
    synced: { label: "Sincronizado", variant: "default" },
    error: { label: "Error", variant: "destructive" },
  }
  const s = map[sync_status ?? ""] ?? { label: sync_status ?? "—", variant: "outline" as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function getPaymentLabel(m: SalePaymentMethod) {
  return PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m
}

export default function VentasPage() {
  const [activeTab, setActiveTab] = useState<"pos" | "pedidos">("pos")

  // Ventas POS
  const [sales, setSales] = useState<Sale[]>([])
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null)
  const [salesLoading, setSalesLoading] = useState(true)
  const [salesPage, setSalesPage] = useState(1)
  const [salesTotalPages, setSalesTotalPages] = useState(1)
  const [salesTotal, setSalesTotal] = useState(0)
  const [salesDateFrom, setSalesDateFrom] = useState("")
  const [salesDateTo, setSalesDateTo] = useState("")
  const [salesPaymentMethod, setSalesPaymentMethod] = useState<string>("all")
  const [salesSyncStatus, setSalesSyncStatus] = useState<string>("all")
  const [selectedSale, setSelectedSale] = useState<SaleResponseData | null>(null)
  const [saleDetailOpen, setSaleDetailOpen] = useState(false)

  // Pedidos
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersStats, setOrdersStats] = useState<OrderStats | null>(null)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersTotalPages, setOrdersTotalPages] = useState(1)
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersSearch, setOrdersSearch] = useState("")
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<OrderStatusFilter>("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)

  const loadSales = async () => {
    setSalesLoading(true)
    try {
      const params: Parameters<typeof getSales>[0] = {
        page: salesPage,
        limit: 20,
      }
      if (salesDateFrom) params.date_from = salesDateFrom
      if (salesDateTo) params.date_to = salesDateTo
      if (salesPaymentMethod !== "all") params.payment_method = salesPaymentMethod as SalePaymentMethod
      if (salesSyncStatus !== "all") params.sync_status = salesSyncStatus as "pending" | "synced" | "error"

      const res = await getSales(params)
      // Backend: GET /api/sales devuelve data.sales (array), data.total, data.page, data.limit
      const list = Array.isArray(res.data?.sales) ? res.data.sales : []
      const total = typeof res.data?.total === "number" ? res.data.total : list.length
      const limit = typeof res.data?.limit === "number" ? res.data.limit : params?.limit ?? 20

      setSales(list)
      setSalesTotal(total)
      setSalesTotalPages(Math.max(1, Math.ceil(total / limit)))
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar ventas POS")
      setSales([])
    } finally {
      setSalesLoading(false)
    }
  }

  const loadSalesStats = async () => {
    try {
      const res = await getSalesStats()
      setSalesStats(res.data ?? null)
    } catch {
      setSalesStats(null)
    }
  }

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const params: Parameters<typeof getOrders>[0] = {
        page: ordersPage,
        limit: 20,
      }
      if (ordersSearch) params.search = ordersSearch
      if (ordersStatusFilter !== "all") params.status = ordersStatusFilter

      const res = await getOrders(params)
      const list = res.data?.orders ?? []
      const pagination = res.data?.pagination

      setOrders(list)
      if (pagination) {
        setOrdersTotalPages(pagination.totalPages)
        setOrdersTotal(pagination.total)
      } else {
        setOrdersTotalPages(1)
        setOrdersTotal(list.length)
      }
    } catch (e) {
      console.error(e)
      toast.error("Error al cargar pedidos")
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadOrdersStats = async () => {
    try {
      const res = await getOrderStats()
      setOrdersStats(res.data ?? null)
    } catch {
      setOrdersStats(null)
    }
  }

  useEffect(() => {
    if (activeTab === "pos") {
      loadSales()
    }
  }, [activeTab, salesPage, salesDateFrom, salesDateTo, salesPaymentMethod, salesSyncStatus])

  useEffect(() => {
    if (activeTab === "pedidos") {
      loadOrders()
    }
  }, [activeTab, ordersPage, ordersSearch, ordersStatusFilter])

  useEffect(() => {
    if (activeTab === "pos") loadSalesStats()
    else loadOrdersStats()
  }, [activeTab])

  const openSaleDetail = async (sale: Sale) => {
    try {
      const res = await getSale(sale.id)
      setSelectedSale(res.data)
      setSaleDetailOpen(true)
    } catch (e) {
      toast.error("Error al cargar detalle de la venta")
    }
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
      <ERPLayout activeItem="ventas">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Ventas</h1>
              <p className="text-muted-foreground">
                Todas las ventas: POS (local) y pedidos (WooCommerce y otros canales)
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pos" | "pedidos")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="pos" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Ventas POS
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                Pedidos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pos" className="space-y-4">
              {/* Stats POS */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total ventas</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesStats?.total_sales ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Registros</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monto total</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-turquoise-600">
                      ${(salesStats?.total_amount ?? 0).toLocaleString("es-AR")}
                    </div>
                    <p className="text-xs text-muted-foreground">POS</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ventas hoy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesStats?.sales_today ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Del día</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pend. sincronización</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{salesStats?.pending_sync ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Con WooCommerce</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Listado de ventas POS</CardTitle>
                  <CardDescription>Ventas realizadas en el punto de venta local</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Input
                      type="date"
                      placeholder="Desde"
                      className="w-40"
                      value={salesDateFrom}
                      onChange={(e) => setSalesDateFrom(e.target.value)}
                    />
                    <Input
                      type="date"
                      placeholder="Hasta"
                      className="w-40"
                      value={salesDateTo}
                      onChange={(e) => setSalesDateTo(e.target.value)}
                    />
                    <Select value={salesPaymentMethod} onValueChange={setSalesPaymentMethod}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {PAYMENT_METHODS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={salesSyncStatus} onValueChange={setSalesSyncStatus}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Sincronización" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="synced">Sincronizado</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => loadSales()} disabled={salesLoading}>
                      <RefreshCw className={`h-4 w-4 ${salesLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>

                  {salesLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Cargando ventas...</p>
                    </div>
                  ) : sales.length === 0 ? (
                    <div className="text-center py-12">
                      <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No hay ventas POS con los filtros aplicados</p>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nº Venta</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Método de pago</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Sincronización</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sales.map((s) => (
                            <TableRow
                              key={s.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => openSaleDetail(s)}
                            >
                              <TableCell className="font-medium">{s.sale_number}</TableCell>
                              <TableCell>{formatDate(s.sale_date)}</TableCell>
                              <TableCell>{s.client_name ?? (s.client_id ? `#${s.client_id}` : "—")}</TableCell>
                              <TableCell>{getPaymentLabel(s.payment_method)}</TableCell>
                              <TableCell>
                                ${s.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>{getSyncStatusBadge(s.sync_status)}</TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" onClick={() => openSaleDetail(s)}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {salesTotalPages > 1 && (
                        <div className="mt-4">
                          <Pagination
                            currentPage={salesPage}
                            totalPages={salesTotalPages}
                            onPageChange={setSalesPage}
                            isLoading={salesLoading}
                          />
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        Mostrando {(salesPage - 1) * 20 + 1} - {Math.min(salesPage * 20, salesTotal)} de {salesTotal}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pedidos" className="space-y-4">
              {/* Stats Pedidos */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total pedidos</CardTitle>
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{ordersStats?.total_orders ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Registrados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{ordersStats?.pending_orders ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Requieren atención</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-turquoise-600">{ordersStats?.completed_orders ?? "—"}</div>
                    <p className="text-xs text-muted-foreground">Entregados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monto total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-turquoise-600">
                      ${(ordersStats?.total_amount ?? 0).toLocaleString("es-AR")}
                    </div>
                    <p className="text-xs text-muted-foreground">Pedidos</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Listado de pedidos</CardTitle>
                    <CardDescription>Pedidos WooCommerce, mayorista y locales (no cobrados en caja POS)</CardDescription>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/pedidos">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ir a Pedidos
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar pedidos..."
                        className="pl-8"
                        value={ordersSearch}
                        onChange={(e) => setOrdersSearch(e.target.value)}
                      />
                    </div>
                    <Select value={ordersStatusFilter} onValueChange={(v) => setOrdersStatusFilter(v as OrderStatusFilter)}>
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="pendiente_preparacion">Pendiente preparación</SelectItem>
                        <SelectItem value="en_proceso">En proceso</SelectItem>
                        <SelectItem value="completado">Completado</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => loadOrders()} disabled={ordersLoading}>
                      <RefreshCw className={`h-4 w-4 ${ordersLoading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>

                  {ordersLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Cargando pedidos...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12">
                      <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No hay pedidos con los filtros aplicados</p>
                      <Button asChild variant="link" className="mt-2">
                        <Link href="/pedidos">Abrir módulo de Pedidos</Link>
                      </Button>
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
                            <TableHead>Total</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((o) => (
                            <TableRow
                              key={o.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                setSelectedOrder(o)
                                setOrderDetailOpen(true)
                              }}
                            >
                              <TableCell className="font-medium">
                                {o.order_number ?? `PED-${o.id}`}
                              </TableCell>
                              <TableCell>{o.client_name ?? `#${o.client_id}`}</TableCell>
                              <TableCell>{formatDate(o.order_date ?? o.created_at)}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{o.status ?? "—"}</Badge>
                              </TableCell>
                              <TableCell>
                                $
                                {typeof o.total_amount === "number"
                                  ? o.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })
                                  : String(o.total_amount ?? "0")}
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(o)
                                    setOrderDetailOpen(true)
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
                      {ordersTotalPages > 1 && (
                        <div className="mt-4">
                          <Pagination
                            currentPage={ordersPage}
                            totalPages={ordersTotalPages}
                            onPageChange={setOrdersPage}
                            isLoading={ordersLoading}
                          />
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        Mostrando {(ordersPage - 1) * 20 + 1} - {Math.min(ordersPage * 20, ordersTotal)} de {ordersTotal}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <SaleDetailModal
          sale={selectedSale}
          isOpen={saleDetailOpen}
          onClose={() => {
            setSaleDetailOpen(false)
            setSelectedSale(null)
          }}
        />
        <OrderDetailModal
          order={selectedOrder}
          isOpen={orderDetailOpen}
          onClose={() => {
            setOrderDetailOpen(false)
            setSelectedOrder(null)
          }}
          onStatusUpdate={() => loadOrders()}
        />
      </ERPLayout>
    </Protected>
  )
}
