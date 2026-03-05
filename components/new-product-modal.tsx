"use client"

import React, { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Upload, X, Image as ImageIcon, Package, DollarSign, TrendingUp, Sparkles, Tag, BarChart3, Zap, Plus, AlertTriangle, Ruler, Truck } from "lucide-react"
import Image from "next/image"
import { createProductNew, getCategories, Category, CreateProductData } from "@/lib/api"
import { generateProductCodes } from "@/lib/product-codes"
import { uploadImagesToWordPress } from "@/lib/woocommerce-media"
import { CategoryManagerPanel } from "@/components/category-manager-panel"

interface NewProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
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
  weight: string
  length: string
  width: string
  height: string
  allow_backorders: string  // "0" | "1"
}

interface ImageItem {
  url: string
  file?: File
  preview?: string
  isFile: boolean
  woocommerceId?: number  // ID en WordPress cuando se sube desde el equipo
}

export function NewProductModal({ isOpen, onClose, onSuccess }: NewProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [images, setImages] = useState<ImageItem[]>([])
  const [imageUrlInput, setImageUrlInput] = useState("")
  const [uploadingImages, setUploadingImages] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [showCategoryManager, setShowCategoryManager] = useState(false)

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
    weight: "",
    length: "",
    width: "",
    height: "",
    allow_backorders: "0",
  })
  const [barcode, setBarcode] = useState<string>("")
  const [qrCode, setQrCode] = useState<string>("")
  const [syncToWooCommerce, setSyncToWooCommerce] = useState(true)

  // Cargar categorías desde la API
  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const categoriesData = await getCategories()
      setCategories(categoriesData)
    } catch (err) {
      console.error('Error al cargar categorías:', err)
      setCategories([])
    } finally {
      setLoadingCategories(false)
    }
  }

  // Cargar categorías cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      loadCategories()
    }
  }, [isOpen])

  const validateForm = () => {
    // Validar código (requerido, máximo 20 caracteres)
    if (!formData.code.trim()) {
      setError("El código del producto es obligatorio")
      return false
    }
    if (formData.code.trim().length > 20) {
      setError("El código del producto no puede exceder 20 caracteres")
      return false
    }

    // Validar nombre (requerido, máximo 100 caracteres)
    if (!formData.name.trim()) {
      setError("El nombre del producto es obligatorio")
      return false
    }
    if (formData.name.trim().length > 100) {
      setError("El nombre del producto no puede exceder 100 caracteres")
      return false
    }

    // Validar precio (requerido, debe ser numérico y mayor a 0)
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      setError("El precio debe ser un número mayor a 0")
      return false
    }

    // Validar stock (opcional, pero si se proporciona debe ser ≥ 0)
    const stock = parseInt(formData.stock) || 0
    if (stock < 0) {
      setError("El stock inicial no puede ser negativo")
      return false
    }

    // Validar min_stock (opcional, pero si se proporciona debe ser ≥ 0)
    const minStock = parseInt(formData.min_stock) || 0
    if (minStock < 0) {
      setError("El stock mínimo no puede ser negativo")
      return false
    }

    // Validar max_stock (opcional, pero si se proporciona debe ser ≥ 0)
    const maxStock = parseInt(formData.max_stock) || 1000
    if (maxStock < 0) {
      setError("El stock máximo no puede ser negativo")
      return false
    }

    // Peso y dimensiones opcionales, pero si se ingresan deben ser ≥ 0
    const weight = formData.weight.trim() === "" ? null : parseFloat(formData.weight)
    if (weight != null && (isNaN(weight) || weight < 0)) {
      setError("El peso debe ser un número mayor o igual a 0 (kg)")
      return false
    }
    const length = formData.length.trim() === "" ? null : parseFloat(formData.length)
    if (length != null && (isNaN(length) || length < 0)) {
      setError("La longitud debe ser un número mayor o igual a 0 (cm)")
      return false
    }
    const width = formData.width.trim() === "" ? null : parseFloat(formData.width)
    if (width != null && (isNaN(width) || width < 0)) {
      setError("El ancho debe ser un número mayor o igual a 0 (cm)")
      return false
    }
    const height = formData.height.trim() === "" ? null : parseFloat(formData.height)
    if (height != null && (isNaN(height) || height < 0)) {
      setError("El alto debe ser un número mayor o igual a 0 (cm)")
      return false
    }

    return true
  }

  // Al enfocar un input numérico con valor "0", seleccionar todo para que al escribir se reemplace (no "01")
  const handleNumericFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const v = e.target.value
    if (v === "0" || v === "0.00") e.target.select()
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Si el stock cambia a 0 y no es venta por encargo, desactivar el producto
      if (field === 'stock') {
        const stockValue = parseInt(value) || 0
        const backorders = prev.allow_backorders === "1"
        if (stockValue === 0 && !backorders) {
          updated.is_active = "0"
        }
      }
      if (field === 'allow_backorders') {
        const stockValue = parseInt(prev.stock) || 0
        if (stockValue === 0 && value === "0") updated.is_active = "0"
        if (stockValue === 0 && value === "1") updated.is_active = "1" // Con reserva y stock 0 se envía activo (WooCommerce)
      }
      
      return updated
    })
    setError(null)
  }

  const handleAddImageUrl = () => {
    if (imageUrlInput.trim() && images.length < 5) {
      // Validar que sea una URL válida
      try {
        const url = imageUrlInput.trim()
        new URL(url)
        setImages(prev => [...prev, { url, isFile: false }])
        setImageUrlInput("")
        setError(null)
      } catch {
        setError("Por favor, ingresa una URL válida")
      }
    } else if (images.length >= 5) {
      setError("Máximo 5 imágenes permitidas")
    } else {
      setError("Por favor, ingresa una URL válida")
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    const remainingSlots = 5 - images.length
    if (remainingSlots <= 0) {
      setError("Máximo 5 imágenes permitidas")
      event.target.value = ""
      return
    }

    const toAdd = Array.from(files)
      .slice(0, remainingSlots)
      .filter((f) => ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(f.type))
    if (!toAdd.length) {
      setError("Solo se permiten imágenes (jpeg, png, gif, webp)")
      event.target.value = ""
      return
    }

    setError(null)

    // Vista previa inmediata con FileReader para que se vean las miniaturas al instante
    const newItems = await Promise.all(
      toAdd.map(
        (file) =>
          new Promise<ImageItem>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) =>
              resolve({
                url: (e.target?.result as string) ?? "",
                preview: (e.target?.result as string) ?? "",
                file,
                isFile: true,
                woocommerceId: undefined,
              })
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          })
      )
    )
    setImages((prev) => [...prev, ...newItems])

    // Subir a WooCommerce en segundo plano y actualizar URLs cuando termine
    setUploadingImages(true)
    try {
      const uploads = await uploadImagesToWordPress(toAdd)
      setImages((prev) => {
        const start = prev.length - uploads.length
        const next = [...prev]
        uploads.forEach((u, i) => {
          if (next[start + i]) {
            next[start + i] = { ...next[start + i], url: u.source_url, woocommerceId: u.id }
          }
        })
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo imágenes a WooCommerce. Las miniaturas se mantienen; podés guardar con URL manual o reintentar.")
    } finally {
      setUploadingImages(false)
    }
    event.target.value = ""
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      // Preparar datos para la API según los requisitos
      // Campos requeridos: code, name, price
      
      // Lista final para WooCommerce: solo URLs (http/https) en el orden que ve el usuario.
      // Incluye URLs externas y source_url de archivos subidos (POST woocommerce/media); IDs y URLs pueden convivir en sync.
      const validImages = images.filter(
        (img) =>
          typeof img.url === "string" &&
          (img.url.startsWith("http://") || img.url.startsWith("https://"))
      )
      const imageUrls: string[] = validImages.map((img) => img.url)
      const woocommerceImageIds = validImages
        .map((img) => img.woocommerceId)
        .filter((id): id is number => id != null)

      const stock = parseInt(formData.stock) || 0
      const allowBackorders = formData.allow_backorders === "1"
      // Con stock > 0: respetar estado elegido. Con stock 0 y reserva: siempre activo para que no pase a borrador en WooCommerce
      const isActive = stock > 0 ? parseInt(formData.is_active) === 1 : (allowBackorders ? true : parseInt(formData.is_active) === 1)

      // Si no hay barcode o qr_code pero hay código, generarlos automáticamente
      let finalBarcode = barcode
      let finalQrCode = qrCode
      if (formData.code.trim() && (!barcode || !qrCode)) {
        const codes = generateProductCodes(formData.code.trim())
        finalBarcode = codes.barcode
        finalQrCode = codes.qr_code
      }

      const weightVal = formData.weight.trim() === "" ? null : parseFloat(formData.weight)
      const lengthVal = formData.length.trim() === "" ? null : parseFloat(formData.length)
      const widthVal = formData.width.trim() === "" ? null : parseFloat(formData.width)
      const heightVal = formData.height.trim() === "" ? null : parseFloat(formData.height)

      const productData: CreateProductData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        // Enviar NULL explícito para evitar undefined en el backend (SQL bind)
        description: formData.description.trim() ? formData.description.trim() : null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        images: imageUrls.length > 0 ? imageUrls : null,
        woocommerce_image_ids: woocommerceImageIds.length > 0 ? woocommerceImageIds : null,
        stock: stock,
        min_stock: parseInt(formData.min_stock) || 0,
        max_stock: parseInt(formData.max_stock) || 1000,
        is_active: isActive,
        barcode: finalBarcode || null,
        qr_code: finalQrCode || null,
        sync_to_woocommerce: syncToWooCommerce,
        weight: weightVal ?? undefined,
        length: lengthVal ?? undefined,
        width: widthVal ?? undefined,
        height: heightVal ?? undefined,
        allow_backorders: allowBackorders,
      }

      const responseData = await createProductNew(productData)
      console.log('✅ [NEW PRODUCT] Producto creado exitosamente:', responseData)

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess()
        onClose()
        resetForm()
      }, 1500)

    } catch (err) {
      console.error('💥 [NEW PRODUCT] Error al crear producto:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al crear el producto')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      description: "",
      category_id: "",
      price: "",
      stock: "0",
      min_stock: "0",
      max_stock: "1000",
      is_active: "1",
      weight: "",
      length: "",
      width: "",
      height: "",
      allow_backorders: "0",
    })
    setBarcode("")
    setQrCode("")
    setSyncToWooCommerce(false)
    setImages([])
    setImageUrlInput("")
    setError(null)
    setSuccess(false)
    // Limpiar input de archivos
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setSuccess(false)
      resetForm()
      onClose()
    }
  }

  const generateCode = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    const generatedCode = `PROD-${timestamp}-${random}`
    
    // Generar código de barras y QR automáticamente
    const codes = generateProductCodes(generatedCode)
    
    setFormData(prev => ({
      ...prev,
      code: generatedCode
    }))
    setBarcode(codes.barcode)
    setQrCode(codes.qr_code)
  }

  const autoFillStockLevels = () => {
    const stock = parseInt(formData.stock) || 0
    if (stock > 0) {
      setFormData(prev => ({
        ...prev,
        min_stock: Math.max(1, Math.floor(stock * 0.1)).toString(),
        max_stock: Math.floor(stock * 2).toString()
      }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            Crear Nuevo Producto
          </DialogTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Completa la información del producto para agregarlo al inventario
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mensajes de estado */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-sm">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">Error al crear producto</p>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-turquoise-50 to-turquoise-100 dark:from-turquoise-950/30 dark:to-turquoise-900/30 border border-turquoise-200 dark:border-turquoise-800 rounded-xl shadow-sm">
              <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
              </div>
              <div>
                <p className="font-medium text-turquoise-800 dark:text-turquoise-300">¡Producto creado exitosamente!</p>
                <p className="text-sm text-turquoise-600 dark:text-turquoise-400">El producto ha sido agregado al inventario</p>
              </div>
            </div>
          )}

          <div className="grid gap-6 grid-cols-1">
            {/* Información básica */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Información Básica</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Datos principales del producto</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Código del Producto * <span className="text-xs text-muted-foreground">(máx. 20 caracteres)</span>
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        placeholder="PROD-001"
                        maxLength={20}
                        className="flex-1 h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500"
                        required
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={generateCode} 
                        className="h-11 px-4 bg-gradient-to-r from-turquoise-50 to-turquoise-100 hover:from-turquoise-100 hover:to-turquoise-200 border-turquoise-200 dark:border-turquoise-700 dark:bg-gradient-to-r dark:from-slate-700 dark:to-slate-600 dark:hover:from-slate-600 dark:hover:to-slate-500 dark:text-slate-200"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Generar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nombre del Producto * <span className="text-xs text-muted-foreground">(máx. 100 caracteres)</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Nombre del producto"
                      maxLength={100}
                      className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Descripción
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Descripción detallada del producto"
                      rows={3}
                      className="border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500 resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="category" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Categoría
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCategoryManager(!showCategoryManager)}
                        className="h-8 px-3 text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {showCategoryManager ? "Ocultar" : "Gestionar"}
                      </Button>
                    </div>
                    <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                      <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCategories ? (
                          <SelectItem value="loading" disabled>Cargando categorías...</SelectItem>
                        ) : categories.length === 0 ? (
                          <SelectItem value="none" disabled>No hay categorías disponibles</SelectItem>
                        ) : (
                          categories
                            .filter(cat => cat.is_active !== false)
                            .map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  {category.name}
                                </div>
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>

                    {showCategoryManager && (
                      <CategoryManagerPanel
                        categories={categories}
                        loadingCategories={loadingCategories}
                        loadCategories={loadCategories}
                        selectedCategoryId={formData.category_id}
                        onSelectCategory={(id) => handleInputChange("category_id", id)}
                        onCategoryCreated={(cat) => setFormData((prev) => ({ ...prev, category_id: cat.id.toString() }))}
                        showWoocommerceFields={false}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Precio y Stock */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Precio y Stock</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Configuración económica e inventario</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Precio *
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        onFocus={handleNumericFocus}
                        placeholder="0.00"
                        className="h-11 pl-9 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Stock Inicial
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => handleInputChange('stock', e.target.value)}
                        onFocus={handleNumericFocus}
                        placeholder="0"
                        className="flex-1 h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={autoFillStockLevels}
                        className="h-11 px-3 bg-gradient-to-r from-turquoise-50 to-turquoise-100 hover:from-turquoise-100 hover:to-turquoise-200 border-turquoise-200 dark:border-turquoise-700 dark:bg-gradient-to-r dark:from-slate-700 dark:to-slate-600 dark:hover:from-slate-600 dark:hover:to-slate-500 dark:text-slate-200"
                        disabled={!formData.stock || parseInt(formData.stock) <= 0}
                      >
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="min_stock" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Stock Mínimo
                      </Label>
                      <Input
                        id="min_stock"
                        type="number"
                        min="0"
                        value={formData.min_stock}
                        onChange={(e) => handleInputChange('min_stock', e.target.value)}
                        onFocus={handleNumericFocus}
                        placeholder="0"
                        className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_stock" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Stock Máximo
                      </Label>
                      <Input
                        id="max_stock"
                        type="number"
                        min="0"
                        value={formData.max_stock}
                        onChange={(e) => handleInputChange('max_stock', e.target.value)}
                        onFocus={handleNumericFocus}
                        placeholder="0"
                        className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Estado del Producto
                    </Label>
                    <Select 
                      value={formData.is_active} 
                      onValueChange={(value) => handleInputChange('is_active', value)}
                      disabled={parseInt(formData.stock) === 0}
                    >
                      <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500 disabled:opacity-50 disabled:cursor-not-allowed">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-turquoise-500 dark:bg-turquoise-400 rounded-full"></div>
                            Activo
                          </div>
                        </SelectItem>
                        <SelectItem value="0">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
                            Inactivo
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {parseInt(formData.stock) === 0 && formData.allow_backorders !== "1" && (
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        ⚠️ Un producto con stock 0 no puede estar activo. Marcá &quot;Venta por encargo&quot; si querés venderlo con stock 0.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="sync-woocommerce"
                      checked={syncToWooCommerce}
                      onChange={(e) => setSyncToWooCommerce(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-turquoise-600 focus:ring-turquoise-500"
                    />
                    <Label htmlFor="sync-woocommerce" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      Sincronizar con WooCommerce al crear
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Peso, dimensiones y venta por encargo */}
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                    <Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Peso, dimensiones y envío</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Opcional: para cálculo de envíos y productos por encargo</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allow_backorders"
                      checked={formData.allow_backorders === "1"}
                      onChange={(e) => handleInputChange("allow_backorders", e.target.checked ? "1" : "0")}
                      className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-turquoise-600 focus:ring-turquoise-500"
                    />
                    <Label htmlFor="allow_backorders" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      Venta por encargo (permitir reservas con stock 0)
                    </Label>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Si está marcado, el producto puede venderse con stock 0 y se avisará al cliente (WooCommerce: permitir reservas).
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="weight" className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Ruler className="h-3.5 w-3.5" />
                        Peso (kg)
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.weight}
                        onChange={(e) => handleInputChange("weight", e.target.value)}
                        onFocus={handleNumericFocus}
                        placeholder="Ej: 2.5"
                        className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="length" className="text-sm font-medium text-slate-700 dark:text-slate-300">Largo (cm)</Label>
                      <Input
                        id="length"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.length}
                        onChange={(e) => handleInputChange("length", e.target.value)}
                        onFocus={handleNumericFocus}
                        placeholder="Ej: 35"
                        className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="width" className="text-sm font-medium text-slate-700 dark:text-slate-300">Ancho (cm)</Label>
                      <Input
                        id="width"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.width}
                        onChange={(e) => handleInputChange("width", e.target.value)}
                        onFocus={handleNumericFocus}
                        placeholder="Ej: 24"
                        className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height" className="text-sm font-medium text-slate-700 dark:text-slate-300">Alto (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.height}
                        onChange={(e) => handleInputChange("height", e.target.value)}
                        onFocus={handleNumericFocus}
                        placeholder="Ej: 2"
                        className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Carga de imágenes */}
          <Card className="border-0 shadow-lg bg-white/70 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200 dark:border-slate-700">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Imágenes del Producto</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Agrega hasta 5 imágenes para mostrar el producto</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Opción 1: Cargar desde el ordenador */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Cargar desde el ordenador
                  </Label>
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-turquoise-400 dark:hover:border-turquoise-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={images.length >= 5 || uploadingImages}
                      className="flex items-center gap-2 h-12 px-6 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200 dark:border-purple-700 dark:bg-gradient-to-r dark:from-slate-700 dark:to-slate-600 dark:hover:from-slate-600 dark:hover:to-slate-500 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="h-5 w-5" />
                      {uploadingImages ? "Subiendo a WooCommerce…" : "Subir a WooCommerce"}
                    </Button>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Las imágenes se suben a la galería de WooCommerce y se asocian al producto
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        JPG, PNG, GIF, WebP • Máx. 10MB por imagen
                      </p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <Separator />

                {/* Opción 2: Agregar URL */}
                <div className="space-y-4">
                  <Label htmlFor="image-url" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    O agregar URL de imagen
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="image-url"
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="flex-1 h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddImageUrl()
                        }
                      }}
                      disabled={images.length >= 5}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddImageUrl}
                      disabled={!imageUrlInput.trim() || images.length >= 5}
                      className="h-11 px-6 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200 dark:border-purple-700 dark:bg-gradient-to-r dark:from-slate-700 dark:to-slate-600 dark:hover:from-slate-600 dark:hover:to-slate-500 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Agregar URL
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Máximo 5 imágenes • Ingresa URLs válidas (https://...) o carga archivos desde tu ordenador
                  </p>
                </div>

                {/* Preview de imágenes */}
                {images.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-700 dark:text-slate-300">
                        Imágenes agregadas ({images.length}/5)
                      </h4>
                      <Badge variant="secondary" className="bg-turquoise-100 text-turquoise-700 dark:bg-turquoise-800/50 dark:text-turquoise-300">
                        {images.length} URLs
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                            <Image
                              src={image.preview || image.url}
                              alt={image.isFile && image.file ? image.file.name : `Imagen ${index + 1}`}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = `https://via.placeholder.com/400x400?text=Imagen+${index + 1}`
                              }}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {image.isFile && image.file ? (
                              <>
                                <p className="truncate">{image.file.name}</p>
                                <p>{(image.file.size / 1024 / 1024).toFixed(1)} MB</p>
                              </>
                            ) : (
                              <p className="truncate">{image.url}</p>
                            )}
                          </div>
                          {image.isFile && (
                            <Badge className="absolute top-2 left-2 bg-blue-500 text-white text-xs">
                              Archivo
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          {/* Botones de acción */}
          <div className="flex justify-end gap-4 p-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800/80 dark:to-slate-700/80 rounded-xl border border-slate-200 dark:border-slate-600">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose} 
              disabled={loading}
              className="h-12 px-8 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                  Creando Producto...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-3" />
                  Crear Producto
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
