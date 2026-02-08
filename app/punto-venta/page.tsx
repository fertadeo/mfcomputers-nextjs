"use client"

import { useState, useEffect, useMemo } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  getProducts,
  getClientes,
  createSale,
  getPosApiKey,
  type Product,
  type Cliente,
  type SalePaymentMethod,
  type SaleResponseData,
  type CreateSaleRequest,
} from "@/lib/api"
import { Search, Plus, Minus, Trash2, Receipt, User, CreditCard, Banknote, Wallet, AlertCircle } from "lucide-react"
import { getProductImageUrl } from "@/lib/product-image-utils"
import Image from "next/image"

const PAYMENT_LABELS: Record<SalePaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
}

export default function PuntoVentaPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [searchProduct, setSearchProduct] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<Cliente[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("efectivo")
  const [paymentDetails, setPaymentDetails] = useState({ efectivo: 0, tarjeta: 0, transferencia: 0 })
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSale, setLastSale] = useState<SaleResponseData | null>(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [cart]
  )

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (!getPosApiKey()) setApiKeyMissing(true)
  }, [])

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

  async function loadProducts() {
    try {
      setLoadingProducts(true)
      const data = await getProducts(1, 500, false)
      const list = Array.isArray(data) ? data : (data as { products: Product[] }).products || []
      setProducts(list)
    } catch (e) {
      console.error(e)
      setError("No se pudieron cargar los productos")
    } finally {
      setLoadingProducts(false)
    }
  }

  const filteredProducts = useMemo(() => {
    if (!searchProduct.trim()) return products.slice(0, 50)
    const term = searchProduct.trim().toLowerCase()
    return products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(term) ||
          p.code?.toLowerCase().includes(term) ||
          p.category_name?.toLowerCase().includes(term)
      )
      .slice(0, 50)
  }, [products, searchProduct])

  function addToCart(product: Product, qty = 1) {
    if (product.stock < 1) return
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        const newQty = Math.min(existing.quantity + qty, product.stock)
        if (newQty <= 0) return prev.filter((i) => i.product.id !== product.id)
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: newQty } : i
        )
      }
      return [...prev, { product, quantity: Math.min(qty, product.stock), unit_price: product.price }]
    })
  }

  function updateCartQuantity(productId: number, delta: number) {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId)
      if (!item) return prev
      const newQty = item.quantity + delta
      if (newQty <= 0) return prev.filter((i) => i.product.id !== productId)
      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQty } : i
      )
    })
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function setCartUnitPrice(productId: number, unit_price: number) {
    if (unit_price < 0) return
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, unit_price } : i
      )
    )
  }

  function clearCart() {
    setCart([])
    setLastSale(null)
    setError(null)
  }

  const mixtoSum = paymentDetails.efectivo + paymentDetails.tarjeta + paymentDetails.transferencia
  const mixtoValid = paymentMethod !== "mixto" || Math.abs(mixtoSum - total) < 0.02

  async function handleCobrar() {
    if (cart.length === 0) {
      setError("Agregá al menos un producto al carrito")
      return
    }
    if (paymentMethod === "mixto" && !mixtoValid) {
      setError("La suma de efectivo + tarjeta + transferencia debe coincidir con el total")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const body: CreateSaleRequest = {
        items: cart.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        payment_method: paymentMethod,
        client_id: selectedClientId ?? undefined,
        notes: notes.trim() || undefined,
        sync_to_woocommerce: true,
      }
      if (paymentMethod === "mixto") {
        body.payment_details = {
          efectivo: paymentDetails.efectivo,
          tarjeta: paymentDetails.tarjeta,
          transferencia: paymentDetails.transferencia,
        }
      }
      const sale = await createSale(body)
      setLastSale(sale)
      setCart([])
      setNotes("")
      setPaymentDetails({ efectivo: 0, tarjeta: 0, transferencia: 0 })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la venta")
    } finally {
      setSubmitting(false)
    }
  }

  const selectedClient = selectedClientId
    ? clients.find((c) => c.id === selectedClientId)
    : null
  const clientDisplay =
    selectedClient?.name ?? (selectedClientId ? `Cliente #${selectedClientId}` : "Consumidor final")

  return (
    <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
      <ERPLayout activeItem="punto-venta">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Punto de venta</h1>
            <p className="text-muted-foreground">Ventas en local físico</p>
          </div>

          {apiKeyMissing && (
            <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="flex items-center gap-3 pt-4">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <p className="text-sm">
                  Configurá la API Key para punto de venta para poder registrar ventas. Sin ella no se
                  puede enviar la venta al servidor.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Columna izquierda: búsqueda + productos + carrito */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Productos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Buscar por nombre, código o categoría..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="max-w-md"
                  />
                  <div className="max-h-[280px] overflow-y-auto border rounded-md p-2">
                    {loadingProducts ? (
                      <p className="text-sm text-muted-foreground">Cargando productos...</p>
                    ) : filteredProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin resultados</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addToCart(p)}
                            disabled={p.stock < 1}
                            className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 text-left disabled:opacity-50 disabled:pointer-events-none"
                          >
                            <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-muted">
                              <Image
                                src={getProductImageUrl(p, { size: 80 })}
                                alt={p.name}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                ${Number(p.price).toLocaleString("es-AR")} · Stock {p.stock}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Carrito
                  </CardTitle>
                  {cart.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearCart}>
                      Vaciar
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">El carrito está vacío</p>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateCartQuantity(item.product.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateCartQuantity(item.product.id, 1)}
                                disabled={item.quantity >= item.product.stock}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                className="w-24 h-7 text-xs"
                                value={item.unit_price}
                                onChange={(e) =>
                                  setCartUnitPrice(item.product.id, Number(e.target.value) || 0)
                                }
                                min={0}
                                step={0.01}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">
                            ${(item.quantity * item.unit_price).toLocaleString("es-AR")}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  {cart.length > 0 && (
                    <p className="text-sm font-semibold mt-3 pt-2 border-t">
                      Subtotal: ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Columna derecha: cliente, pago, total, cobrar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Input
                    placeholder="Buscar cliente (opcional)"
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value)
                      if (!e.target.value) setSelectedClientId(null)
                    }}
                  />
                  {clients.length > 0 && (
                    <ul className="border rounded-md divide-y max-h-32 overflow-y-auto">
                      {clients.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => {
                              setSelectedClientId(c.id)
                              setClientSearch(c.name)
                              setClients([])
                            }}
                          >
                            {c.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Actual: <strong>{clientDisplay}</strong>
                  </p>
                  {selectedClientId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedClientId(null)
                        setClientSearch("")
                      }}
                    >
                      Usar Consumidor final
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Método de pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(["efectivo", "tarjeta", "transferencia", "mixto"] as const).map((method) => (
                      <Button
                        key={method}
                        variant={paymentMethod === method ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPaymentMethod(method)}
                      >
                        {method === "efectivo" && <Banknote className="h-4 w-4 mr-1" />}
                        {method === "tarjeta" && <CreditCard className="h-4 w-4 mr-1" />}
                        {method === "transferencia" && <Wallet className="h-4 w-4 mr-1" />}
                        {method === "mixto" && <Receipt className="h-4 w-4 mr-1" />}
                        {PAYMENT_LABELS[method]}
                      </Button>
                    ))}
                  </div>
                  {paymentMethod === "mixto" && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Desglose (debe sumar el total)</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <Label className="text-xs">Efectivo</Label>
                          <Input
                            type="number"
                            value={paymentDetails.efectivo || ""}
                            onChange={(e) =>
                              setPaymentDetails((p) => ({
                                ...p,
                                efectivo: Number(e.target.value) || 0,
                              }))
                            }
                            min={0}
                            step={0.01}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tarjeta</Label>
                          <Input
                            type="number"
                            value={paymentDetails.tarjeta || ""}
                            onChange={(e) =>
                              setPaymentDetails((p) => ({
                                ...p,
                                tarjeta: Number(e.target.value) || 0,
                              }))
                            }
                            min={0}
                            step={0.01}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Transferencia</Label>
                          <Input
                            type="number"
                            value={paymentDetails.transferencia || ""}
                            onChange={(e) =>
                              setPaymentDetails((p) => ({
                                ...p,
                                transferencia: Number(e.target.value) || 0,
                              }))
                            }
                            min={0}
                            step={0.01}
                          />
                        </div>
                      </div>
                      {!mixtoValid && total > 0 && (
                        <p className="text-xs text-red-600">
                          Suma: ${mixtoSum.toLocaleString("es-AR")} — Total: $
                          {total.toLocaleString("es-AR")}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    placeholder="Máx. 1000 caracteres"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
                    rows={2}
                    className="resize-none"
                  />
                  <div className="text-2xl font-bold text-turquoise-600">
                    Total: ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 p-2 rounded bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCobrar}
                    disabled={cart.length === 0 || submitting || (paymentMethod === "mixto" && !mixtoValid) || apiKeyMissing}
                  >
                    {submitting ? "Procesando..." : "Cobrar"}
                  </Button>
                </CardContent>
              </Card>

              {lastSale && (
                <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-green-800 dark:text-green-200">
                      Venta registrada
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>
                      <strong>{lastSale.sale_number}</strong>
                    </p>
                    <p>Total: ${lastSale.total_amount.toLocaleString("es-AR")}</p>
                    <p>Método: {PAYMENT_LABELS[lastSale.payment_method]}</p>
                    <Button variant="outline" size="sm" className="mt-2 w-full" onClick={clearCart}>
                      Nueva venta
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </ERPLayout>
    </Protected>
  )
}
