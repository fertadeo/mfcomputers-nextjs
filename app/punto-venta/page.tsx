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
  getAccessToken,
  type Product,
  type Cliente,
  type SalePaymentMethod,
  type SaleResponseData,
  type CreateSaleRequest,
} from "@/lib/api"
import { Search, Plus, Minus, Trash2, Receipt, User, CreditCard, Banknote, Wallet, AlertCircle, LayoutGrid, LayoutList, Maximize2, Loader2, Check } from "lucide-react"
import Link from "next/link"
import { getProductImageUrl } from "@/lib/product-image-utils"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { generateSaleReceiptPdf } from "@/lib/generate-sale-receipt-pdf"

const PAYMENT_LABELS: Record<SalePaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

const FORMAT_NUM = { maximumFractionDigits: 0, minimumFractionDigits: 0 } as const

/** Formato de precio con punto para miles (ej: 66157 → "66.157") */
function formatUnitPrice(n: number): string {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 })
}

function parseUnitPriceInput(value: string): number {
  const digits = value.replace(/\D/g, "")
  return digits === "" ? 0 : Math.max(0, parseInt(digits, 10))
}

function isInactiveWithStock(p: Product): boolean {
  const inactive = p.is_active === false || (typeof p.is_active === "number" && p.is_active === 0)
  return !!inactive && p.stock > 0
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
  const [lastSalePdfData, setLastSalePdfData] = useState<{
    sale: SaleResponseData
    cartItems: CartItem[]
    clientName: string
  } | null>(null)
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const [cartViewMode, setCartViewMode] = useState<"list" | "grid">("list")
  const [productsViewMode, setProductsViewMode] = useState<"list" | "grid">("list")
  const [openProductsModal, setOpenProductsModal] = useState(false)
  const [openCartModal, setOpenCartModal] = useState(false)
  const [showInactiveProductAlert, setShowInactiveProductAlert] = useState(false)
  const [productsModalFilter, setProductsModalFilter] = useState<"all" | "active" | "inactive" | "out_of_stock">("all")
  const [addingProductId, setAddingProductId] = useState<number | null>(null)
  const [addedProductId, setAddedProductId] = useState<number | null>(null)

  const total = useMemo(
    () => cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [cart]
  )

  useEffect(() => {
    loadProducts()
  }, [])

  function checkAuthForSale() {
    const hasAuth = !!getAccessToken() || !!getPosApiKey()
    setApiKeyMissing(!hasAuth)
  }

  useEffect(() => {
    checkAuthForSale()
  }, [])

  useEffect(() => {
    const onFocus = () => checkAuthForSale()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
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
    const term = searchProduct.trim().toLowerCase()
    const list = term
      ? products.filter(
          (p) =>
            p.name?.toLowerCase().includes(term) ||
            p.code?.toLowerCase().includes(term) ||
            p.category_name?.toLowerCase().includes(term)
        )
      : products
    return [...list.slice(0, 50)].sort((a, b) => (a.stock < 1 ? 1 : 0) - (b.stock < 1 ? 1 : 0))
  }, [products, searchProduct])

  const productsModalList = useMemo(() => {
    const isActive = (p: Product) => !!p.is_active
    switch (productsModalFilter) {
      case "active":
        return filteredProducts.filter((p) => isActive(p) && p.stock >= 1)
      case "inactive":
        return filteredProducts.filter((p) => !isActive(p))
      case "out_of_stock":
        return filteredProducts.filter((p) => p.stock < 1)
      default:
        return filteredProducts
    }
  }, [filteredProducts, productsModalFilter])

  function addToCart(product: Product, qty = 1) {
    if (product.stock < 1) return
    if (isInactiveWithStock(product)) {
      setShowInactiveProductAlert(true)
      return
    }
    addToCartInternal(product, qty)
  }

  function handleAddToCartClick(product: Product, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (product.stock < 1 || addingProductId != null) return
    if (isInactiveWithStock(product)) {
      setShowInactiveProductAlert(true)
      return
    }
    setAddingProductId(product.id)
    addToCartInternal(product)
    const id = product.id
    const t1 = setTimeout(() => {
      setAddingProductId(null)
      setAddedProductId(id)
    }, 300)
    const t2 = setTimeout(() => setAddedProductId(null), 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }

  function addToCartInternal(product: Product, qty = 1) {
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
    setLastSalePdfData(null)
    setError(null)
  }

  const mixtoSum = paymentDetails.efectivo + paymentDetails.tarjeta + paymentDetails.transferencia
  const mixtoValid = paymentMethod !== "mixto" || Math.abs(mixtoSum - total) < 0.02

  async function handleCobrar() {
    const cartSnapshot = [...cart]
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
      setLastSalePdfData({
        sale,
        cartItems: cartSnapshot,
        clientName: clientDisplay,
      })
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
              <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm flex-1">
                  Para registrar ventas tenés que estar logueado o configurar la API Key en Configuración.
                  Sin autenticación no se puede enviar la venta al servidor.
                </p>
                <Button asChild variant="outline" size="sm" className="shrink-0 border-amber-600 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50">
                  <Link href="/configuracion?tab=pos">Configurar API Key</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Columna izquierda: búsqueda + productos + carrito */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Productos
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant={productsViewMode === "list" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setProductsViewMode("list")}
                      title="Vista lista"
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={productsViewMode === "grid" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setProductsViewMode("grid")}
                      title="Vista cuadrícula"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setOpenProductsModal(true)}
                      title="Ver lista completa en pantalla ampliada"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                    ) : productsViewMode === "list" ? (
                      <div className="space-y-1">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addToCart(p)}
                            disabled={p.stock < 1}
                            className="flex items-center gap-3 w-full p-2 rounded-lg border bg-card hover:bg-muted/50 text-left disabled:opacity-50 disabled:pointer-events-none"
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium truncate">{p.name}</p>
                                {p.stock < 1 && (
                                  <Badge variant="destructive" className="text-xs shrink-0">
                                    Agotado
                                  </Badge>
                                )}
                                {isInactiveWithStock(p) && (
                                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-xs shrink-0">
                                    Inactivo
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                ${Number(p.price).toLocaleString("es-AR", FORMAT_NUM)} · Stock {p.stock}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={addedProductId === p.id ? "shrink-0 bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:text-white" : "shrink-0"}
                              onClick={(e) => handleAddToCartClick(p, e)}
                              disabled={p.stock < 1 || addingProductId === p.id}
                            >
                              {addingProductId === p.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : addedProductId === p.id ? (
                                <Check className="h-4 w-4 mr-1" />
                              ) : (
                                <Plus className="h-4 w-4 mr-1" />
                              )}
                              {addingProductId === p.id ? "" : addedProductId === p.id ? "Agregado" : "Agregar"}
                            </Button>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {filteredProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={(e) => handleAddToCartClick(p, e)}
                            disabled={p.stock < 1 || addingProductId === p.id}
                            className="flex flex-col gap-2 p-2 rounded-lg border bg-card hover:bg-muted/50 text-left disabled:opacity-50 disabled:pointer-events-none"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-medium truncate">{p.name}</p>
                                  {p.stock < 1 && (
                                    <Badge variant="destructive" className="text-[10px] shrink-0 px-1">
                                      Agotado
                                    </Badge>
                                  )}
                                  {isInactiveWithStock(p) && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-[10px] shrink-0 px-1">
                                      Inactivo
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  ${Number(p.price).toLocaleString("es-AR", FORMAT_NUM)} · Stock {p.stock}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-1 min-h-[28px] text-xs">
                              {addingProductId === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : addedProductId === p.id ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Agregado
                                </span>
                              ) : (
                                <span className="text-muted-foreground">+ Agregar</span>
                              )}
                            </div>
                          </button>
                    ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Carrito
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    {cart.length > 0 && (
                      <>
                        <Button
                          variant={cartViewMode === "list" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCartViewMode("list")}
                          title="Vista lista"
                        >
                          <LayoutList className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={cartViewMode === "grid" ? "secondary" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCartViewMode("grid")}
                          title="Vista cuadrícula"
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={clearCart}>
                          Vaciar
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setOpenCartModal(true)}
                      title="Ver carrito completo en pantalla ampliada"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">El carrito está vacío</p>
                  ) : cartViewMode === "list" ? (
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
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-xs text-muted-foreground">$</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  className="w-24 h-7 text-xs"
                                  placeholder="0"
                                  value={item.unit_price === 0 ? "" : formatUnitPrice(Math.round(item.unit_price))}
                                  onChange={(e) =>
                                    setCartUnitPrice(item.product.id, parseUnitPriceInput(e.target.value))
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">
                            ${(item.quantity * item.unit_price).toLocaleString("es-AR", FORMAT_NUM)}
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
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="rounded-lg border bg-card p-2 flex flex-col gap-1.5"
                        >
                          <div className="relative aspect-square rounded overflow-hidden bg-muted min-h-[60px]">
                            {item.product.images?.[0] ? (
                              <Image
                                src={getProductImageUrl(item.product, { size: 80 })}
                                alt={item.product.name}
                                fill
                                className="object-contain"
                                sizes="80px"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                                Sin imagen
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-medium truncate leading-tight" title={item.product.name}>
                            {item.product.name}
                          </p>
                          <div className="flex items-center justify-between gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </Button>
                            <span className="text-xs font-medium tabular-nums">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => updateCartQuantity(item.product.id, 1)}
                              disabled={item.quantity >= item.product.stock}
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">$</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              className="h-6 text-xs w-20"
                              placeholder="0"
                              value={item.unit_price === 0 ? "" : formatUnitPrice(Math.round(item.unit_price))}
                              onChange={(e) =>
                                setCartUnitPrice(item.product.id, parseUnitPriceInput(e.target.value))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold">
                              ${(item.quantity * item.unit_price).toLocaleString("es-AR", FORMAT_NUM)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-600"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {cart.length > 0 && (
                    <p className="text-sm font-semibold mt-3 pt-2 border-t">
                      Subtotal: ${total.toLocaleString("es-AR", FORMAT_NUM)}
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
                          Suma: ${mixtoSum.toLocaleString("es-AR", FORMAT_NUM)} — Total: $
                          {total.toLocaleString("es-AR", FORMAT_NUM)}
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
                    maxLength={1000}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <div className="text-2xl font-bold text-turquoise-600">
                    Total: ${total.toLocaleString("es-AR", FORMAT_NUM)}
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

            </div>
          </div>

          {/* Modal vista ampliada — Productos */}
          <Dialog open={openProductsModal} onOpenChange={setOpenProductsModal}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-4 p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Productos — Vista ampliada
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                <Input
                  placeholder="Buscar por nombre, código o categoría..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="max-w-md"
                />
                <Tabs value={productsModalFilter} onValueChange={(v) => setProductsModalFilter(v as "all" | "active" | "inactive" | "out_of_stock")} className="flex-1 flex flex-col min-h-0">
                  <TabsList className="grid w-full max-w-md grid-cols-4">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="active">Activos</TabsTrigger>
                    <TabsTrigger value="inactive">Inactivos</TabsTrigger>
                    <TabsTrigger value="out_of_stock">Agotados</TabsTrigger>
                  </TabsList>
                <div className="border rounded-md overflow-auto flex-1 min-h-[320px] mt-3">
                  {loadingProducts ? (
                    <p className="p-4 text-sm text-muted-foreground">Cargando productos...</p>
                  ) : productsModalList.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">Sin resultados</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-200 dark:bg-slate-800 [&_th]:bg-slate-200 [&_th]:dark:bg-slate-800 [&_th]:border-b [&_th]:border-border">
                          <th className="text-left p-2 w-14">Imagen</th>
                          <th className="text-left p-2">Código</th>
                          <th className="text-left p-2">Nombre</th>
                          <th className="text-left p-2">Categoría</th>
                          <th className="text-right p-2">Precio</th>
                          <th className="text-right p-2">Stock</th>
                          <th className="text-right p-2 w-24">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productsModalList.map((p) => (
                          <tr key={p.id} className="border-t hover:bg-muted/30">
                            <td className="p-2">
                              <div className="relative h-10 w-10 rounded overflow-hidden bg-muted inline-block">
                                <Image
                                  src={getProductImageUrl(p, { size: 80 })}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              </div>
                            </td>
                            <td className="p-2 font-mono text-xs">{p.code ?? "—"}</td>
                            <td className="p-2">
                              <span className="font-medium">{p.name}</span>
                              {p.stock < 1 && (
                                <Badge variant="destructive" className="ml-1.5 text-xs">
                                  Agotado
                                </Badge>
                              )}
                              {isInactiveWithStock(p) && (
                                <Badge variant="secondary" className="ml-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 text-xs">
                                  Inactivo
                                </Badge>
                              )}
                            </td>
                            <td className="p-2 text-muted-foreground">{p.category_name ?? "—"}</td>
                            <td className="p-2 text-right">${Number(p.price).toLocaleString("es-AR", FORMAT_NUM)}</td>
                            <td className="p-2 text-right">{p.stock}</td>
                            <td className="p-2 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className={addedProductId === p.id ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 hover:text-white" : ""}
                                onClick={() => handleAddToCartClick(p)}
                                disabled={p.stock < 1 || addingProductId === p.id}
                              >
                                {addingProductId === p.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : addedProductId === p.id ? (
                                  <Check className="h-4 w-4 mr-1" />
                                ) : (
                                  <Plus className="h-4 w-4 mr-1" />
                                )}
                                {addingProductId === p.id ? "" : addedProductId === p.id ? "Agregado" : "Agregar"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>

          {/* Modal vista ampliada — Carrito */}
          <Dialog open={openCartModal} onOpenChange={setOpenCartModal}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-4 p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Carrito — Vista ampliada
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3 flex-1 min-h-0">
                {cart.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">El carrito está vacío</p>
                ) : (
                  <>
                    <div className="border rounded-md overflow-auto flex-1 min-h-[280px]">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-2 w-14">Imagen</th>
                            <th className="text-left p-2">Producto</th>
                            <th className="text-center p-2 w-28">Cantidad</th>
                            <th className="text-right p-2 w-28">P. unit.</th>
                            <th className="text-right p-2 w-24">Subtotal</th>
                            <th className="text-right p-2 w-20">Quitar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((item) => (
                            <tr key={item.product.id} className="border-t hover:bg-muted/30">
                              <td className="p-2">
                                <div className="relative h-10 w-10 rounded overflow-hidden bg-muted inline-block">
                                  <Image
                                    src={getProductImageUrl(item.product, { size: 80 })}
                                    alt={item.product.name}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                </div>
                              </td>
                              <td className="p-2 font-medium">{item.product.name}</td>
                              <td className="p-2">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateCartQuantity(item.product.id, -1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center tabular-nums">{item.quantity}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateCartQuantity(item.product.id, 1)}
                                    disabled={item.quantity >= item.product.stock}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="p-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                <span className="text-xs text-muted-foreground">$</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  className="w-24 h-8 text-xs inline-block"
                                  placeholder="0"
                                  value={item.unit_price === 0 ? "" : formatUnitPrice(Math.round(item.unit_price))}
                                  onChange={(e) =>
                                    setCartUnitPrice(item.product.id, parseUnitPriceInput(e.target.value))
                                  }
                                />
                              </div>
                              </td>
                              <td className="p-2 text-right font-medium">
                                ${(item.quantity * item.unit_price).toLocaleString("es-AR", FORMAT_NUM)}
                              </td>
                              <td className="p-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600"
                                  onClick={() => removeFromCart(item.product.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-lg font-semibold pt-2 border-t">
                      Total: ${total.toLocaleString("es-AR", FORMAT_NUM)}
                    </p>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Alert producto inactivo (no se puede vender) */}
          {showInactiveProductAlert && (
            <Alert
              variant="warning"
              floating
              title="Producto inactivo"
              action={
                <Button variant="outline" size="sm" onClick={() => setShowInactiveProductAlert(false)}>
                  Cerrar
                </Button>
              }
            >
              Este producto se encuentra con stock pero inactivo. Activálo desde la sección de productos para poder venderlo.
            </Alert>
          )}

          {/* Alert flotante — Venta registrada */}
          {lastSale && (
            <Alert
              variant="success"
              floating
              title="Venta registrada"
              action={
                <div className="flex flex-col gap-2">
                  {lastSalePdfData && (
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() =>
                        generateSaleReceiptPdf({
                          sale: lastSalePdfData.sale,
                          cartItems: lastSalePdfData.cartItems,
                          clientName: lastSalePdfData.clientName,
                        })
                      }
                    >
                      Descargar comprobante de venta
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="w-full" onClick={clearCart}>
                    Nueva venta
                  </Button>
                </div>
              }
            >
              <div className="space-y-0.5 mt-1">
                <p className="font-mono font-medium">
                  {String(lastSale.sale_number ?? "").replace(/^[^\d]*/, "") || lastSale.sale_number}
                </p>
                <p>Total: ${lastSale.total_amount.toLocaleString("es-AR", FORMAT_NUM)}</p>
                <p>Método: {PAYMENT_LABELS[lastSale.payment_method]}</p>
              </div>
            </Alert>
          )}
        </div>
      </ERPLayout>
    </Protected>
  )
}
