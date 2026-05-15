"use client"

import { useEffect, useMemo, useState } from "react"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

const ROLES_EDITAR: Role[] = ["admin", "gerencia", "ventas"]

interface Line {
  product: Product
  quantity: number
  unit_price: number
}

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

  const [productSearch, setProductSearch] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<Line[]>([])

  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [allowInactive, setAllowInactive] = useState(false)

  const [loadingProducts, setLoadingProducts] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getProducts(1, 400, false)
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

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products.slice(0, 40)
    return products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.code?.toLowerCase().includes(q) ||
          p.category_name?.toLowerCase().includes(q)
      )
      .slice(0, 60)
  }, [products, productSearch])

  const total = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unit_price, 0), [lines])

  function addLine(p: Product) {
    const existing = lines.find((l) => l.product.id === p.id)
    if (existing) {
      setLines((prev) =>
        prev.map((l) => (l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      )
      toast.message("Cantidad actualizada", { description: p.name })
      return
    }
    setLines((prev) => [...prev, { product: p, quantity: 1, unit_price: Number(p.price) || 0 }])
  }

  function updateLine(pid: number, patch: Partial<Pick<Line, "quantity" | "unit_price">>) {
    setLines((prev) => prev.map((l) => (l.product.id === pid ? { ...l, ...patch } : l)))
  }

  function removeLine(pid: number) {
    setLines((prev) => prev.filter((l) => l.product.id !== pid))
  }

  async function handleSubmit() {
    if (!clientId) {
      toast.error("Elegí un cliente activo")
      return
    }
    if (lines.length === 0) {
      toast.error("Agregá al menos un producto")
      return
    }
    setSubmitting(true)
    try {
      const created = await createCommercialBudget({
        client_id: clientId,
        items: lines.map((l) => ({
          product_id: l.product.id,
          quantity: Math.max(1, Math.floor(l.quantity)),
          unit_price: Math.max(0, l.unit_price),
        })),
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
        <div className="max-w-5xl mx-auto space-y-6">
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

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Catálogo</CardTitle>
                <CardDescription>Tocá un producto para agregarlo al presupuesto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  placeholder="Filtrar productos…"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  disabled={loadingProducts}
                />
                <div className="border rounded-md max-h-[420px] overflow-y-auto divide-y">
                  {loadingProducts ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                      Cargando catálogo…
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <p className="p-6 text-sm text-muted-foreground text-center">Sin resultados</p>
                  ) : (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addLine(p)}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/80 flex justify-between gap-2 items-start"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm leading-snug truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.code}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-medium tabular-nums">{formatMoney(p.price)}</div>
                          <div className="text-[10px] text-muted-foreground">stock {p.stock}</div>
                        </div>
                        <Plus className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Líneas del presupuesto</CardTitle>
                <CardDescription className="tabular-nums">Total estimado: {formatMoney(total)}</CardDescription>
              </CardHeader>
              <CardContent>
                {lines.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Agregá productos desde el panel izquierdo.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-24">Cant.</TableHead>
                        <TableHead className="w-32 text-right">P. unit.</TableHead>
                        <TableHead className="w-36 text-right">Subtotal</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l) => (
                        <TableRow key={l.product.id}>
                          <TableCell>
                            <div className="font-medium text-sm">{l.product.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{l.product.code}</div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              className="h-8"
                              value={l.quantity}
                              onChange={(e) =>
                                updateLine(l.product.id, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-8 text-right"
                              value={l.unit_price}
                              onChange={(e) =>
                                updateLine(l.product.id, { unit_price: Math.max(0, parseFloat(e.target.value) || 0) })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatMoney(l.quantity * l.unit_price)}
                          </TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(l.product.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
