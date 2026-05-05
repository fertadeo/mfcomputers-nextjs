"use client"

import { useEffect, useMemo, useState } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertTriangle, CheckCircle2, Clock3, FileText, RefreshCcw, Search, Send } from "lucide-react"
import { facturarSale, getSales, type FacturarSaleRequest, type Sale } from "@/lib/api"

const ARCA_STATUS_OPTIONS = ["all", "pending", "success", "error", "not_issued"] as const

const estadoBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Procesando", variant: "secondary" },
  success: { label: "Facturado", variant: "default" },
  error: { label: "Error", variant: "destructive" },
  not_issued: { label: "Sin emitir", variant: "outline" },
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(value)

const formatDateTime = (value?: string | null) => {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString("es-AR")
}

function getArcaStatus(sale: Sale): "pending" | "success" | "error" | "not_issued" {
  if (sale.arca_status === "pending" || sale.arca_status === "success" || sale.arca_status === "error") {
    return sale.arca_status
  }
  return "not_issued"
}

export default function FacturacionPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<(typeof ARCA_STATUS_OPTIONS)[number]>("all")
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null)
  const [isEmitModalOpen, setIsEmitModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [retryAfterHint, setRetryAfterHint] = useState<string | null>(null)
  const [form, setForm] = useState<FacturarSaleRequest>({
    tipo: 11,
    condicionIvaReceptor: 5,
    concepto: 1,
    force: false,
  })

  const selectedSale = useMemo(
    () => sales.find((sale) => sale.id === selectedSaleId) ?? null,
    [sales, selectedSaleId]
  )

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sales.filter((sale) => {
      const status = getArcaStatus(sale)
      if (statusFilter !== "all" && status !== statusFilter) return false
      if (!q) return true
      return (
        sale.sale_number.toLowerCase().includes(q) ||
        (sale.client_name ?? "").toLowerCase().includes(q) ||
        String(sale.id).includes(q)
      )
    })
  }, [sales, query, statusFilter])

  const stats = useMemo(() => {
    const total = sales.length
    const success = sales.filter((s) => getArcaStatus(s) === "success").length
    const pending = sales.filter((s) => getArcaStatus(s) === "pending").length
    const error = sales.filter((s) => getArcaStatus(s) === "error").length
    return { total, success, pending, error }
  }, [sales])

  const loadSales = async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await getSales({ page: 1, limit: 100 })
      const fetched = res?.data?.sales ?? []
      setSales(fetched)
      if (!selectedSaleId && fetched.length > 0) setSelectedSaleId(fetched[0].id)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "No se pudo obtener ventas para facturación.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSales()
  }, [])

  const onSubmitFacturar = async () => {
    if (!selectedSale) {
      setErrorMsg("Seleccioná una venta antes de facturar.")
      return
    }

    if ((form.concepto === 2 || form.concepto === 3) && (!form.fechaServicioDesde || !form.fechaServicioHasta)) {
      setErrorMsg("Para concepto 2 o 3 tenés que indicar fecha de servicio desde y hasta (YYYY-MM-DD).")
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    setRetryAfterHint(null)
    try {
      const response = await facturarSale(selectedSale.id, form)
      const cae = response?.data?.arca?.cae || response?.data?.sale?.arca_cae
      setSuccessMsg(cae ? `Factura emitida correctamente. CAE: ${cae}` : "Factura emitida correctamente.")
      setIsEmitModalOpen(false)
      await loadSales()
    } catch (error: unknown) {
      const err = error as Error & { status?: number; retryAfter?: number | string | null }
      setErrorMsg(err?.message ?? "Error al facturar venta en ARCA.")
      if (err?.status === 429 && err?.retryAfter != null) {
        setRetryAfterHint(`Límite alcanzado. Reintentá luego de: ${String(err.retryAfter)}.`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "finanzas", "admin"]}>
      <ERPLayout activeItem="facturacion">
        <div className="space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Facturación ARCA</h1>
              <p className="text-muted-foreground">
                Emisión de comprobantes vía `POST /api/sales/:id/facturar` consumiendo solo MF API.
              </p>
            </div>
            <Button variant="outline" onClick={() => void loadSales()} disabled={isLoading}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Actualizar ventas
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ventas cargadas</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{stats.total}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Facturadas</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-semibold text-emerald-600">
                <CheckCircle2 className="h-5 w-5" /> {stats.success}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pendientes</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-semibold text-amber-600">
                <Clock3 className="h-5 w-5" /> {stats.pending}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Con error</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-2xl font-semibold text-red-600">
                <AlertTriangle className="h-5 w-5" /> {stats.error}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Contrato y reglas operativas</CardTitle>
              <CardDescription>Precondiciones y postcondiciones para UI, QA y soporte.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Alert
                variant="info"
                title="Precondiciones"
                description="Venta existente con ítems válidos. Para concepto 2 o 3 se requieren fechas de servicio en formato YYYY-MM-DD."
              />
              <Alert
                variant="success"
                title="Postcondiciones"
                description="Se persisten arca_status, arca_factura_id, arca_cae y trazabilidad de intento/error en sales."
              />
            </CardContent>
          </Card>

          {errorMsg ? <Alert variant="error" title="No se pudo completar la facturación" description={errorMsg} /> : null}
          {retryAfterHint ? <Alert variant="warning" title="Backoff recomendado" description={retryAfterHint} /> : null}
          {successMsg ? <Alert variant="success" title="Facturación realizada" description={successMsg} /> : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Ventas facturables
              </CardTitle>
              <CardDescription>Seleccioná una acción para abrir el modal de emisión de comprobante.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute left-2 top-2.5 h-4 w-4" />
                  <Input
                    className="pl-8"
                    placeholder="Buscar por venta, cliente o ID"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as (typeof ARCA_STATUS_OPTIONS)[number])}>
                  <SelectTrigger className="w-full md:w-[220px]">
                    <SelectValue placeholder="Estado ARCA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="not_issued">Sin emitir</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venta</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado ARCA</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}>Cargando ventas...</TableCell>
                    </TableRow>
                  ) : filteredSales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>No hay ventas para los filtros aplicados.</TableCell>
                    </TableRow>
                  ) : (
                    filteredSales.map((sale) => {
                      const status = getArcaStatus(sale)
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">{sale.sale_number}</TableCell>
                          <TableCell>{sale.client_name || "Consumidor final"}</TableCell>
                          <TableCell>{formatDateTime(sale.sale_date)}</TableCell>
                          <TableCell>
                            <Badge variant={estadoBadge[status].variant}>{estadoBadge[status].label}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedSaleId(sale.id)
                                setForm({
                                  tipo: 11,
                                  condicionIvaReceptor: 5,
                                  concepto: 1,
                                  force: false,
                                })
                                setIsEmitModalOpen(true)
                              }}
                            >
                              Emitir comprobante
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={isEmitModalOpen} onOpenChange={setIsEmitModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Emitir comprobante</DialogTitle>
                <DialogDescription>Backend emite en ARCA y devuelve trazabilidad normalizada.</DialogDescription>
              </DialogHeader>

              {!selectedSale ? (
                <Alert variant="warning" title="Sin venta seleccionada" description="Seleccioná una venta para habilitar la facturación." />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{selectedSale.sale_number}</div>
                    <div className="text-muted-foreground">Cliente: {selectedSale.client_name || "Consumidor final"}</div>
                    <div className="text-muted-foreground">Monto: {formatCurrency(selectedSale.total_amount)}</div>
                    <div className="text-muted-foreground">Último intento: {formatDateTime(selectedSale.arca_last_attempt_at)}</div>
                    <div className="text-muted-foreground">CAE actual: {selectedSale.arca_cae || "-"}</div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      type="number"
                      value={form.tipo ?? 11}
                      onChange={(e) => setForm((prev) => ({ ...prev, tipo: Number(e.target.value) || 11 }))}
                      placeholder="Tipo (default 11)"
                    />
                    <Input
                      type="number"
                      value={form.condicionIvaReceptor ?? 5}
                      onChange={(e) => setForm((prev) => ({ ...prev, condicionIvaReceptor: Number(e.target.value) || 5 }))}
                      placeholder="Condición IVA receptor"
                    />
                    <Select
                      value={String(form.concepto ?? 1)}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, concepto: Number(value) as 1 | 2 | 3 }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Concepto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Productos</SelectItem>
                        <SelectItem value="2">2 - Servicios</SelectItem>
                        <SelectItem value="3">3 - Productos + servicios</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={form.docNro ?? ""}
                      onChange={(e) => setForm((prev) => ({ ...prev, docNro: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="Doc Nro (opcional)"
                    />
                    {(form.concepto === 2 || form.concepto === 3) && (
                      <>
                        <Input
                          type="date"
                          value={form.fechaServicioDesde ?? ""}
                          onChange={(e) => setForm((prev) => ({ ...prev, fechaServicioDesde: e.target.value || undefined }))}
                        />
                        <Input
                          type="date"
                          value={form.fechaServicioHasta ?? ""}
                          onChange={(e) => setForm((prev) => ({ ...prev, fechaServicioHasta: e.target.value || undefined }))}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setForm((prev) => ({ ...prev, force: true }))}
                      disabled={form.force === true}
                    >
                      Habilitar reintento forzado
                    </Button>
                    {form.force ? <Badge variant="outline">force=true activo</Badge> : null}
                  </div>

                  <p className="text-muted-foreground text-xs">
                    Recomendación UX: usar `force=true` solo cuando la venta ya tuvo facturación previa y el usuario confirme el reintento.
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEmitModalOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button onClick={onSubmitFacturar} disabled={isSubmitting || !selectedSale}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Facturando..." : "Facturar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ERPLayout>
    </Protected>
  )
}
