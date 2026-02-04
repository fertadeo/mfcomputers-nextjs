"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Package, DollarSign, BarChart3, Edit, Tag, Image as ImageIcon, Upload, X, ExternalLink } from "lucide-react"
import Image from "next/image"
import {
  Product,
  updateProduct,
  getCategories,
  Category,
  UpdateProductData,
} from "@/lib/api"
import { getAllProductImages } from "@/lib/product-image-utils"
import { uploadImagesToWordPress } from "@/lib/woocommerce-media"
import { useToast } from "@/contexts/ToastContext"

interface EditProductModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
  onSuccess: (updated?: Product) => void
}

interface FormData {
  code: string
  name: string
  description: string
  category_id: string
  price: string
  stock: string
  min_stock: string
  max_stock: string
  is_active: string
}

export function EditProductModal({ product, isOpen, onClose, onSuccess }: EditProductModalProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [syncToWooCommerce, setSyncToWooCommerce] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [woocommerceImageIds, setWoocommerceImageIds] = useState<(number | null)[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<FormData>({
    code: "",
    name: "",
    description: "",
    category_id: "",
    price: "",
    stock: "0",
    min_stock: "0",
    max_stock: "1000",
    is_active: "1",
  })

  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const data = await getCategories()
      setCategories(data ?? [])
    } catch (err) {
      console.error("Error al cargar categorías:", err)
      setCategories([])
    } finally {
      setLoadingCategories(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  // Rellenar formulario cuando se abre con un producto
  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        code: product.code ?? "",
        name: product.name ?? "",
        description: product.description ?? "",
        category_id: product.category_id != null ? String(product.category_id) : "",
        price: String(product.price ?? 0),
        stock: String(product.stock ?? 0),
        min_stock: String(product.min_stock ?? 0),
        max_stock: String(product.max_stock ?? 1000),
        is_active: product.is_active ? "1" : "0",
      })
      setSyncToWooCommerce(false)
      setImageUrlInput("")
      // Imágenes: usar product.images si existe (incluso si es []). Solo usar otras fuentes si images no existe (null/undefined).
      let urls: string[] = []
      let ids: (number | null)[] = []
      if (product.images !== null && product.images !== undefined) {
        // product.images existe (puede ser [] o tener elementos) - usar ese valor directamente
        urls = [...product.images]
        const wcIds = product.woocommerce_image_ids ?? []
        ids = urls.map((_, i) => (wcIds[i] != null ? wcIds[i]! : null))
      } else if (product.image_url) {
        // Solo si images no existe, usar image_url como fallback
        urls = [product.image_url]
        ids = [null]
      } else {
        // Solo si images no existe y no hay image_url, intentar getAllProductImages
        const all = getAllProductImages(product)
        urls = all.length > 0 ? all : []
        ids = urls.map(() => null)
      }
      setImageUrls(urls)
      setWoocommerceImageIds(ids)
    }
  }, [isOpen, product])

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim()
    if (!url) return
    try {
      new URL(url)
      if (imageUrls.length >= 5) {
        showToast({ message: "Máximo 5 imágenes", type: "error" })
        return
      }
      setImageUrls((prev) => [...prev, url])
      setWoocommerceImageIds((prev) => [...prev, null])
      setImageUrlInput("")
    } catch {
      showToast({ message: "URL de imagen no válida", type: "error" })
    }
  }

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
    setWoocommerceImageIds((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const remaining = 5 - imageUrls.length
    if (remaining <= 0) {
      showToast({ message: "Máximo 5 imágenes", type: "error" })
      e.target.value = ""
      return
    }
    const toAdd = Array.from(files)
      .slice(0, remaining)
      .filter((f) => ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type))
    if (!toAdd.length) {
      showToast({ message: "Solo se permiten imágenes (jpeg, png, gif, webp)", type: "error" })
      e.target.value = ""
      return
    }

    // Vista previa inmediata para que se vean las miniaturas al instante
    const newUrls: string[] = []
    const newIds: (number | null)[] = []
    for (const file of toAdd) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string) ?? "")
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      newUrls.push(dataUrl)
      newIds.push(null)
    }
    setImageUrls((prev) => [...prev, ...newUrls])
    setWoocommerceImageIds((prev) => [...prev, ...newIds])

    setUploadingImages(true)
    try {
      const uploads = await uploadImagesToWordPress(toAdd)
      setImageUrls((prev) => {
        const start = prev.length - uploads.length
        const next = [...prev]
        uploads.forEach((u, i) => {
          if (next[start + i] !== undefined) next[start + i] = u.source_url
        })
        return next
      })
      setWoocommerceImageIds((prev) => {
        const start = prev.length - uploads.length
        const next = [...prev]
        uploads.forEach((u, i) => {
          if (next[start + i] !== undefined) next[start + i] = u.id
        })
        return next
      })
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : "Error subiendo imágenes",
        type: "error",
      })
    } finally {
      setUploadingImages(false)
      e.target.value = ""
    }
  }

  // Al enfocar un input numérico con valor "0", seleccionar todo para que al escribir se reemplace (no "01")
  const handleNumericFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === "0" || v === "0.00") e.target.select()
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === "stock") {
      const stockValue = parseInt(value) || 0
      if (stockValue === 0) {
        setFormData((prev) => ({ ...prev, is_active: "0" }))
      }
    }
  }

  const validateForm = (): string | null => {
    if (!formData.code.trim()) return "El código del producto es obligatorio"
    if (formData.code.trim().length > 20) return "El código no puede exceder 20 caracteres"
    if (!formData.name.trim()) return "El nombre del producto es obligatorio"
    if (formData.name.trim().length > 100) return "El nombre no puede exceder 100 caracteres"
    const price = parseFloat(formData.price)
    if (isNaN(price) || price < 0) return "El precio debe ser un número mayor o igual a 0"
    const stock = parseInt(formData.stock) || 0
    if (stock < 0) return "El stock no puede ser negativo"
    const minStock = parseInt(formData.min_stock) || 0
    if (minStock < 0) return "El stock mínimo no puede ser negativo"
    const maxStock = parseInt(formData.max_stock) || 1000
    if (maxStock < 0) return "El stock máximo no puede ser negativo"
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    const validationError = validateForm()
    if (validationError) {
      showToast({ message: validationError, type: "error" })
      return
    }

    setLoading(true)

    try {
      const stock = parseInt(formData.stock) || 0
      const isActive = stock > 0 ? formData.is_active === "1" : false

      // Lista final de imágenes: solo URLs públicas (http/https). La API interpreta images como reemplazo.
      // No enviar woocommerce_image_ids; la API lo gestiona internamente al actualizar images.
      const validImageUrls = imageUrls.filter(
        (url) =>
          typeof url === "string" &&
          (url.startsWith("http://") || url.startsWith("https://"))
      )

      const payload: UpdateProductData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        price: parseFloat(formData.price),
        stock,
        min_stock: parseInt(formData.min_stock) || 0,
        max_stock: parseInt(formData.max_stock) || 1000,
        is_active: isActive,
        images: validImageUrls,
        sync_to_woocommerce: syncToWooCommerce || undefined,
      }

      const updated = await updateProduct(product.id, payload)

      showToast({ message: "Producto actualizado correctamente.", type: "success" })
      onSuccess(updated)
      onClose()
    } catch (err) {
      console.error("Error al actualizar producto:", err)
      showToast({
        message: err instanceof Error ? err.message : "Error al actualizar el producto",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) onClose()
  }

  if (!product) return null

  const wcBaseUrl = (process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || "https://mfcomputers.com.ar").replace(/\/+$/, "")
  const wcSlug = product.woocommerce_slug?.replace(/^\/+|\/+$/g, "").trim()
  const wcProductUrl = wcSlug ? `${wcBaseUrl}/${wcSlug}` : null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar producto
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {product.name}
            </p>
            {wcProductUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                asChild
              >
                <a href={wcProductUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Ver producto en WC
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Información básica</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Código *</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => handleInputChange("code", e.target.value)}
                    maxLength={20}
                    placeholder="PROD-001"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Select
                    value={formData.category_id || "__none__"}
                    onValueChange={(v) => handleInputChange("category_id", v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin categoría</SelectItem>
                      {categories
                        .filter((c) => c.is_active !== false)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            <span className="flex items-center gap-2">
                              <Tag className="h-3 w-3" />
                              {cat.name}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  maxLength={100}
                  placeholder="Nombre del producto"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Descripción del producto"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Precio y stock</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Precio *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleInputChange("price", e.target.value)}
                      onFocus={handleNumericFocus}
                      className="h-10 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stock</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => handleInputChange("stock", e.target.value)}
                    onFocus={handleNumericFocus}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-min-stock">Stock mínimo</Label>
                  <Input
                    id="edit-min-stock"
                    type="number"
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => handleInputChange("min_stock", e.target.value)}
                    onFocus={handleNumericFocus}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-max-stock">Stock máximo</Label>
                  <Input
                    id="edit-max-stock"
                    type="number"
                    min="0"
                    value={formData.max_stock}
                    onChange={(e) => handleInputChange("max_stock", e.target.value)}
                    onFocus={handleNumericFocus}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={formData.is_active}
                  onValueChange={(v) => handleInputChange("is_active", v)}
                  disabled={parseInt(formData.stock) === 0}
                >
                  <SelectTrigger className="h-10 w-full sm:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Activo</SelectItem>
                    <SelectItem value="0">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
                {parseInt(formData.stock) === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Con stock 0 el producto se guardará como inactivo.
                  </p>
                )}
              </div>

              {product.woocommerce_id != null ? (
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="edit-sync-woo"
                    checked={syncToWooCommerce}
                    onChange={(e) => setSyncToWooCommerce(e.target.checked)}
                    className="h-4 w-4 rounded border-primary"
                  />
                  <Label htmlFor="edit-sync-woo" className="text-sm cursor-pointer">
                    Sincronizar cambios con WooCommerce
                  </Label>
                </div>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-500 pt-2">
                  Este producto aún no está sincronizado con WooCommerce. Sincronizalo desde el detalle del producto para poder enviar cambios.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Imágenes</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Hasta 5 imágenes. Agregá URLs o subí archivos al equipo (se cargan a la galería de WooCommerce). JPG, PNG, GIF, WebP · máx. 10 MB c/u.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUrls.length >= 5 || uploadingImages}
                  className="h-10"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingImages ? "Subiendo…" : "Subir a WooCommerce"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <div className="flex gap-2 flex-1 min-w-[200px]">
                  <Input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="h-10 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddImageUrl()
                      }
                    }}
                    disabled={imageUrls.length >= 5}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddImageUrl}
                    disabled={!imageUrlInput.trim() || imageUrls.length >= 5}
                    className="h-10 shrink-0"
                  >
                    Agregar URL
                  </Button>
                </div>
              </div>
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative group aspect-square rounded-lg overflow-hidden bg-muted border">
                      <Image
                        src={url}
                        alt={`Imagen ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="120px"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `https://via.placeholder.com/120?text=Error`
                        }}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
