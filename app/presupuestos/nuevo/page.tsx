"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import type { Role } from "@/app/config/menu"
import {
  createCommercialBudget,
  getClientes,
  getProducts,
  type Cliente,
  type Product,
  type ApiBudgetError,
} from "@/lib/api"
import {
  budgetDraftLineItems,
  budgetDraftLinesToApiItems,
  newCustomLineKey,
  type BudgetDraftLine,
} from "@/lib/budget-lines"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { BudgetProductCatalog } from "@/components/budget-product-catalog"
import { BudgetLinesPanel } from "@/components/budget-lines-panel"
import { PosManualItemCard } from "@/components/pos-manual-item-card"
import { ArrowLeft, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

const ROLES_EDITAR: Role[] = ["admin", "gerencia", "ventas"]

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

export default function NuevoPresupuestoPage() {
  const router = useRouter()
  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<Cliente[]>([])
  const [clientId, setClientId] = useState<number | null>(null)
  const [clientLabel, setClientLabel] = useState("")

  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<BudgetDraftLine[]>([])

  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [allowInactive, setAllowInactive] = useState(false)

  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getProducts(1, 500, false)
        const list = Array.isArray(data) ? data : (data as { products: Product[] }).products || []
        if (!cancelled) setProducts(list)
      } catch {
        if (!cancelled) toast.error("No se pudieron cargar los productos")
      } finally {
        if (!cancelled) setLoadingProducts(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (clientSearch.trim().length < 2) {
      setClients([])
      return
    }
    const t = setTimeout(() => {
      getClientes(1, 25, clientSearch.trim(), "active")
        .then((r) => setClients(r.clients || []))
        .catch(() => setClients([]))
    }, 300)
    return () => clearTimeout(t)
  }, [clientSearch])

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
  const lineProductIds = lines
    .filter((l): l is Extract<BudgetDraftLine, { kind: "catalog" }> => l.kind === "catalog")
    .map((l) => l.product.id)

  const budgetLineItems = budgetDraftLineItems(lines)

  function addLine(p: Product) {
    const existing = lines.find((l) => l.kind === "catalog" && l.product.id === p.id)
    if (existing && existing.kind === "catalog") {
      setLines((prev) =>
        prev.map((l) =>
          l.kind === "catalog" && l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l
        )
      )
      toast.message("Cantidad actualizada", { description: p.name })
      return
    }
    setLines((prev) => [
      ...prev,
      { kind: "catalog", key: p.id, product: p, quantity: 1, unit_price: Number(p.price) || 0 },
    ])
  }

  function addCustomLine(payload: { description: string; quantity: number; unit_price: number }) {
    setLines((prev) => [
      ...prev,
      {
        kind: "custom",
        key: newCustomLineKey(),
        description: payload.description,
        quantity: payload.quantity,
        unit_price: payload.unit_price,
      },
    ])
    toast.message("Ítem agregado", { description: payload.description })
  }

  function updateLine(key: number | string, patch: Partial<Pick<BudgetDraftLine, "quantity" | "unit_price">>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function updateCustomDescription(key: number | string, description: string) {
    setLines((prev) =>
      prev.map((l) => (l.kind === "custom" && l.key === key ? { ...l, description } : l))
    )
  }

  function removeLine(key: number | string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  async function handleSubmit() {
    if (!clientId) {
      toast.error("Elegí un cliente activo")
      return
    }
    if (lines.length === 0) {
      toast.error("Agregá al menos un ítem")
      return
    }
    const invalidCustom = lines.some((l) => l.kind === "custom" && !l.description.trim())
    if (invalidCustom) {
      toast.error("Hay un ítem escrito sin descripción")
      return
    }
    setSubmitting(true)
    try {
      const created = await createCommercialBudget({
        client_id: clientId,
        items: budgetDraftLinesToApiItems(lines),
        valid_until: validUntil.trim() || undefined,
        notes: notes.trim() || undefined,
        allow_inactive: allowInactive,
      })
      toast.success("Presupuesto guardado")
      router.push(`/presupuestos/${created.id}?pdf=1`)
    } catch (e: unknown) {
      const err = e as ApiBudgetError
      if (err.validationErrors?.length) {
        const first = err.validationErrors[0]
        toast.error(first.msg || err.message, { description: first.path })
      } else {
        toast.error(err?.message || "No se pudo crear el presupuesto")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Protected requiredRoles={ROLES_EDITAR}>
      <ERPLayout activeItem="presupuestos">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link href="/presupuestos">
                <ArrowLeft className="h-4 w-4" />
                Volver al listado
              </Link>
            </Button>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nuevo presupuesto</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Guardá el presupuesto y descargá el PDF para el cliente. No se descuenta stock hasta convertir a venta.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
              <CardDescription>Solo clientes activos (misma regla que ventas).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar cliente</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Nombre, email o código…"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
                {clients.length > 0 && (
                  <ul className="border rounded-md divide-y max-h-48 overflow-y-auto bg-popover text-popover-foreground shadow-sm">
                    {clients.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => {
                            setClientId(c.id)
                            setClientLabel(`${c.name} (${c.code})`)
                            setClientSearch("")
                            setClients([])
                          }}
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-muted-foreground text-xs block">{c.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {clientId && (
                <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  Seleccionado: <strong>{clientLabel}</strong>
                  <Button
                    type="button"
                    variant="link"
                    className="text-destructive h-auto p-0 ml-2"
                    onClick={() => {
                      setClientId(null)
                      setClientLabel("")
                    }}
                  >
                    Quitar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Catálogo</CardTitle>
                  <CardDescription>
                    Lista, cuadrícula o vista ampliada. También podés usar <strong>Armado de PC</strong>.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BudgetProductCatalog
                    products={products}
                    loading={loadingProducts}
                    onAddProduct={addLine}
                    lineProductIds={lineProductIds}
                  />
                </CardContent>
              </Card>

              <PosManualItemCard
                onAdd={addCustomLine}
                addLabel="Agregar al presupuesto"
                inputIdPrefix="budget-manual"
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Líneas del presupuesto</CardTitle>
                <CardDescription>Revisá cantidades y precios. Lista, cuadrícula o vista ampliada.</CardDescription>
              </CardHeader>
              <CardContent>
                <BudgetLinesPanel
                  lines={budgetLineItems}
                  total={total}
                  formatMoney={formatMoney}
                  onUpdateQuantity={(key, q) => updateLine(key, { quantity: q })}
                  onUpdateUnitPrice={(key, p) => updateLine(key, { unit_price: p })}
                  onUpdateName={updateCustomDescription}
                  onRemove={removeLine}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Opciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label htmlFor="vu">Válido hasta (opcional)</Label>
                <Input id="vu" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  maxLength={5000}
                  placeholder="Condiciones comerciales, plazos de entrega…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ai"
                  checked={allowInactive}
                  onCheckedChange={(c) => setAllowInactive(c === true)}
                />
                <Label htmlFor="ai" className="text-sm font-normal leading-snug cursor-pointer">
                  Permitir productos inactivos en las líneas
                </Label>
              </div>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex flex-wrap justify-end gap-2 pb-8">
            <Button variant="outline" asChild>
              <Link href="/presupuestos">Cancelar</Link>
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="min-w-[160px] gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar presupuesto
            </Button>
          </div>
        </div>
      </ERPLayout>
    </Protected>
  )
}
