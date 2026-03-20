"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getRepairOrders,
  getRepairOrder,
  getRepairOrderStats,
  REPAIR_ORDER_STATUS_LABELS,
  type RepairOrder,
  type RepairOrderStatus,
  type RepairOrderStats,
} from "@/lib/api"
import { NewRepairOrderModal } from "@/components/new-repair-order-modal"
import { Wrench, Plus, Search, RefreshCw, Eye, Calendar } from "lucide-react"
import { toast } from "sonner"
import { Pagination } from "@/components/ui/pagination"

const STATUS_OPTIONS: { value: "" | RepairOrderStatus; label: string }[] = [
  { value: "", label: "Todos los estados" },
  ...(Object.entries(REPAIR_ORDER_STATUS_LABELS).map(([value, label]) => ({
    value: value as RepairOrderStatus,
    label,
  }))),
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatMoney(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function getStatusVariant(
  status: RepairOrderStatus
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "entregado":
      return "default"
    case "cancelado":
      return "destructive"
    case "consulta_recibida":
    case "presupuestado":
      return "secondary"
    default:
      return "outline"
  }
}

function getStatusClassName(status: RepairOrderStatus): string {
  switch (status) {
    case "consulta_recibida":
      return "bg-sky-100 text-sky-800 border-sky-200"
    case "presupuestado":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "aceptado":
      return "bg-indigo-100 text-indigo-800 border-indigo-200"
    case "en_proceso_reparacion":
      return "bg-violet-100 text-violet-800 border-violet-200"
    case "listo_entrega":
      return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "entregado":
      return "bg-green-100 text-green-800 border-green-200"
    case "cancelado":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return ""
  }
}

export default function ReparacionesPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<RepairOrder[]>([])
  const [stats, setStats] = useState<RepairOrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [limit] = useState(20)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [onlyPending, setOnlyPending] = useState(false)
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [clientNameById, setClientNameById] = useState<Record<number, string>>({})

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params: Parameters<typeof getRepairOrders>[0] = {
        page,
        limit,
      }
      if (statusFilter) params.status = statusFilter as RepairOrderStatus
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo

      const res = await getRepairOrders(params)
      const data = res.data as { repair_orders?: RepairOrder[]; total?: number; page?: number }
      const list = data?.repair_orders ?? []
      setOrders(list)
      setTotal(typeof data?.total === "number" ? data.total : list.length)
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 401) {
        toast.error("Sesión expirada. Volvé a iniciar sesión.")
        router.replace("/login")
        return
      }
      if (err?.status === 403) {
        toast.error("No tenés permiso para ver órdenes de reparación.")
        router.replace("/403")
        return
      }
      toast.error(err?.message ?? "Error al cargar órdenes de reparación")
      setOrders([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await getRepairOrderStats()
      setStats(res.data ?? null)
    } catch {
      setStats(null)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [page, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    const missingClientOrderIds = orders
      .filter((order) => !order.client?.name && !clientNameById[order.client_id])
      .map((order) => order.id)
    if (missingClientOrderIds.length === 0) return

    let active = true
    Promise.allSettled(missingClientOrderIds.map((orderId) => getRepairOrder(orderId)))
      .then((results) => {
        if (!active) return
        const next: Record<number, string> = {}
        results.forEach((result) => {
          if (result.status !== "fulfilled") return
          const order = result.value?.data
          if (order?.client_id && order.client?.name) {
            next[order.client_id] = order.client.name
          }
        })
        if (Object.keys(next).length > 0) {
          setClientNameById((prev) => ({ ...prev, ...next }))
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [orders, clientNameById])

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredOrders = orders.filter((order) => {
    const statusMatches = onlyPending
      ? order.status !== "entregado" && order.status !== "cancelado"
      : true
    if (!statusMatches) return false
    if (!normalizedSearch) return true
    const searchable = [
      order.repair_number,
      order.client?.name,
      order.equipment_description,
      REPAIR_ORDER_STATUS_LABELS[order.status],
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return searchable.includes(normalizedSearch)
  })

  const handleNewOrderSuccess = (createdId?: number) => {
    setNewOrderOpen(false)
    loadOrders()
    if (createdId) router.push(`/reparaciones/${createdId}`)
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
      <ERPLayout activeItem="reparaciones">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Órdenes de reparación</h1>
              <p className="text-muted-foreground">
                Gestión de equipos recibidos para reparación: recepción, presupuesto y entrega
              </p>
            </div>
            <Button onClick={() => setNewOrderOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva orden
            </Button>
          </div>

          {stats && typeof stats.total === "number" && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total órdenes</CardTitle>
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Registradas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monto total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {typeof stats.total_amount === "number"
                      ? formatMoney(stats.total_amount)
                      : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground">Órdenes activas</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Por estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {stats.by_status &&
                      Object.entries(stats.by_status)
                        .slice(0, 3)
                        .map(([k, v]) => (
                          <span key={k} className="mr-2">
                            {REPAIR_ORDER_STATUS_LABELS[k as RepairOrderStatus] ?? k}: {String(v)}
                          </span>
                        ))}
                    {(!stats.by_status || Object.keys(stats.by_status).length === 0) && "—"}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Listado de órdenes</CardTitle>
              <CardDescription>
                Filtros por estado y rango de fechas de recepción
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="relative min-w-[220px] flex-1 md:max-w-[340px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, cliente o equipo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Desde"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[140px]"
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="date"
                    placeholder="Hasta"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => loadOrders()} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant={onlyPending ? "default" : "outline"}
                  onClick={() => setOnlyPending((prev) => !prev)}
                >
                  Pendientes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStatusFilter("")
                    setDateFrom("")
                    setDateTo("")
                    setSearchQuery("")
                    setOnlyPending(false)
                    setPage(1)
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
              {!loading && (
                <p className="mb-4 text-sm text-muted-foreground">
                  Mostrando {filteredOrders.length} de {orders.length} orden(es) en esta página.
                </p>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Cargando…
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mb-2 opacity-50" />
                  <p>No hay órdenes de reparación con los filtros aplicados en esta página.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setNewOrderOpen(true)}>
                    Crear primera orden
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Equipo</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Recepción</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => {
                        const balance =
                          parseFloat(order.total_amount || "0") - parseFloat(order.amount_paid || "0")
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.repair_number}</TableCell>
                            <TableCell>
                              {order.client?.name ?? clientNameById[order.client_id] ?? `Cliente #${order.client_id}`}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {order.equipment_description || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusVariant(order.status)}
                                className={getStatusClassName(order.status)}
                              >
                                {REPAIR_ORDER_STATUS_LABELS[order.status] ?? order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(order.reception_date)}</TableCell>
                            <TableCell className="text-right">
                              {formatMoney(order.total_amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatMoney(balance)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/reparaciones/${order.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        isLoading={loading}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <NewRepairOrderModal
          isOpen={newOrderOpen}
          onClose={() => setNewOrderOpen(false)}
          onSuccess={handleNewOrderSuccess}
        />
      </ERPLayout>
    </Protected>
  )
}
