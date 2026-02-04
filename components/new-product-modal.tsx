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
import { AlertTriangle, CheckCircle, Upload, X, Image as ImageIcon, Package, DollarSign, TrendingUp, Sparkles, Tag, BarChart3, Zap, Plus, Edit, Trash2, Save } from "lucide-react"
import Image from "next/image"
import { createProductNew, getCategories, createCategory, updateCategory, deleteCategory, Category, CreateProductData, CreateCategoryData, UpdateCategoryData } from "@/lib/api"
import { generateProductCodes } from "@/lib/product-codes"
import { uploadImagesToWordPress } from "@/lib/woocommerce-media"

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
  
  // Estados para gestión de categorías
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categoryFormData, setCategoryFormData] = useState<{ name: string; description: string; parent_id: string }>({
    name: "",
    description: "",
    parent_id: ""
  })
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [categoryLoading, setCategoryLoading] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    code: "",
    name: "",
    description: "",
    category_id: "",
    price: "",
    stock: "0",
    min_stock: "0",
    max_stock: "1000",
    is_active: "1"
  })
  const [barcode, setBarcode] = useState<string>("")
  const [qrCode, setQrCode] = useState<string>("")
  const [syncToWooCommerce, setSyncToWooCommerce] = useState(false)

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

  // Funciones para gestión de categorías
  const handleCreateCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setCategoryError("El nombre de la categoría es obligatorio")
      return
    }

    setCategoryLoading(true)
    setCategoryError(null)

    try {
      const categoryData: CreateCategoryData = {
        name: categoryFormData.name.trim(),
        description: categoryFormData.description.trim() || undefined,
        ...(categoryFormData.parent_id ? { parent_id: parseInt(categoryFormData.parent_id) } : {}),
      }

      const newCategory = await createCategory(categoryData)
      await loadCategories() // Recargar categorías
      
      // Seleccionar la nueva categoría automáticamente
      setFormData(prev => ({ ...prev, category_id: newCategory.id.toString() }))
      
      // Limpiar formulario
      setCategoryFormData({ name: "", description: "", parent_id: "" })
      setShowCategoryManager(false)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Error al crear la categoría")
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return
    if (!categoryFormData.name.trim()) {
      setCategoryError("El nombre de la categoría es obligatorio")
      return
    }

    setCategoryLoading(true)
    setCategoryError(null)

    try {
      const updateData: UpdateCategoryData = {
        name: categoryFormData.name.trim(),
        description: categoryFormData.description.trim() || undefined,
        ...(categoryFormData.parent_id ? { parent_id: parseInt(categoryFormData.parent_id) } : {}),
      }

      await updateCategory(editingCategory.id, updateData)
      await loadCategories() // Recargar categorías
      
      // Limpiar formulario
      setCategoryFormData({ name: "", description: "", parent_id: "" })
      setEditingCategory(null)
      setShowCategoryManager(false)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Error al actualizar la categoría")
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return

    setCategoryLoading(true)
    setCategoryError(null)

    try {
      await deleteCategory(deletingCategory.id)
      await loadCategories() // Recargar categorías
      
      // Si la categoría eliminada estaba seleccionada, limpiar la selección
      if (formData.category_id === deletingCategory.id.toString()) {
        setFormData(prev => ({ ...prev, category_id: "" }))
      }
      
      setDeletingCategory(null)
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Error al eliminar la categoría")
    } finally {
      setCategoryLoading(false)
    }
  }

  const startEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id?.toString() || ""
    })
    setShowCategoryManager(true)
    setCategoryError(null)
  }

  const startDeleteCategory = (category: Category) => {
    setDeletingCategory(category)
    setCategoryError(null)
  }

  const cancelCategoryForm = () => {
    setCategoryFormData({ name: "", description: "", parent_id: "" })
    setEditingCategory(null)
    setShowCategoryManager(false)
    setCategoryError(null)
  }

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
      
      // Si el stock cambia a 0, automáticamente desactivar el producto
      // Un producto no puede estar publicado sin stock
      if (field === 'stock') {
        const stockValue = parseInt(value) || 0
        if (stockValue === 0) {
          updated.is_active = "0"
        }
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
      
      // Solo enviar URLs públicas (http/https); nunca data: ni blob: para evitar "No URL Provided" en WooCommerce
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
      
      // Si el stock es 0, el producto debe estar inactivo
      // Un producto no puede estar publicado sin stock
      const isActive = stock > 0 ? parseInt(formData.is_active) === 1 : false

      // Si no hay barcode o qr_code pero hay código, generarlos automáticamente
      let finalBarcode = barcode
      let finalQrCode = qrCode
      if (formData.code.trim() && (!barcode || !qrCode)) {
        const codes = generateProductCodes(formData.code.trim())
        finalBarcode = codes.barcode
        finalQrCode = codes.qr_code
      }

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
        sync_to_woocommerce: syncToWooCommerce
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
      is_active: "1"
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
                        onClick={() => {
                          setShowCategoryManager(!showCategoryManager)
                          setEditingCategory(null)
                          setCategoryFormData({ name: "", description: "", parent_id: "" })
                          setCategoryError(null)
                        }}
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

                    {/* Panel de gestión de categorías */}
                    {showCategoryManager && (
                      <Card className="mt-4 border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-800">
                            <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                              <Tag className="h-4 w-4" />
                              {editingCategory ? "Editar Categoría" : "Nueva Categoría"}
                            </h4>
                            {editingCategory && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={cancelCategoryForm}
                                className="h-6 px-2 text-xs"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>

                          {categoryError && (
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300">
                              {categoryError}
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor="category-name" className="text-xs font-medium">
                                Nombre *
                              </Label>
                              <Input
                                id="category-name"
                                value={categoryFormData.name}
                                onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Nombre de la categoría"
                                className="h-9 text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="category-description" className="text-xs font-medium">
                                Descripción
                              </Label>
                              <Textarea
                                id="category-description"
                                value={categoryFormData.description}
                                onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Descripción de la categoría"
                                rows={2}
                                className="text-sm resize-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="category-parent" className="text-xs font-medium">
                                Categoría Padre (opcional)
                              </Label>
                              <Select
                                value={categoryFormData.parent_id || "__none__"}
                                onValueChange={(value) => setCategoryFormData(prev => ({ ...prev, parent_id: value === "__none__" ? "" : value }))}
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Sin categoría padre" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Sin categoría padre</SelectItem>
                                  {categories
                                    .filter(cat => cat.id !== editingCategory?.id && cat.is_active !== false)
                                    .map((category) => (
                                      <SelectItem key={category.id} value={category.id.toString()}>
                                        {category.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                type="button"
                                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                                disabled={categoryLoading || !categoryFormData.name.trim()}
                                className="flex-1 h-9 text-xs"
                                size="sm"
                              >
                                {categoryLoading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-2" />
                                    {editingCategory ? "Guardando..." : "Creando..."}
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-3 w-3 mr-1" />
                                    {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
                                  </>
                                )}
                              </Button>
                              {editingCategory && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={cancelCategoryForm}
                                  disabled={categoryLoading}
                                  className="h-9 px-3 text-xs"
                                  size="sm"
                                >
                                  Cancelar
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Lista de categorías existentes con opciones de editar/eliminar */}
                          {categories.length > 0 && (
                            <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
                              <Label className="text-xs font-medium mb-2 block">Categorías Existentes</Label>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {categories
                                  .filter(cat => cat.is_active !== false)
                                  .map((category) => (
                                    <div
                                      key={category.id}
                                      className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                                    >
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Tag className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                        <span className="text-xs text-slate-700 dark:text-slate-300 truncate">
                                          {category.name}
                                        </span>
                                        {category.description && (
                                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                                            - {category.description}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-1 ml-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startEditCategory(category)}
                                          disabled={categoryLoading}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Edit className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => startDeleteCategory(category)}
                                          disabled={categoryLoading}
                                          className="h-6 w-6 p-0"
                                        >
                                          <Trash2 className="h-3 w-3 text-red-600 dark:text-red-400" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Modal de confirmación para eliminar */}
                    {deletingCategory && (
                      <Dialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <AlertTriangle className="h-5 w-5" />
                              Confirmar Eliminación
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              ¿Estás seguro de que deseas eliminar la categoría <strong>"{deletingCategory.name}"</strong>?
                            </p>
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                              Esta acción eliminará la categoría de WooCommerce (si está sincronizada) y la marcará como inactiva en el sistema.
                            </p>
                            {categoryError && (
                              <div className="p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-700 dark:text-red-300">
                                {categoryError}
                              </div>
                            )}
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDeletingCategory(null)}
                                disabled={categoryLoading}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDeleteCategory}
                                disabled={categoryLoading}
                              >
                                {categoryLoading ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                    Eliminando...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Eliminar
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                    {parseInt(formData.stock) === 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400">
                        ⚠️ Un producto con stock 0 no puede estar activo. Se creará como inactivo.
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
