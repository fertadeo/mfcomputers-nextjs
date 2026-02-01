"use client"

import React, { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, Package, DollarSign, BarChart3, Edit, Tag, Image as ImageIcon, Upload, X } from "lucide-react"
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
  const [error, setError] = useState<string | null>(null)
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
      // Imágenes: prioridad a product.images, sino image_url, sino getAllProductImages (incluye WC)
      let urls: string[] = []
      let ids: (number | null)[] = []
      if (product.images && product.images.length > 0) {
        urls = [...product.images]
        const wcIds = product.woocommerce_image_ids ?? []
        ids = urls.map((_, i) => (wcIds[i] != null ? wcIds[i]! : null))
      } else if (product.image_url) {
        urls = [product.image_url]
        ids = [null]
      } else {
        const all = getAllProductImages(product)
        urls = all.length > 0 ? all : []
        ids = urls.map(() => null)
      }
      setImageUrls(urls)
      setWoocommerceImageIds(ids)
      setError(null)
    }
  }, [isOpen, product])

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim()
    if (!url) return
    try {
      new URL(url)
      if (imageUrls.length >= 5) {
        setError("Máximo 5 imágenes")
        return
      }
      setImageUrls((prev) => [...prev, url])
      setWoocommerceImageIds((prev) => [...prev, null])
      setImageUrlInput("")
      setError(null)
    } catch {
      setError("URL de imagen no válida")
    }
  }

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index))
    setWoocommerceImageIds((prev) => prev.filter((_, i) => i !== index))
    setError(null)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const remaining = 5 - imageUrls.length
    if (remaining <= 0) {
      setError("Máximo 5 imágenes")
      e.target.value = ""
      return
    }
    const toAdd = Array.from(files)
      .slice(0, remaining)
      .filter((f) => ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type))
    if (!toAdd.length) {
      setError("Solo se permiten imágenes (jpeg, png, gif, webp)")
      e.target.value = ""
      return
    }
    setUploadingImages(true)
    setError(null)
    try {
      const uploads = await uploadImagesToWordPress(toAdd)
      setImageUrls((prev) => [...prev, ...uploads.map((u) => u.source_url)])
      setWoocommerceImageIds((prev) => [...prev, ...uploads.map((u) => u.id)])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo imágenes")
    } finally {
      setUploadingImages(false)
      e.target.value = ""
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (field === "stock") {
      const stockValue = parseInt(value) || 0
      if (stockValue === 0) {
        setFormData((prev) => ({ ...prev, is_active: "0" }))
      }
    }
    setError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.code.trim()) {
      setError("El código del producto es obligatorio")
      return false
    }
    if (formData.code.trim().length > 20) {
      setError("El código no puede exceder 20 caracteres")
      return false
    }
    if (!formData.name.trim()) {
      setError("El nombre del producto es obligatorio")
      return false
    }
    if (formData.name.trim().length > 100) {
      setError("El nombre no puede exceder 100 caracteres")
      return false
    }
    const price = parseFloat(formData.price)
    if (isNaN(price) || price < 0) {
      setError("El precio debe ser un número mayor o igual a 0")
      return false
    }
    const stock = parseInt(formData.stock) || 0
    if (stock < 0) {
      setError("El stock no puede ser negativo")
      return false
    }
    const minStock = parseInt(formData.min_stock) || 0
    if (minStock < 0) {
      setError("El stock mínimo no puede ser negativo")
      return false
    }
    const maxStock = parseInt(formData.max_stock) || 1000
    if (maxStock < 0) {
      setError("El stock máximo no puede ser negativo")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!product) return
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const stock = parseInt(formData.stock) || 0
      const isActive = stock > 0 ? formData.is_active === "1" : false

      const wcIds = woocommerceImageIds.filter((id): id is number => id != null)
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
        images: imageUrls.length > 0 ? imageUrls : null,
        woocommerce_image_ids: wcIds.length > 0 ? wcIds : undefined,
        sync_to_woocommerce: syncToWooCommerce || undefined,
      }

      const updated = await updateProduct(product.id, payload)

      showToast({ message: "Producto actualizado correctamente.", type: "success" })
      onSuccess(updated)
      onClose()
    } catch (err) {
      console.error("Error al actualizar producto:", err)
      setError(err instanceof Error ? err.message : "Error al actualizar el producto")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      onClose()
    }
  }

  if (!product) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar producto
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {product.name}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

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

              {product.woocommerce_id != null && (
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
