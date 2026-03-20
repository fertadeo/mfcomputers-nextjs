"use client"

import { useState, useEffect, useMemo, useRef } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  getClientes,
  getProducts,
  createRepairOrder,
  addRepairOrderItem,
  type CreateRepairOrderBody,
  type Product,
} from "@/lib/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Wrench, Loader2, Search, UserPlus, Package, Plus, Trash2, ArrowLeft } from "lucide-react"
import Image from "next/image"
import { getProductImageUrl } from "@/lib/product-image-utils"
import { NewClientModal } from "@/components/new-client-modal"

interface NewRepairOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (createdId?: number) => void
}

interface ClientOption {
  id: number
  name: string
}

interface PendingItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
}

export function NewRepairOrderModal({ isOpen, onClose, onSuccess }: NewRepairOrderModalProps) {
  const [clientSearchQuery, setClientSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ClientOption[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  /** Cliente elegido de la lista: evita que el debounce vuelva a abrir el dropdown con el mismo texto. */
  const [selectedClientPreview, setSelectedClientPreview] = useState<ClientOption | null>(null)
  const clientSearchSeq = useRef(0)
  const [newClientModalOpen, setNewClientModalOpen] = useState(false)
  const today = () => new Date().toISOString().slice(0, 10)
  const [formData, setFormData] = useState({
    client_id: 0,
    equipment_description: "",
    diagnosis: "",
    work_description: "",
    reception_date: today(),
    delivery_date_estimated: "",
    labor_amount: "",
    notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Materiales (productos) a utilizar en la reparación
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
  const [productSearchQuery, setProductSearchQuery] = useState("")
  const [newItemProductId, setNewItemProductId] = useState<number | "">("")
  const [newItemQuantity, setNewItemQuantity] = useState("1")
  const [newItemUnitPrice, setNewItemUnitPrice] = useState("")
  const [step, setStep] = useState<1 | 2>(1)
  const pendingItemsTotal = useMemo(
    () => pendingItems.reduce((acc, item) => acc + item.quantity * item.unit_price, 0),
    [pendingItems]
  )

  // Búsqueda de clientes con debounce (no corre si ya hay cliente confirmado)
  useEffect(() => {
    if (!isOpen) return
    if (selectedClientPreview) {
      setSearchResults([])
      setLoadingSearch(false)
      return
    }
    const query = clientSearchQuery.trim()
    if (query.length < 1) {
      setSearchResults([])
      return
    }
    const t = setTimeout(() => {
      const seq = ++clientSearchSeq.current
      setLoadingSearch(true)
      getClientes(1, 50, query, "active")
        .then((res) => {
          if (seq !== clientSearchSeq.current) return
          const list = (res.clients || []).map((c: { id: number; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
          setSearchResults(list)
        })
        .catch(() => {
          if (seq !== clientSearchSeq.current) return
          setSearchResults([])
        })
        .finally(() => {
          if (seq !== clientSearchSeq.current) return
          setLoadingSearch(false)
        })
    }, 300)
    return () => clearTimeout(t)
  }, [isOpen, clientSearchQuery, selectedClientPreview])

  // Cargar productos al abrir el modal
  useEffect(() => {
    if (!isOpen) return
    setLoadingProducts(true)
    getProducts(1, 200)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res as { products: Product[] }).products || []
        setProducts(list)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false))
  }, [isOpen])

  const selectedProduct = products.find((p) => p.id === newItemProductId)

  // Filtrar productos por búsqueda (nombre o código)
  const filteredProducts = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase()
    if (q.length < 1) return products.slice(0, 30)
    return products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q))
      )
      .slice(0, 30)
  }, [products, productSearchQuery])

  // Al abrir el modal, resetear formulario y búsqueda (fecha de recepción = hoy)
  useEffect(() => {
    if (!isOpen) return
    setFormData((prev) => ({
      ...prev,
      client_id: 0,
      equipment_description: "",
      diagnosis: "",
      work_description: "",
      reception_date: today(),
      delivery_date_estimated: "",
      labor_amount: "",
      notes: "",
    }))
    setClientSearchQuery("")
    setSearchResults([])
    setSelectedClientPreview(null)
    clientSearchSeq.current += 1
    setPendingItems([])
    setProductSearchQuery("")
    setNewItemProductId("")
    setNewItemQuantity("1")
    setNewItemUnitPrice("")
    setStep(1)
  }, [isOpen])

  const selectClient = (c: ClientOption) => {
    clientSearchSeq.current += 1
    setLoadingSearch(false)
    setFormData((prev) => ({ ...prev, client_id: c.id }))
    setClientSearchQuery(c.name)
    setSearchResults([])
    setSelectedClientPreview(c)
  }

  const clearClient = () => {
    clientSearchSeq.current += 1
    setFormData((prev) => ({ ...prev, client_id: 0 }))
    setClientSearchQuery("")
    setSearchResults([])
    setSelectedClientPreview(null)
    setLoadingSearch(false)
  }

  const addPendingItem = () => {
    if (!selectedProduct || !newItemQuantity || !newItemUnitPrice) return
    const q = parseInt(newItemQuantity, 10)
    const price = parseFloat(newItemUnitPrice.replace(",", "."))
    if (isNaN(q) || q < 1 || isNaN(price) || price < 0) return
    setPendingItems((prev) => [
      ...prev,
      {
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        quantity: q,
        unit_price: price,
      },
    ])
    setProductSearchQuery("")
    setNewItemProductId("")
    setNewItemQuantity("1")
    setNewItemUnitPrice("")
  }

  const selectProductForItem = (p: Product) => {
    setNewItemProductId(p.id)
    setProductSearchQuery(p.name)
    if (!newItemUnitPrice || newItemUnitPrice === "0") setNewItemUnitPrice(String(p.price ?? 0))
  }

  const clearProductSelection = () => {
    setNewItemProductId("")
    setProductSearchQuery("")
    setNewItemUnitPrice("")
  }

  const removePendingItem = (index: number) => {
    setPendingItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleNewClientSuccess = (created?: { id: number; name: string }) => {
    setNewClientModalOpen(false)
    if (created) {
      clientSearchSeq.current += 1
      setLoadingSearch(false)
      setFormData((prev) => ({ ...prev, client_id: created.id }))
      setClientSearchQuery(created.name)
      setSearchResults([])
      setSelectedClientPreview({ id: created.id, name: created.name })
    }
  }

  const validate = (): boolean => {
    const err: Record<string, string> = {}
    if (!formData.client_id) err.client_id = "Seleccioná o buscá un cliente. Si no existe, crealo."
    if (!formData.equipment_description.trim()) err.equipment_description = "Descripción del equipo obligatoria"
    if (!formData.reception_date) err.reception_date = "Fecha de recepción obligatoria"
    if (formData.delivery_date_estimated && formData.reception_date) {
      if (new Date(formData.delivery_date_estimated) < new Date(formData.reception_date)) {
        err.delivery_date_estimated = "La fecha estimada de entrega no puede ser anterior a la de recepción"
      }
    }
    setFieldErrors(err)
    return Object.keys(err).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(null)
    try {
      const body: CreateRepairOrderBody = {
        client_id: formData.client_id,
        equipment_description: formData.equipment_description.trim(),
        reception_date: formData.reception_date,
      }
      if (formData.diagnosis.trim()) body.diagnosis = formData.diagnosis.trim()
      if (formData.work_description.trim()) body.work_description = formData.work_description.trim()
      if (formData.delivery_date_estimated.trim()) body.delivery_date_estimated = formData.delivery_date_estimated
      const labor = parseFloat(formData.labor_amount.replace(",", "."))
      if (!Number.isNaN(labor) && labor > 0) body.labor_amount = labor
      if (formData.notes.trim()) body.notes = formData.notes.trim()

      const res = await createRepairOrder(body)
      const order = res.data
      const orderId = order?.id
      if (orderId && pendingItems.length > 0) {
        for (const item of pendingItems) {
          await addRepairOrderItem(orderId, {
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })
        }
      }
      onSuccess(orderId)
      onClose()
      setFormData((prev) => ({
        ...prev,
        client_id: 0,
        equipment_description: "",
        diagnosis: "",
        work_description: "",
        reception_date: "",
        delivery_date_estimated: "",
        labor_amount: "",
        notes: "",
      }))
      setClientSearchQuery("")
      setSearchResults([])
      setSelectedClientPreview(null)
      clientSearchSeq.current += 1
      setPendingItems([])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al crear la orden"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) onClose()
  }

  const [handleOpenChange, confirmDialog] = useConfirmBeforeClose((open) => {
    if (!open) handleClose()
  })

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {step === 1 ? "Nueva orden de reparación" : "Paso 2: Materiales a utilizar"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Registrá la entrada del equipo. El estado inicial será «Consulta recibida»."
              : "Agregá los productos del stock que se van a usar. El stock se descuenta cuando el cliente acepte el presupuesto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_search">Cliente *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="client_search"
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={clientSearchQuery}
                  onChange={(e) => {
                    const v = e.target.value
                    setClientSearchQuery(v)
                    if (!v.trim()) {
                      clearClient()
                      return
                    }
                    if (selectedClientPreview && v !== selectedClientPreview.name) {
                      clientSearchSeq.current += 1
                      setSelectedClientPreview(null)
                      setFormData((prev) => ({ ...prev, client_id: 0 }))
                    }
                  }}
                  onFocus={() => {
                    if (selectedClientPreview) return
                    if (clientSearchQuery.trim().length >= 1 && searchResults.length === 0 && !loadingSearch) {
                      const seq = ++clientSearchSeq.current
                      getClientes(1, 50, clientSearchQuery.trim(), "active")
                        .then((res) => {
                          if (seq !== clientSearchSeq.current) return
                          const list = (res.clients || []).map((c: { id: number; name: string }) => ({
                            id: c.id,
                            name: c.name,
                          }))
                          setSearchResults(list)
                        })
                        .catch(() => {
                          if (seq !== clientSearchSeq.current) return
                          setSearchResults([])
                        })
                    }
                  }}
                  className={`pl-9 ${selectedClientPreview ? "pr-16" : ""}`}
                />
                {selectedClientPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                    onClick={clearClient}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
              {!selectedClientPreview && (searchResults.length > 0 || loadingSearch) && (
                <ul className="border rounded-md divide-y max-h-40 overflow-y-auto bg-background z-10 shadow-md">
                  {loadingSearch && (
                    <li className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                    </li>
                  )}
                  {!loadingSearch && searchResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => selectClient(c)}
                      >
                        {c.name}
                      </button>
                    </li>
                  ))}
                  {!loadingSearch && searchResults.length > 0 && (
                    <li className="border-t">
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-muted flex items-center gap-2"
                        onClick={() => setNewClientModalOpen(true)}
                      >
                        <UserPlus className="h-4 w-4" /> Crear nuevo cliente
                      </button>
                    </li>
                  )}
                </ul>
              )}
              {selectedClientPreview && (
                <div className="border rounded-md p-3 bg-muted/50">
                  <p className="text-sm font-medium text-primary">
                    Cliente seleccionado: {selectedClientPreview.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tocá «Limpiar» o editá el nombre para buscar otro cliente.
                  </p>
                </div>
              )}
              {!loadingSearch &&
                !selectedClientPreview &&
                formData.client_id === 0 &&
                clientSearchQuery.trim().length >= 1 &&
                searchResults.length === 0 && (
                <div className="border rounded-md p-3 flex flex-col gap-2">
                  <p className="text-sm text-muted-foreground">No se encontraron clientes.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => setNewClientModalOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" /> Crear nuevo cliente
                  </Button>
                </div>
              )}
              {fieldErrors.client_id && (
                <p className="text-sm text-destructive">{fieldErrors.client_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reception_date">Fecha de recepción *</Label>
              <Input
                id="reception_date"
                type="date"
                value={formData.reception_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, reception_date: e.target.value }))}
                max={today()}
              />
              {fieldErrors.reception_date && (
                <p className="text-sm text-destructive">{fieldErrors.reception_date}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment_description">Descripción del equipo *</Label>
            <Textarea
              id="equipment_description"
              placeholder="Marca, modelo, falla aparente…"
              value={formData.equipment_description}
              onChange={(e) => setFormData((prev) => ({ ...prev, equipment_description: e.target.value }))}
              rows={2}
            />
            {fieldErrors.equipment_description && (
              <p className="text-sm text-destructive">{fieldErrors.equipment_description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnóstico (presupuesto)</Label>
            <Textarea
              id="diagnosis"
              placeholder="Diagnóstico del problema"
              value={formData.diagnosis}
              onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="work_description">Trabajo a realizar</Label>
            <Textarea
              id="work_description"
              placeholder="Detalle del trabajo para el cliente"
              value={formData.work_description}
              onChange={(e) => setFormData((prev) => ({ ...prev, work_description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delivery_date_estimated">Fecha estimada de entrega</Label>
              <Input
                id="delivery_date_estimated"
                type="date"
                value={formData.delivery_date_estimated}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, delivery_date_estimated: e.target.value }))
                }
                min={formData.reception_date || undefined}
              />
              {fieldErrors.delivery_date_estimated && (
                <p className="text-sm text-destructive">{fieldErrors.delivery_date_estimated}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="labor_amount">Mano de obra ($)</Label>
              <Input
                id="labor_amount"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={formData.labor_amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, labor_amount: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              placeholder="Notas opcionales"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={1}
            />
          </div>

          {/* Resumen materiales (Paso 1) */}
          <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <span className="font-medium">Materiales a utilizar (opcional)</span>
              </div>
              {pendingItems.length > 0 && (
                <span className="text-sm text-muted-foreground">{pendingItems.length} material(es) agregado(s)</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Podés agregar productos del stock ahora o después de crear la orden.
            </p>
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full sm:w-auto">
              <Package className="h-4 w-4 mr-2" />
              {pendingItems.length > 0 ? "Ver o editar materiales (Paso 2)" : "Agregar materiales (Paso 2)"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear orden
            </Button>
          </DialogFooter>
            </>
          ) : (
            <>
          <div className="rounded-lg border p-3 md:p-4 space-y-4 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              className="-ml-2"
              onClick={() => setStep(1)}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver al resumen (Paso 1)
            </Button>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Buscar producto</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      placeholder={loadingProducts ? "Cargando productos..." : "Buscar por nombre o código"}
                      value={productSearchQuery}
                      onChange={(e) => {
                        setProductSearchQuery(e.target.value)
                        if (!e.target.value.trim()) clearProductSelection()
                        else setNewItemProductId("")
                      }}
                      disabled={loadingProducts}
                      className={`pl-9 ${newItemProductId ? "pr-16" : ""}`}
                    />
                    {!!newItemProductId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                        onClick={clearProductSelection}
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>

                {!newItemProductId && (
                  <div className="rounded-md border bg-background overflow-hidden">
                    <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                      {loadingProducts
                        ? "Cargando productos..."
                        : filteredProducts.length > 0
                        ? "Seleccioná un producto de la lista"
                        : "Sin resultados para la búsqueda actual"}
                    </div>
                    {filteredProducts.length > 0 && (
                      <ul className="max-h-72 overflow-y-auto divide-y">
                        {filteredProducts.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-3"
                              onClick={() => selectProductForItem(p)}
                            >
                              <span className="relative flex-shrink-0 block w-11 h-11 rounded overflow-hidden bg-muted">
                                <Image
                                  src={getProductImageUrl(p, { size: 96 })}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="44px"
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="font-medium block truncate">{p.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {p.code ? `${p.code} · ` : ""}Stock: {p.stock ?? 0}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {!!newItemProductId && selectedProduct && (
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground mb-2">Producto seleccionado</p>
                    <div className="flex items-center gap-3">
                      <span className="relative flex-shrink-0 block w-12 h-12 rounded overflow-hidden bg-muted">
                        <Image
                          src={getProductImageUrl(selectedProduct, { size: 96 })}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="text-sm font-medium block truncate">{selectedProduct.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedProduct.code ? `${selectedProduct.code} · ` : ""}Stock: {selectedProduct.stock ?? 0}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="rounded-md border bg-background p-3 space-y-3">
                  <p className="text-sm font-medium">Agregar material</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Cantidad</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Precio unitario ($)</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={newItemUnitPrice}
                        onChange={(e) => setNewItemUnitPrice(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={addPendingItem}
                    disabled={!selectedProduct || !newItemQuantity || !newItemUnitPrice || loadingProducts}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Agregar material a la orden
                  </Button>
                </div>

                <div className="rounded-md border bg-background">
                  <div className="flex items-center justify-between px-3 py-2 border-b">
                    <p className="text-sm font-medium">Materiales cargados</p>
                    <span className="text-xs text-muted-foreground">
                      {pendingItems.length} item(s)
                    </span>
                  </div>
                  {pendingItems.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Aun no agregaste materiales.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-14"></TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead className="w-20">Cant.</TableHead>
                            <TableHead className="text-right">P. unit.</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingItems.map((item, index) => {
                            const prod = products.find((x) => x.id === item.product_id)
                            return (
                              <TableRow key={`${item.product_id}-${index}`}>
                                <TableCell className="w-14">
                                  {prod && (
                                    <span className="relative inline-block w-10 h-10 rounded overflow-hidden bg-muted">
                                      <Image
                                        src={getProductImageUrl(prod, { size: 80 })}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        sizes="40px"
                                      />
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                  ${item.unit_price.toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell className="text-right">
                                  ${(item.quantity * item.unit_price).toLocaleString("es-AR")}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => removePendingItem(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Total de materiales</span>
                    <span className="font-semibold">
                      ${pendingItemsTotal.toLocaleString("es-AR")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3">
            <Button type="button" onClick={() => setStep(1)} className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" /> Guardar materiales y volver al Paso 1
            </Button>
          </DialogFooter>
            </>
          )}

        </form>
      </DialogContent>
    </Dialog>
    {confirmDialog}
    <NewClientModal
      isOpen={newClientModalOpen}
      onClose={() => setNewClientModalOpen(false)}
      onSuccess={handleNewClientSuccess}
    />
    </>
  )
}
