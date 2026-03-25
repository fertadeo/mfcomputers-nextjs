"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useConfirmBeforeClose } from "@/lib/use-confirm-before-close"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getProducts } from "@/lib/api"
import { addRepairOrderItem } from "@/lib/api"
import type { Product } from "@/lib/api"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-input"
import { Package, Loader2 } from "lucide-react"

interface RepairOrderAddItemModalProps {
  orderId: number | string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RepairOrderAddItemModal({
  orderId,
  isOpen,
  onClose,
  onSuccess,
}: RepairOrderAddItemModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productId, setProductId] = useState<number | "">("")
  const [quantity, setQuantity] = useState("1")
  const [unitPrice, setUnitPrice] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedProduct = products.find((p) => p.id === productId)

  useEffect(() => {
    if (!isOpen) return
    setLoadingProducts(true)
    const fetchProducts = async () => {
      try {
        const res = await getProducts(1, 200)
        const list = Array.isArray(res) ? res : (res as { products: Product[] }).products || []
        setProducts(list)
      } catch {
        setProducts([])
      } finally {
        setLoadingProducts(false)
      }
    }
    fetchProducts()
  }, [isOpen])

  useEffect(() => {
    if (selectedProduct != null) {
      const p = Number(selectedProduct.price ?? 0)
      if (!unitPrice || parseCurrencyInput(unitPrice) === 0) setUnitPrice(formatCurrencyInput(p))
    }
  }, [selectedProduct?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !quantity || !unitPrice) {
      setError("Completá producto, cantidad y precio unitario")
      return
    }
    const q = parseInt(quantity, 10)
    const price = parseCurrencyInput(unitPrice)
    if (isNaN(q) || q < 1 || price < 0) {
      setError("Cantidad debe ser ≥ 1 y precio ≥ 0")
      return
    }
    setLoading(true)
    setError(null)
    try {
      await addRepairOrderItem(orderId, {
        product_id: productId,
        quantity: q,
        unit_price: price,
      })
      onSuccess()
      onClose()
      setProductId("")
      setQuantity("1")
      setUnitPrice("")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al agregar ítem")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => onClose()

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Agregar material
          </DialogTitle>
          <DialogDescription>
            Producto del stock a usar en la reparación. El stock se descuenta al aceptar el presupuesto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Producto</Label>
            <Select
              value={productId ? String(productId) : ""}
              onValueChange={(v) => setProductId(v ? parseInt(v, 10) : "")}
              disabled={loadingProducts}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingProducts ? "Cargando…" : "Seleccionar producto"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} {p.code ? `(${p.code})` : ""} — Stock: {p.stock ?? 0}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Precio unitario ($)</Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="$0,00"
                value={unitPrice}
                onChange={(e) => {
                  const v = parseCurrencyInput(e.target.value)
                  setUnitPrice(v > 0 || e.target.value.trim() ? formatCurrencyInput(v) : "")
                }}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    </>
  )
}
