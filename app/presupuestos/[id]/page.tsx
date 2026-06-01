"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { useRole } from "@/app/hooks/useRole"
import type { Role } from "@/app/config/menu"
import {
  deleteCommercialBudget,
  ensureCommercialBudgetApproved,
  getCommercialBudgetById,
  getClientes,
  getProducts,
  updateCommercialBudget,
  type CommercialBudgetDetail,
  type Cliente,
  type Product,
  type ApiBudgetError,
} from "@/lib/api"
import { commercialBudgetDetailToPdfData } from "@/lib/commercial-budget-pdf-mapper"
import {
  budgetDetailDraftLinesToApiItems,
  linesFromBudgetDetail,
  type BudgetDetailDraftLine,
} from "@/lib/budget-lines"
import { BudgetProductCatalog } from "@/components/budget-product-catalog"
import { PosManualItemCard } from "@/components/pos-manual-item-card"
import { BudgetPdfModal } from "@/components/budget-pdf-modal"
import { BudgetConvertSaleDialog } from "@/components/budget-convert-sale-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, CheckCircle2, FileText, Loader2, Plus, Save, Search, Trash2 } from "lucide-react"
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
const ROLES_ELIMINAR: Role[] = ["admin", "gerencia"]

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
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function PresupuestoDetallePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = String(params.id ?? "")
  const { hasAnyOfRoles } = useRole()
  const puedeEditar = hasAnyOfRoles(ROLES_EDITAR)
  const puedeEliminar = hasAnyOfRoles(ROLES_ELIMINAR)

  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<CommercialBudgetDetail | null>(null)
  const [pdfOpen, setPdfOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)

  const [notes, setNotes] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [clientId, setClientId] = useState<number | null>(null)
  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<Cliente[]>([])
  const [draftLines, setDraftLines] = useState<BudgetDetailDraftLine[]>([])
  const [allowInactiveDraft, setAllowInactiveDraft] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)

  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [confirm, setConfirm] = useState<{
    title: string
    description: string
    action: () => Promise<void>
    destructive?: boolean
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCommercialBudgetById(id)
      const d = res.data
      setDetail(d)
      setNotes(d.notes ?? "")
      setValidUntil(d.valid_until ? d.valid_until.split("T")[0] : "")
      setClientId(d.client_id)
      setDraftLines(linesFromBudgetDetail(d.items || []))
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      if (err?.status === 401) router.replace("/login")
      else if (err?.status === 404) toast.error("Presupuesto no encontrado")
      else toast.error(err?.message ?? "Error al cargar")
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (searchParams.get("pdf") === "1" && detail && !loading) {
      setPdfOpen(true)
    }
  }, [searchParams, detail, loading])

  useEffect(() => {
    if (!detail || detail.status === "rejected" || detail.status === "expired") return
    let cancelled = false
    setLoadingProducts(true)
    ;(async () => {
      try {
        const data = await getProducts(1, 500, false)
        const list = Array.isArray(data) ? data : (data as { products: Product[] }).products || []
        if (!cancelled) setProducts(list)
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detail?.status, detail?.id])

  useEffect(() => {
    if (clientSearch.trim().length < 2) {
      setClients([])
      return
    }
    const t = setTimeout(() => {
      getClientes(1, 20, clientSearch.trim(), "active")
        .then((r) => setClients(r.clients || []))
        .catch(() => setClients([]))
    }, 300)
    return () => clearTimeout(t)
  }, [clientSearch])

  const pdfPayload = useMemo(() => (detail ? commercialBudgetDetailToPdfData(detail) : null), [detail])
  const lineProductIds = useMemo(
    () => draftLines.filter((l) => l.product_id != null).map((l) => l.product_id as number),
    [draftLines]
  )

  async function saveChanges() {
    if (!detail || !puedeEditar) return
    if (!clientId) {
      toast.error("Cliente requerido")
      return
    }
    const invalidCustom = draftLines.some((l) => l.is_custom && !(l.description || l.product_name).trim())
    if (invalidCustom) {
      toast.error("Hay un ítem escrito sin descripción")
      return
    }
    setSaving(true)
    try {
      const updated = await updateCommercialBudget(detail.id, {
        client_id: clientId,
        valid_until: validUntil.trim() || null,
        notes: notes.trim() || null,
        items: budgetDetailDraftLinesToApiItems(draftLines),
        allow_inactive: allowInactiveDraft,
      })
      setDetail(updated)
      setDraftLines(linesFromBudgetDetail(updated.items || []))
      toast.success("Cambios guardados")
    } catch (e: unknown) {
      const err = e as ApiBudgetError
      toast.error(err?.message ?? "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  function addProductLine(p: Product) {
    const exists = draftLines.find((l) => l.product_id === p.id)
    if (exists) {
      setDraftLines((prev) =>
        prev.map((l) => (l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      )
      toast.message("Cantidad +1", { description: p.name })
      return
    }
    const tempId = -Date.now()
    setDraftLines((prev) => [
      ...prev,
      {
        id: tempId,
        product_id: p.id,
        product_name: p.name,
        product_code: p.code,
        description: "",
        is_custom: false,
        quantity: 1,
        unit_price: Number(p.price) || 0,
      },
    ])
    toast.message("Producto agregado", { description: p.name })
  }

  function addCustomLine(payload: { description: string; quantity: number; unit_price: number }) {
    const tempId = -Date.now()
    setDraftLines((prev) => [
      ...prev,
      {
        id: tempId,
        product_id: null,
        product_name: payload.description,
        product_code: "",
        description: payload.description,
        is_custom: true,
        quantity: payload.quantity,
        unit_price: payload.unit_price,
      },
    ])
    toast.message("Ítem agregado", { description: payload.description })
  }

  function updateDraftLine(id: number, patch: Partial<BudgetDetailDraftLine>) {
    setDraftLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function removeDraftLine(id: number) {
    setDraftLines((prev) => prev.filter((l) => l.id !== id))
  }

  function runConfirm() {
    if (!confirm) return
    const fn = confirm.action
    setConfirm(null)
    void (async () => {
      setActionLoading("confirm")
      try {
        await fn()
        await load()
      } catch (e: unknown) {
        toast.error((e as Error)?.message ?? "Error")
      } finally {
        setActionLoading(null)
      }
    })()
  }

  if (loading) {
    return (
      <Protected requiredRoles={ROLES_VER}>
        <ERPLayout activeItem="presupuestos">
          <div className="flex justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            Cargando presupuesto…
          </div>
        </ERPLayout>
      </Protected>
    )
  }

  if (!detail) {
    return (
      <Protected requiredRoles={ROLES_VER}>
        <ERPLayout activeItem="presupuestos">
          <p className="text-muted-foreground">No se encontró el presupuesto.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/presupuestos">Volver</Link>
          </Button>
        </ERPLayout>
      </Protected>
    )
  }

  const readonly = detail.status === "rejected" || detail.status === "expired"
  const editable = puedeEditar && !readonly

  return (
    <Protected requiredRoles={ROLES_VER}>
      <ERPLayout activeItem="presupuestos">
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/presupuestos" className="gap-1">
                <ArrowLeft className="h-4 w-4" />
                Listado
              </Link>
            </Button>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold font-mono tracking-tight mb-1">{detail.budget_number}</h1>
              <p className="text-muted-foreground text-sm">
                Cliente:{" "}
                <span className="text-foreground font-medium">
                  {detail.client_name || `#${detail.client_id}`}
                </span>
                {detail.client_email && (
                  <span className="block text-xs mt-0.5">{detail.client_email}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Creado {formatDate(detail.created_at)} · Actualizado {formatDate(detail.updated_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm" className="gap-1 shadow-sm" onClick={() => setPdfOpen(true)}>
                <FileText className="h-4 w-4" />
                Ver / descargar PDF
              </Button>
              {editable && (
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={actionLoading === "convert"}
                  onClick={async () => {
                    setActionLoading("convert")
                    try {
                      await ensureCommercialBudgetApproved(detail.id)
                      setConvertOpen(true)
                    } catch (e: unknown) {
                      toast.error((e as Error)?.message ?? "No se pudo preparar la venta")
                    } finally {
                      setActionLoading(null)
                    }
                  }}
                >
                  {actionLoading === "convert" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Convertir a venta
                </Button>
              )}
            </div>
          </div>

          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total cotizado</p>
                <p className="text-3xl font-bold tabular-nums">{formatMoney(detail.total_amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {detail.item_count ?? detail.items?.length ?? 0} ítem(s) · sin movimiento de stock
                </p>
              </div>
              {editable && puedeEliminar && detail.status === "draft" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive gap-1"
                  disabled={!!actionLoading}
                  onClick={() =>
                    setConfirm({
                      title: "Eliminar presupuesto",
                      description: "Se eliminará el presupuesto y todas sus líneas. No se puede deshacer.",
                      destructive: true,
                      action: async () => {
                        await deleteCommercialBudget(detail.id)
                        toast.success("Presupuesto eliminado")
                        router.push("/presupuestos")
                      },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              )}
            </CardContent>
          </Card>

          {editable && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Editar presupuesto</CardTitle>
                <CardDescription>
                  Cliente, líneas, notas y vigencia. Guardá los cambios antes de convertir a venta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Cambiar cliente</Label>
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Buscar cliente activo…"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                  </div>
                  {clients.length > 0 && (
                    <ul className="border rounded-md max-h-40 overflow-y-auto divide-y max-w-md">
                      {clients.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                            onClick={() => {
                              setClientId(c.id)
                              setClientSearch("")
                              setClients([])
                            }}
                          >
                            {c.name} <span className="text-muted-foreground">({c.code})</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-muted-foreground">Cliente actual en el presupuesto: ID {clientId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="aid"
                    checked={allowInactiveDraft}
                    onCheckedChange={(c) => setAllowInactiveDraft(c === true)}
                  />
                  <Label htmlFor="aid" className="text-sm font-normal cursor-pointer">
                    Permitir productos inactivos al guardar
                  </Label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
                  <div className="space-y-2">
                    <Label>Válido hasta</Label>
                    <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2 max-w-2xl">
                  <Label>Notas</Label>
                  <Textarea rows={4} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button onClick={saveChanges} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar cambios
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Ítems</CardTitle>
                <CardDescription>Productos del catálogo o ítems escritos</CardDescription>
              </div>
              {editable && (
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setShowAddProduct((v) => !v)}>
                  <Plus className="h-4 w-4" />
                  Agregar producto
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {editable && showAddProduct && (
                <div className="rounded-lg border p-3 bg-muted/20 space-y-4">
                  <BudgetProductCatalog
                    products={products}
                    loading={loadingProducts}
                    onAddProduct={addProductLine}
                    lineProductIds={lineProductIds}
                  />
                </div>
              )}
              {editable && (
                <PosManualItemCard
                  onAdd={addCustomLine}
                  addLabel="Agregar ítem escrito"
                  inputIdPrefix="budget-detail-manual"
                />
              )}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-28">Cant.</TableHead>
                      <TableHead className="text-right w-32">P. unit.</TableHead>
                      <TableHead className="text-right w-36">Subtotal</TableHead>
                      {editable && <TableHead className="w-12" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(editable ? draftLines : linesFromBudgetDetail(detail.items || [])).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {editable && row.is_custom ? (
                            <Input
                              className="h-8 font-medium"
                              value={row.description || row.product_name}
                              placeholder="Descripción del ítem"
                              onChange={(e) =>
                                updateDraftLine(row.id, {
                                  description: e.target.value,
                                  product_name: e.target.value,
                                })
                              }
                            />
                          ) : (
                            <>
                              <div className="font-medium text-sm">
                                {row.is_custom ? row.description || row.product_name : row.product_name}
                              </div>
                              {!row.is_custom && row.product_code && (
                                <div className="text-xs font-mono text-muted-foreground">{row.product_code}</div>
                              )}
                              {row.is_custom && (
                                <div className="text-xs text-muted-foreground">Ítem escrito</div>
                              )}
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          {editable ? (
                            <Input
                              type="number"
                              min={1}
                              className="h-8"
                              value={row.quantity}
                              onChange={(e) => {
                                const q = Math.max(1, parseInt(e.target.value, 10) || 1)
                                updateDraftLine(row.id, { quantity: q })
                              }}
                            />
                          ) : (
                            row.quantity
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editable ? (
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-8 text-right"
                              value={row.unit_price}
                              onChange={(e) => {
                                const v = Math.max(0, parseFloat(e.target.value) || 0)
                                updateDraftLine(row.id, { unit_price: v })
                              }}
                            />
                          ) : (
                            formatMoney(row.unit_price)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(row.quantity * row.unit_price)}
                        </TableCell>
                        {editable && (
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDraftLine(row.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {readonly && (
            <Card className="border-dashed">
              <CardContent className="py-6 text-sm text-muted-foreground">
                Este presupuesto está cerrado y no se puede editar.
              </CardContent>
            </Card>
          )}

          <Separator />

          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Los presupuestos no reservan stock. La conversión a venta usa el mismo flujo que el POS y
            valida disponibilidad en ese momento. Las{" "}
            <Link href="/reparaciones" className="underline underline-offset-2">
              órdenes de reparación
            </Link>{" "}
            tienen otro circuito (presupuesto de taller).
          </p>
        </div>

        <BudgetPdfModal
          isOpen={pdfOpen}
          onClose={() => setPdfOpen(false)}
          budget={pdfPayload}
          documentVariant="catalog"
        />

        <BudgetConvertSaleDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          budget={detail}
          onSuccess={({ saleId, saleNumber }) => {
            toast.info("Podés ver la venta en el módulo de ventas", {
              description: `${saleNumber} (id ${saleId})`,
              duration: 6000,
            })
          }}
        />

        <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirm?.title}</DialogTitle>
              <DialogDescription>{confirm?.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)} disabled={actionLoading === "confirm"}>
                Cancelar
              </Button>
              <Button
                variant={confirm?.destructive ? "destructive" : "default"}
                onClick={runConfirm}
                disabled={actionLoading === "confirm"}
                className="gap-2"
              >
                {actionLoading === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ERPLayout>
    </Protected>
  )
}
