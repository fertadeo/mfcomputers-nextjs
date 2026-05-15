"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { useRole } from "@/app/hooks/useRole"
import type { Role } from "@/app/config/menu"
import {
  COMMERCIAL_BUDGET_STATUS_LABELS,
  deleteCommercialBudget,
  getCommercialBudgetById,
  getClientes,
  getProducts,
  postCommercialBudgetApprove,
  postCommercialBudgetExpire,
  postCommercialBudgetReject,
  postCommercialBudgetSend,
  updateCommercialBudget,
  type CommercialBudgetDetail,
  type CommercialBudgetLine,
  type Cliente,
  type Product,
  type ApiBudgetError,
} from "@/lib/api"
import { commercialBudgetDetailToPdfData } from "@/lib/commercial-budget-pdf-mapper"
import { BudgetPdfModal } from "@/components/budget-pdf-modal"
import { BudgetConvertSaleDialog } from "@/components/budget-convert-sale-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
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

function linesFromDetail(items: CommercialBudgetLine[]) {
  return items.map((i) => ({
    id: i.id,
    product_id: i.product_id,
    product_name: i.product_name,
    product_code: i.product_code,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }))
}

export default function PresupuestoDetallePage() {
  const params = useParams()
  const router = useRouter()
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
  const [draftLines, setDraftLines] = useState<
    { id: number; product_id: number; product_name: string; product_code: string; quantity: number; unit_price: number }[]
  >([])
  const [allowInactiveDraft, setAllowInactiveDraft] = useState(false)

  const [products, setProducts] = useState<Product[]>([])
  const [productSearch, setProductSearch] = useState("")
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
      setDraftLines(linesFromDetail(d.items || []))
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
    if (!detail || detail.status !== "draft") return
    let cancelled = false
    ;(async () => {
      try {
        const data = await getProducts(1, 400, false)
        const list = Array.isArray(data) ? data : (data as { products: Product[] }).products || []
        if (!cancelled) setProducts(list)
      } catch {
        /* ignore */
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

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products.slice(0, 30)
    return products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q)
      )
      .slice(0, 40)
  }, [products, productSearch])

  const pdfPayload = useMemo(() => (detail ? commercialBudgetDetailToPdfData(detail) : null), [detail])

  async function saveChanges() {
    if (!detail || !puedeEditar) return
    setSaving(true)
    try {
      if (detail.status === "draft") {
        if (!clientId) {
          toast.error("Cliente requerido")
          return
        }
        const updated = await updateCommercialBudget(detail.id, {
          client_id: clientId,
          valid_until: validUntil.trim() || null,
          notes: notes.trim() || null,
          items: draftLines.map((l) => ({
            product_id: l.product_id,
            quantity: Math.max(1, Math.floor(l.quantity)),
            unit_price: Math.max(0, l.unit_price),
          })),
          allow_inactive: allowInactiveDraft,
        })
        setDetail(updated)
        setDraftLines(linesFromDetail(updated.items || []))
        toast.success("Cambios guardados")
      } else if (detail.status === "sent") {
        const updated = await updateCommercialBudget(detail.id, {
          valid_until: validUntil.trim() || null,
          notes: notes.trim() || null,
        })
        setDetail(updated)
        toast.success("Notas y vigencia actualizadas")
      }
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
        quantity: 1,
        unit_price: Number(p.price) || 0,
      },
    ])
    setShowAddProduct(false)
    setProductSearch("")
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

  const st = detail.status
  const draft = st === "draft"
  const sent = st === "sent"
  const approved = st === "approved"
  const readonly = st === "rejected" || st === "expired"

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
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold font-mono tracking-tight">{detail.budget_number}</h1>
                <Badge variant="outline" className="text-sm">
                  {COMMERCIAL_BUDGET_STATUS_LABELS[st]}
                </Badge>
              </div>
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
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setPdfOpen(true)}>
                <FileText className="h-4 w-4" />
                PDF
              </Button>
              {puedeEditar && approved && (
                <Button size="sm" className="gap-1" onClick={() => setConvertOpen(true)}>
                  <CheckCircle2 className="h-4 w-4" />
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
              {puedeEditar && (
                <div className="flex flex-wrap gap-2">
                  {draft && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        disabled={!!actionLoading}
                        onClick={() =>
                          setConfirm({
                            title: "Enviar presupuesto",
                            description: "Pasará a estado Enviado. Luego solo podrás editar notas y vigencia.",
                            action: async () => {
                              await postCommercialBudgetSend(detail.id)
                              toast.success("Presupuesto enviado")
                            },
                          })
                        }
                      >
                        <Send className="h-4 w-4" />
                        Enviar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={!!actionLoading}
                        onClick={() =>
                          setConfirm({
                            title: "Marcar vencido",
                            description: "El presupuesto quedará cerrado como vencido.",
                            action: async () => {
                              await postCommercialBudgetExpire(detail.id)
                              toast.success("Marcado como vencido")
                            },
                          })
                        }
                      >
                        <Ban className="h-4 w-4" />
                        Vencer
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        disabled={!!actionLoading}
                        onClick={() =>
                          setConfirm({
                            title: "Rechazar presupuesto",
                            description: "Esta acción cierra el presupuesto como rechazado.",
                            destructive: true,
                            action: async () => {
                              await postCommercialBudgetReject(detail.id)
                              toast.success("Presupuesto rechazado")
                            },
                          })
                        }
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar
                      </Button>
                    </>
                  )}
                  {sent && (
                    <>
                      <Button
                        size="sm"
                        className="gap-1"
                        disabled={!!actionLoading}
                        onClick={() =>
                          setConfirm({
                            title: "Aprobar presupuesto",
                            description: "Quedará aprobado y podrás convertirlo a venta cuando el cliente pague.",
                            action: async () => {
                              await postCommercialBudgetApprove(detail.id)
                              toast.success("Presupuesto aprobado")
                            },
                          })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={!!actionLoading}
                        onClick={() =>
                          setConfirm({
                            title: "Marcar vencido",
                            description: "Cerrará el presupuesto como vencido.",
                            action: async () => {
                              await postCommercialBudgetExpire(detail.id)
                              toast.success("Marcado como vencido")
                            },
                          })
                        }
                      >
                        <Ban className="h-4 w-4" />
                        Vencer
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1"
                        disabled={!!actionLoading}
                        onClick={() =>
                          setConfirm({
                            title: "Rechazar",
                            description: "El presupuesto quedará rechazado.",
                            destructive: true,
                            action: async () => {
                              await postCommercialBudgetReject(detail.id)
                              toast.success("Rechazado")
                            },
                          })
                        }
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar
                      </Button>
                    </>
                  )}
                  {draft && puedeEliminar && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive gap-1"
                      disabled={!!actionLoading}
                      onClick={() =>
                        setConfirm({
                          title: "Eliminar borrador",
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
                </div>
              )}
            </CardContent>
          </Card>

          {!readonly && puedeEditar && (draft || sent) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{draft ? "Edición (borrador)" : "Notas y vigencia (enviado)"}</CardTitle>
                <CardDescription>
                  {draft
                    ? "Podés cambiar cliente, líneas, notas y vigencia. Guardá antes de enviar."
                    : "Solo notas y fecha de vigencia. No se pueden cambiar cliente ni líneas."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {draft && (
                  <>
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
                  </>
                )}
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
                  Guardar
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Ítems</CardTitle>
                <CardDescription>Productos cotizados</CardDescription>
              </div>
              {draft && puedeEditar && (
                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setShowAddProduct((v) => !v)}>
                  <Plus className="h-4 w-4" />
                  Agregar producto
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {draft && puedeEditar && showAddProduct && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                  <Input
                    placeholder="Buscar en catálogo…"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                  <div className="max-h-48 overflow-y-auto divide-y border rounded bg-background">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-2 py-2 text-sm hover:bg-muted flex justify-between gap-2"
                        onClick={() => addProductLine(p)}
                      >
                        <span className="truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{p.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-28">Cant.</TableHead>
                      <TableHead className="text-right w-32">P. unit.</TableHead>
                      <TableHead className="text-right w-36">Subtotal</TableHead>
                      {draft && puedeEditar && <TableHead className="w-12" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(draft && puedeEditar ? draftLines : (detail.items || []).map((i) => ({
                      id: i.id,
                      product_id: i.product_id,
                      product_name: i.product_name,
                      product_code: i.product_code,
                      quantity: i.quantity,
                      unit_price: i.unit_price,
                    }))).map((row) => (
                      <TableRow key={`${row.product_id}-${row.id}`}>
                        <TableCell>
                          <div className="font-medium text-sm">{row.product_name}</div>
                          <div className="text-xs font-mono text-muted-foreground">{row.product_code}</div>
                        </TableCell>
                        <TableCell>
                          {draft && puedeEditar ? (
                            <Input
                              type="number"
                              min={1}
                              className="h-8"
                              value={row.quantity}
                              onChange={(e) => {
                                const q = Math.max(1, parseInt(e.target.value, 10) || 1)
                                setDraftLines((prev) =>
                                  prev.map((l) => (l.product_id === row.product_id ? { ...l, quantity: q } : l))
                                )
                              }}
                            />
                          ) : (
                            row.quantity
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {draft && puedeEditar ? (
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-8 text-right"
                              value={row.unit_price}
                              onChange={(e) => {
                                const v = Math.max(0, parseFloat(e.target.value) || 0)
                                setDraftLines((prev) =>
                                  prev.map((l) => (l.product_id === row.product_id ? { ...l, unit_price: v } : l))
                                )
                              }}
                            />
                          ) : (
                            formatMoney(row.unit_price)
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(row.quantity * row.unit_price)}
                        </TableCell>
                        {draft && puedeEditar && (
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setDraftLines((prev) => prev.filter((l) => l.product_id !== row.product_id))
                              }
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
                Este presupuesto está cerrado ({COMMERCIAL_BUDGET_STATUS_LABELS[st]}). Solo lectura.
              </CardContent>
            </Card>
          )}

          <Separator />

          <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
            Los presupuestos comerciales no reservan stock. La conversión a venta usa el mismo flujo que el POS y
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
          hideEmailButton
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
