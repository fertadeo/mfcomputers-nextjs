"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BudgetProductCatalog } from "@/components/budget-product-catalog"
import { PosManualItemCard } from "@/components/pos-manual-item-card"
import { PosCartItemRow } from "@/components/pos-cart-item-row"
import {
  getClienteById,
  getClientes,
  getProductById,
  getProducts,
  updateSale,
  type Cliente,
  type Product,
  type SalePaymentMethod,
  type SaleResponseData,
  type UpdateSaleRequest,
} from "@/lib/api"
import {
  getPosCartLineKey,
  newCustomLineId,
  type PosCartLine,
} from "@/lib/pos-cart"
import { canAddPosCatalogProduct } from "@/lib/pos-products"
import {
  posCartLinesToCreateSaleItems,
  saleItemCatalogProductIds,
  saleItemsToPosCartLines,
} from "@/lib/sale-items"
import {
  clienteRequiresZeroItemIva,
  effectiveSaleItemIvaRate,
} from "@/lib/facturacion-cliente-fiscal"
import { computeSaleIvaBreakdown, productIvaRate, type SaleIvaRate } from "@/lib/sale-iva"
import { SaleEditConfirmDialog } from "@/components/sale-edit-confirm-dialog"
import {
  buildSaleEditConfirmSummary,
  cartToLineSnapshots,
  clientLabelFromSale,
  type SaleEditConfirmSummary,
  type SaleEditOriginalSnapshot,
} from "@/lib/sale-edit-summary"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Save, Search } from "lucide-react"
import { toast } from "sonner"

const PAYMENT_LABELS: Record<SalePaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

const FORMAT_NUM = { maximumFractionDigits: 0, minimumFractionDigits: 0 } as const

function formatMoney(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 })
}

interface SaleEditModalProps {
  sale: SaleResponseData | null
  isOpen: boolean
  onClose: () => void
  onSaved: (sale: SaleResponseData) => void
}

export function SaleEditModal({ sale, isOpen, onClose, onSaved }: SaleEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [originalTotal, setOriginalTotal] = useState(0)
  const [clientId, setClientId] = useState<number | null>(null)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [clientDisplayName, setClientDisplayName] = useState("Consumidor final")
  const [originalSnapshot, setOriginalSnapshot] = useState<SaleEditOriginalSnapshot | null>(null)
  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<Cliente[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmSummary, setConfirmSummary] = useState<SaleEditConfirmSummary | null>(null)
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("efectivo")
  const [originalPaymentMethod, setOriginalPaymentMethod] = useState<SalePaymentMethod>("efectivo")
  const [paymentDetails, setPaymentDetails] = useState({ efectivo: 0, tarjeta: 0, transferencia: 0 })
  const [allowInactive, setAllowInactive] = useState(false)
  const [syncWoo, setSyncWoo] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [dirty, setDirty] = useState(false)

  const initFromSale = useCallback(async (s: SaleResponseData) => {
    setLoading(true)
    try {
      const ids = saleItemCatalogProductIds(s.items || [])
      const productById: Record<number, Product> = {}
      await Promise.all(
        ids.map(async (id) => {
          try {
            productById[id] = await getProductById(id)
          } catch {
            /* stub en saleItemsToPosCartLines */
          }
        })
      )
      const initialCart = saleItemsToPosCartLines(s.items || [], productById)
      const clientLabel = clientLabelFromSale(s.client_id, s.client_name)
      setCart(initialCart)
      setOriginalTotal(s.total_amount)
      setClientId(s.client_id)
      setSelectedCliente(null)
      setClientDisplayName(clientLabel)
      if (s.client_id) {
        void getClienteById(s.client_id)
          .then((cliente) => setSelectedCliente(cliente))
          .catch(() => setSelectedCliente(null))
      }
      setOriginalSnapshot({
        clientId: s.client_id,
        clientLabel,
        notes: s.notes ?? "",
        paymentMethod: s.payment_method,
        total: s.total_amount,
        lines: cartToLineSnapshots(initialCart),
      })
      setNotes(s.notes ?? "")
      setPaymentMethod(s.payment_method)
      setOriginalPaymentMethod(s.payment_method)
      const pd = s.payment_details
      setPaymentDetails({
        efectivo: pd?.efectivo ?? (s.payment_method === "mixto" ? 0 : s.total_amount),
        tarjeta: pd?.tarjeta ?? 0,
        transferencia: pd?.transferencia ?? 0,
      })
      setAllowInactive(false)
      setSyncWoo(s.sync_status === "synced")
      setDirty(false)
      setShowAddProduct(false)
      setClientSearch("")
      setClients([])
      setConfirmOpen(false)
      setConfirmSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && sale) {
      void initFromSale(sale)
    }
  }, [isOpen, sale?.id, initFromSale, sale])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setLoadingProducts(true)
    getProducts(1, 500, false)
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data as { products: Product[] }).products || []
        setProducts(list)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

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

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [cart]
  )

  const totalChanged = Math.abs(total - originalTotal) >= 0.01
  const paymentMethodChanged = paymentMethod !== originalPaymentMethod
  const needsMixtoDetails =
    paymentMethod === "mixto" && (totalChanged || paymentMethodChanged)

  const mixtoSum = paymentDetails.efectivo + paymentDetails.tarjeta + paymentDetails.transferencia
  const mixtoValid = !needsMixtoDetails || Math.abs(mixtoSum - total) < 0.02

  const ivaBreakdown = useMemo(
    () =>
      computeSaleIvaBreakdown(
        cart.map((line) => ({
          subtotal: line.quantity * line.unit_price,
          iva_rate: line.iva_rate,
        }))
      ),
    [cart]
  )

  const requiresZeroItemIva = useMemo(
    () => clienteRequiresZeroItemIva(selectedCliente),
    [selectedCliente]
  )

  useEffect(() => {
    if (!isOpen || !requiresZeroItemIva) return
    setCart((prev) =>
      prev.some((line) => line.iva_rate !== 0)
        ? prev.map((line) => (line.iva_rate === 0 ? line : { ...line, iva_rate: 0 as SaleIvaRate }))
        : prev
    )
  }, [isOpen, requiresZeroItemIva, selectedCliente?.id])

  const lineProductIds = useMemo(
    () =>
      cart
        .filter((l) => l.kind === "catalog")
        .map((l) => (l.kind === "catalog" ? l.product.id : 0)),
    [cart]
  )

  function markDirty() {
    setDirty(true)
  }

  function addProductLine(p: Product) {
    if (!canAddPosCatalogProduct(p)) {
      toast.error("Sin stock disponible para este producto")
      return
    }
    const exists = cart.find((l) => l.kind === "catalog" && l.product.id === p.id)
    if (exists) {
      setCart((prev) =>
        prev.map((l) =>
          l.kind === "catalog" && l.product.id === p.id
            ? { ...l, quantity: l.quantity + 1 }
            : l
        )
      )
    } else {
      setCart((prev) => [
        ...prev,
        {
          kind: "catalog",
          product: p,
          quantity: 1,
          unit_price: Number(p.price) || 0,
          iva_rate: effectiveSaleItemIvaRate(productIvaRate(p), selectedCliente),
        },
      ])
    }
    markDirty()
    toast.message("Producto agregado", { description: p.name })
  }

  function addCustomLine(payload: {
    description: string
    quantity: number
    unit_price: number
    iva_rate?: SaleIvaRate
  }) {
    setCart((prev) => [
      ...prev,
      {
        kind: "custom",
        lineId: newCustomLineId(),
        description: payload.description,
        quantity: payload.quantity,
        unit_price: payload.unit_price,
        iva_rate: effectiveSaleItemIvaRate(payload.iva_rate ?? 21, selectedCliente),
      },
    ])
    markDirty()
  }

  function updateCartQuantity(lineKey: string, delta: number) {
    setCart((prev) => {
      const item = prev.find((i) => getPosCartLineKey(i) === lineKey)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((i) => getPosCartLineKey(i) !== lineKey)
      return prev.map((i) =>
        getPosCartLineKey(i) === lineKey ? { ...i, quantity: newQty } : i
      )
    })
    markDirty()
  }

  function removeFromCart(lineKey: string) {
    setCart((prev) => prev.filter((i) => getPosCartLineKey(i) !== lineKey))
    markDirty()
  }

  function setCartUnitPrice(lineKey: string, unit_price: number) {
    setCart((prev) =>
      prev.map((i) => (getPosCartLineKey(i) === lineKey ? { ...i, unit_price } : i))
    )
    markDirty()
  }

  function setCartIvaRate(lineKey: string, iva_rate: SaleIvaRate) {
    setCart((prev) =>
      prev.map((i) => (getPosCartLineKey(i) === lineKey ? { ...i, iva_rate } : i))
    )
    markDirty()
  }

  function validateBeforeSave(): boolean {
    if (!sale) return false
    if (cart.length === 0) {
      toast.error("La venta debe tener al menos un ítem")
      return false
    }
    const invalidCustom = cart.some((i) => i.kind === "custom" && !i.description.trim())
    if (invalidCustom) {
      toast.error("Hay un ítem manual sin descripción")
      return false
    }
    if (needsMixtoDetails && !mixtoValid) {
      toast.error("En pago mixto, la suma debe coincidir con el nuevo total", {
        description: `${formatMoney(mixtoSum)} ≠ ${formatMoney(total)}`,
      })
      return false
    }
    return true
  }

  function buildUpdateBody(): UpdateSaleRequest {
    const body: UpdateSaleRequest = {
      client_id: clientId,
      notes: notes.trim() || null,
      items: posCartLinesToCreateSaleItems(cart),
      allow_inactive: allowInactive || undefined,
      sync_to_woocommerce: syncWoo || undefined,
    }
    if (paymentMethodChanged) {
      body.payment_method = paymentMethod
    }
    if (needsMixtoDetails) {
      body.payment_method = "mixto"
      body.payment_details = {
        efectivo: paymentDetails.efectivo,
        tarjeta: paymentDetails.tarjeta,
        transferencia: paymentDetails.transferencia,
      }
    }
    return body
  }

  function openConfirmSave() {
    if (!sale || !originalSnapshot) return
    if (!validateBeforeSave()) return
    const summary = buildSaleEditConfirmSummary({
      original: originalSnapshot,
      clientId,
      clientLabel: clientDisplayName,
      notes,
      paymentMethod,
      paymentLabel: (m) => PAYMENT_LABELS[m],
      total,
      cart,
    })
    setConfirmSummary(summary)
    setConfirmOpen(true)
  }

  async function performSave() {
    if (!sale) return
    setSaving(true)
    try {
      const updated = await updateSale(sale.id, buildUpdateBody())
      toast.success("Venta actualizada")
      setDirty(false)
      setConfirmOpen(false)
      setConfirmSummary(null)
      onSaved(updated)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la venta")
    } finally {
      setSaving(false)
    }
  }

  const clientChanged = originalSnapshot != null && clientId !== originalSnapshot.clientId

  const [handleOpenChangeInner, confirmDialog] = useConfirmBeforeClose(
    () => onClose(),
    "¿Descartar cambios?",
    "Hay modificaciones sin guardar en esta venta."
  )

  function handleOpenChange(open: boolean) {
    if (open) return
    if (dirty) {
      handleOpenChangeInner(false)
    } else {
      onClose()
    }
  }

  if (!sale) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar venta #{sale.sale_number}</DialogTitle>
            <DialogDescription>
              Corregí cliente, ítems, IVA o notas. Enviá siempre el carrito completo al guardar.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando venta…
            </div>
          ) : (
            <div className="space-y-5 py-1">
              {totalChanged && (
                <Alert
                  variant="warning"
                  title="El total cambió"
                  description={`De ${formatMoney(originalTotal)} a ${formatMoney(total)}.${
                    originalPaymentMethod === "mixto" || paymentMethod === "mixto"
                      ? " Redistribuí el pago mixto antes de guardar."
                      : " La caja se actualizará automáticamente."
                  }`}
                />
              )}

              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar cliente activo…"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value)
                      markDirty()
                    }}
                  />
                </div>
                {clients.length > 0 && (
                  <ul className="border rounded-md max-h-36 overflow-y-auto divide-y max-w-md">
                    {clients.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                          onClick={() => {
                            setClientId(c.id)
                            setSelectedCliente(c)
                            setClientDisplayName(c.name)
                            setClientSearch("")
                            setClients([])
                            markDirty()
                          }}
                        >
                          {c.name} <span className="text-muted-foreground">({c.code})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Cliente seleccionado:</span>
                  <span className="font-medium">{clientDisplayName}</span>
                  {clientChanged && originalSnapshot && (
                    <>
                      <Badge variant="secondary" className="text-[10px]">
                        Cambiado
                      </Badge>
                      <span className="text-xs text-muted-foreground w-full sm:w-auto">
                        Antes: {originalSnapshot.clientLabel}
                      </span>
                    </>
                  )}
                </div>
                {requiresZeroItemIva ? (
                  <Alert
                    variant="warning"
                    title="Factura C — sin IVA discriminado"
                    description="Este cliente recibe Factura C: los ítems deben estar al 0% (exento) para que ARCA acepte el comprobante."
                  />
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Ítems</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setShowAddProduct((v) => !v)}
                  >
                    <Plus className="h-4 w-4" />
                    Agregar producto
                  </Button>
                </div>
                {showAddProduct && (
                  <div className="rounded-lg border p-3 bg-muted/20">
                    <BudgetProductCatalog
                      products={products}
                      loading={loadingProducts}
                      onAddProduct={addProductLine}
                      lineProductIds={lineProductIds}
                    />
                  </div>
                )}
                <PosManualItemCard
                  onAdd={addCustomLine}
                  addLabel="Agregar ítem manual"
                  inputIdPrefix="sale-edit-manual"
                  lockIvaToZero={requiresZeroItemIva}
                />
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="border-b bg-muted/30 text-left">
                        <th className="p-2 w-10" />
                        <th className="p-2">Producto</th>
                        <th className="p-2 text-center">Cant.</th>
                        <th className="p-2 text-right">P. unit.</th>
                        <th className="p-2 text-right">IVA</th>
                        <th className="p-2 text-right">Subtotal</th>
                        <th className="p-2 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-muted-foreground">
                            Sin ítems — agregá al menos uno
                          </td>
                        </tr>
                      ) : (
                        cart.map((line) => (
                          <PosCartItemRow
                            key={getPosCartLineKey(line)}
                            line={line}
                            view="table"
                            onUpdateQuantity={updateCartQuantity}
                            onSetUnitPrice={setCartUnitPrice}
                            onSetIvaRate={setCartIvaRate}
                            onRemove={removeFromCart}
                            ivaRateDisabled={requiresZeroItemIva}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Neto gravado: ${ivaBreakdown.netoGravado.toLocaleString("es-AR", FORMAT_NUM)}
                </p>
                <p className="text-lg font-bold tabular-nums">
                  Total: ${total.toLocaleString("es-AR", FORMAT_NUM)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Método de pago</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) => {
                      setPaymentMethod(v as SalePaymentMethod)
                      markDirty()
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAYMENT_LABELS) as SalePaymentMethod[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {PAYMENT_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {needsMixtoDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs">Efectivo</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentDetails.efectivo}
                      onChange={(e) => {
                        setPaymentDetails((p) => ({
                          ...p,
                          efectivo: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                        markDirty()
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tarjeta</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentDetails.tarjeta}
                      onChange={(e) => {
                        setPaymentDetails((p) => ({
                          ...p,
                          tarjeta: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                        markDirty()
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Transferencia</Label>
                    <Input
                      type="number"
                      min={0}
                      value={paymentDetails.transferencia}
                      onChange={(e) => {
                        setPaymentDetails((p) => ({
                          ...p,
                          transferencia: Math.max(0, parseFloat(e.target.value) || 0),
                        }))
                        markDirty()
                      }}
                    />
                  </div>
                  <p className="sm:col-span-3 text-xs text-muted-foreground">
                    Suma: {formatMoney(mixtoSum)} — debe ser {formatMoney(total)}
                    {!mixtoValid && (
                      <span className="text-destructive ml-1">No coincide</span>
                    )}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  rows={3}
                  maxLength={5000}
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value)
                    markDirty()
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sale-edit-inactive"
                    checked={allowInactive}
                    onCheckedChange={(c) => {
                      setAllowInactive(c === true)
                      markDirty()
                    }}
                  />
                  <Label htmlFor="sale-edit-inactive" className="text-sm font-normal cursor-pointer">
                    Permitir productos inactivos
                  </Label>
                </div>
                {sale.sync_status === "synced" && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sale-edit-woo"
                      checked={syncWoo}
                      onCheckedChange={(c) => {
                        setSyncWoo(c === true)
                        markDirty()
                      }}
                    />
                    <Label htmlFor="sale-edit-woo" className="text-sm font-normal cursor-pointer">
                      Re-sincronizar con WooCommerce al guardar
                    </Label>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={openConfirmSave}
              disabled={loading || saving || cart.length === 0 || (needsMixtoDetails && !mixtoValid)}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Revisar y guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
      <SaleEditConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setConfirmOpen(false)
            setConfirmSummary(null)
          }
        }}
        summary={confirmSummary}
        saleNumber={sale.sale_number}
        saving={saving}
        onConfirm={() => void performSave()}
      />
    </>
  )
}
