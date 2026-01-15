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
import { AlertTriangle, CheckCircle, Upload, X, Image as ImageIcon, Package, DollarSign, TrendingUp, Sparkles, Tag, BarChart3, Zap } from "lucide-react"
import Image from "next/image"
import { createProduct, getCategories, Category, CreateProductData } from "@/lib/api"

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

interface UploadedImage {
  file: File
  preview: string
}

export function NewProductModal({ isOpen, onClose, onSuccess }: NewProductModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)
  const [images, setImages] = useState<UploadedImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<FormData>({
    code: "",
    name: "",
    description: "",
    category_id: "",
    price: "",
    stock: "0",
    min_stock: "0",
    max_stock: "0",
    is_active: "1"
  })

  // Cargar categorías al abrir el modal
  const loadCategories = async () => {
    setLoadingCategories(true)
    try {
      const categoriesData = await getCategories()
      setCategories(categoriesData)
    } catch (err) {
      console.error('Error al cargar categorías:', err)
      // Fallback a categorías hardcodeadas si falla la API
      const mockCategories: Category[] = [
        { id: 1, name: "Computadoras", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 2, name: "Accesorios", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 3, name: "Repuestos", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 4, name: "Herramientas", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { id: 5, name: "Materiales", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      ]
      setCategories(mockCategories)
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
    if (!formData.code.trim()) {
      setError("El código del producto es obligatorio")
      return false
    }
    if (!formData.name.trim()) {
      setError("El nombre del producto es obligatorio")
      return false
    }
    if (!formData.category_id) {
      setError("Debe seleccionar una categoría")
      return false
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("El precio debe ser mayor a 0")
      return false
    }
    if (parseInt(formData.min_stock) < 0) {
      setError("El stock mínimo no puede ser negativo")
      return false
    }
    if (parseInt(formData.max_stock) <= parseInt(formData.min_stock)) {
      setError("El stock máximo debe ser mayor al mínimo")
      return false
    }
    return true
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          setImages(prev => [...prev, { file, preview }])
        }
        reader.readAsDataURL(file)
      }
    })
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
      // Preparar datos para la API
      const productData: CreateProductData = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        category_id: parseInt(formData.category_id),
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        min_stock: parseInt(formData.min_stock),
        max_stock: parseInt(formData.max_stock),
        is_active: parseInt(formData.is_active),
        images: images.map(img => img.file)
      }

      const responseData = await createProduct(productData)
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
      max_stock: "0",
      is_active: "1"
    })
    setImages([])
    setError(null)
    setSuccess(false)
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
    setFormData(prev => ({
      ...prev,
      code: `PROD-${timestamp}-${random}`
    }))
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
                      Código del Producto *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        placeholder="PROD-001"
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
                      Nombre del Producto *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Nombre del producto"
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
                    <Label htmlFor="category" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Categoría *
                    </Label>
                    <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                      <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingCategories ? (
                          <SelectItem value="loading" disabled>Cargando categorías...</SelectItem>
                        ) : (
                          categories.map((category) => (
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
                        placeholder="0"
                        className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Estado del Producto
                    </Label>
                    <Select value={formData.is_active} onValueChange={(value) => handleInputChange('is_active', value)}>
                      <SelectTrigger className="h-11 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:border-turquoise-500 focus:ring-turquoise-500">
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
                <div className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-turquoise-400 dark:hover:border-turquoise-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 h-12 px-6 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200 dark:border-purple-700 dark:bg-gradient-to-r dark:from-slate-700 dark:to-slate-600 dark:hover:from-slate-600 dark:hover:to-slate-500 dark:text-slate-200"
                  >
                    <Upload className="h-5 w-5" />
                    Cargar Imágenes
                  </Button>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Arrastra y suelta o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Máximo 5 imágenes • JPG, PNG, WebP • Hasta 10MB cada una
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Preview de imágenes */}
                {images.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-slate-700 dark:text-slate-300">
                        Imágenes seleccionadas ({images.length}/5)
                      </h4>
                      <Badge variant="secondary" className="bg-turquoise-100 text-turquoise-700 dark:bg-turquoise-800/50 dark:text-turquoise-300">
                        {images.length} archivos
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                            <Image
                              src={image.preview}
                              alt={`Preview ${index + 1}`}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
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
                            <p className="truncate">{image.file.name}</p>
                            <p>{(image.file.size / 1024 / 1024).toFixed(1)} MB</p>
                          </div>
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
