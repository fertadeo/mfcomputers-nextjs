"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { useRole } from "@/app/hooks/useRole"
import type { Role } from "@/app/config/menu"
import {
  COMMERCIAL_BUDGET_STATUS_LABELS,
  getCommercialBudgets,
  getCommercialBudgetStats,
  type CommercialBudgetStatus,
  type CommercialBudgetSummary,
} from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pagination } from "@/components/ui/pagination"
import {
  Calculator,
  Eye,
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  CheckCircle2,
  Ban,
  Clock,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

const ROLES_VER: Role[] = [
  "admin",
  "gerencia",
  "ventas",
  "finanzas",
  "logistica",
  "manager",
  "employee",
  "viewer",
]

const ROLES_EDITAR: Role[] = ["admin", "gerencia", "ventas"]

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function statusBadgeClass(s: CommercialBudgetStatus): string {
  switch (s) {
    case "draft":
      return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-100"
    case "sent":
      return "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950 dark:text-sky-100"
    case "approved":
      return "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-100"
    case "rejected":
      return "bg-red-100 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-100"
    case "expired":
      return "bg-amber-100 text-amber-950 border-amber-200 dark:bg-amber-950 dark:text-amber-100"
    default:
      return ""
  }
}

function StatusIcon({ s }: { s: CommercialBudgetStatus }) {
  switch (s) {
    case "draft":
      return <FileSpreadsheet className="h-3.5 w-3.5" />
    case "sent":
      return <Send className="h-3.5 w-3.5" />
    case "approved":
      return <CheckCircle2 className="h-3.5 w-3.5" />
    case "rejected":
      return <XCircle className="h-3.5 w-3.5" />
    case "expired":
      return <Ban className="h-3.5 w-3.5" />
    default:
      return <Clock className="h-3.5 w-3.5" />
  }
}

export default function PresupuestosPage() {
  const router = useRouter()
  const { hasAnyOfRoles } = useRole()
  const puedeCrear = hasAnyOfRoles(ROLES_EDITAR)

  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [rows, setRows] = useState<CommercialBudgetSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [status, setStatus] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [search, setSearch] = useState("")
  const [stats, setStats] = useState<{
    total: number
    draft: number
    sent: number
    approved: number
    rejected: number
    expired: number
    total_amount_draft: number
    total_amount_sent: number
  } | null>(null)

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await getCommercialBudgetStats()
      setStats(res.data ?? null)
    } catch {
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCommercialBudgets({
        page,
        limit,
        status: status === "all" ? undefined : (status as CommercialBudgetStatus),
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      const data = res.data
      setRows(data?.budgets ?? [])
      setTotal(typeof data?.total === "number" ? data.total : 0)
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 401) {
        toast.error("Sesión expirada.")
        router.replace("/login")
        return
      }
      if (err?.status === 403) {
        toast.error("No tenés permiso para ver presupuestos comerciales.")
        router.replace("/403")
        return
      }
      toast.error(err?.message ?? "No se pudieron cargar los presupuestos")
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [page, status, dateFrom, dateTo, router])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    loadList()
  }, [loadList])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const num = (r.budget_number || "").toLowerCase()
      const name = (r.client_name || "").toLowerCase()
      const code = (r.client_code || "").toLowerCase()
      return num.includes(q) || name.includes(q) || code.includes(q)
    })
  }, [rows, search])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <Protected requiredRoles={ROLES_VER}>
      <ERPLayout activeItem="presupuestos">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Presupuestos comerciales</h1>
              <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
                Cotizaciones con productos del catálogo y cliente. No mueven stock hasta convertir a venta. Es un
                flujo distinto de las{" "}
                <Link href="/reparaciones" className="text-primary underline-offset-4 hover:underline font-medium">
                  órdenes de reparación
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => { loadStats(); loadList(); }} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${loading || statsLoading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
              {puedeCrear && (
                <Button asChild className="gap-2 shadow-md">
                  <Link href="/presupuestos/nuevo">
                    <Plus className="h-4 w-4" />
                    Nuevo presupuesto
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-t-4 border-t-slate-400 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Total registrados</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {statsLoading ? "—" : stats?.total ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Todos los estados</CardContent>
            </Card>
            <Card className="border-t-4 border-t-sky-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Borradores + enviados</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {statsLoading
                    ? "—"
                    : ((stats?.draft ?? 0) + (stats?.sent ?? 0)).toLocaleString("es-AR")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-0.5">
                <div>Monto borradores: {statsLoading ? "—" : formatMoney(stats?.total_amount_draft ?? 0)}</div>
                <div>Monto enviados: {statsLoading ? "—" : formatMoney(stats?.total_amount_sent ?? 0)}</div>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-emerald-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Aprobados</CardDescription>
                <CardTitle className="text-3xl tabular-nums text-emerald-700 dark:text-emerald-400">
                  {statsLoading ? "—" : stats?.approved ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Listos para convertir a venta</CardContent>
            </Card>
            <Card className="border-t-4 border-t-amber-500 shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription>Cerrados (rechazo / vencido)</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {statsLoading ? "—" : ((stats?.rejected ?? 0) + (stats?.expired ?? 0)).toLocaleString("es-AR")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">Histórico comercial</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
              <CardDescription>Los filtros de fecha aplican sobre la fecha de creación en el servidor.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
              <div className="flex-1 min-w-[200px] space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Número, cliente o código…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-52 space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={status} onValueChange={(v) => { setPage(1); setStatus(v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {(Object.keys(COMMERCIAL_BUDGET_STATUS_LABELS) as CommercialBudgetStatus[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {COMMERCIAL_BUDGET_STATUS_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-44 space-y-2">
                <label className="text-sm font-medium">Desde</label>
                <Input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
              </div>
              <div className="w-full sm:w-44 space-y-2">
                <label className="text-sm font-medium">Hasta</label>
                <Input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <Calculator className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Listado</CardTitle>
                <CardDescription>
                  {search.trim()
                    ? `${filteredRows.length} resultado(s) en esta página (filtro local)`
                    : `${total} registro(s) en el servidor`}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Ítems</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          <Loader2 className="h-6 w-6 animate-spin inline mr-2 align-middle" />
                          Cargando…
                        </TableCell>
                      </TableRow>
                    ) : filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                          No hay presupuestos con los criterios elegidos.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((b) => (
                        <TableRow key={b.id} className="hover:bg-muted/40">
                          <TableCell className="font-mono font-medium">{b.budget_number}</TableCell>
                          <TableCell>
                            <div className="font-medium leading-tight">{b.client_name || `Cliente #${b.client_id}`}</div>
                            {b.client_email && (
                              <div className="text-xs text-muted-foreground truncate max-w-[220px]">{b.client_email}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatMoney(b.total_amount)}
                          </TableCell>
                          <TableCell className="text-center tabular-nums">{b.item_count ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1 ${statusBadgeClass(b.status)}`}>
                              <StatusIcon s={b.status} />
                              {COMMERCIAL_BUDGET_STATUS_LABELS[b.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{formatDate(b.valid_until)}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{formatDate(b.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild className="gap-1">
                              <Link href={`/presupuestos/${b.id}`}>
                                <Eye className="h-4 w-4" />
                                Ver
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {!search.trim() && totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
