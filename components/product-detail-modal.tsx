"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Package, DollarSign, AlertTriangle, TrendingUp, Edit, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, Loader2, QrCode, ScanLine, Printer } from "lucide-react"
import Image from "next/image"
import { Product } from "@/lib/api"
import  QRCodeSVG  from "react-qr-code"
import JsBarcode from "jsbarcode"

interface ProductDetailModalProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null)
  const qrContainerRef = useRef<HTMLDivElement>(null)

  // Resetear índice de imagen cuando cambia el producto o se abre el modal
  useEffect(() => {
    if (isOpen && product) {
      setSelectedImageIndex(0)
      setIsImageLoading(true)
    }
  }, [isOpen, product])

  // Resetear estado de carga cuando cambia la imagen seleccionada
  useEffect(() => {
    setIsImageLoading(true)
  }, [selectedImageIndex])

  // Generar código de barras cuando el producto cambia
  useEffect(() => {
    if (product?.barcode && barcodeCanvasRef.current && isOpen) {
      try {
        JsBarcode(barcodeCanvasRef.current, product.barcode, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 14,
          margin: 8
        })
      } catch (err) {
        console.error("Error al generar código de barras:", err)
      }
    }
  }, [product, isOpen])

  const handlePrintCodes = () => {
    if (!product) return

    const escapeHtml = (input: string) =>
      input
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")

    // Re-generar el código de barras por si el canvas aún no estaba listo
    if (product.barcode && barcodeCanvasRef.current) {
      try {
        JsBarcode(barcodeCanvasRef.current, product.barcode, {
          format: "CODE128",
          width: 2,
          height: 80,
          displayValue: true,
          fontSize: 16,
          margin: 10
        })
      } catch (err) {
        console.error("Error al generar código de barras (print):", err)
      }
    }

    const barcodeDataUrl =
      product.barcode && barcodeCanvasRef.current
        ? barcodeCanvasRef.current.toDataURL("image/png")
        : null

    const qrSvg =
      product.qr_code
        ? qrContainerRef.current?.querySelector("svg")?.outerHTML ?? null
        : null

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=650")
    if (!printWindow) return

    const title = `Códigos - ${product.code}`

    printWindow.document.open()
    printWindow.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { margin: 12mm; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; }
      .wrap { display: grid; gap: 16px; }
      .header { margin-bottom: 8px; }
      .name { font-size: 16px; font-weight: 700; margin: 0 0 4px; }
      .meta { font-size: 12px; margin: 0; color: #555; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
      .card { border: 1px solid #ddd; border-radius: 10px; padding: 14px; }
      .card h2 { font-size: 12px; margin: 0 0 10px; color: #333; letter-spacing: .02em; text-transform: uppercase; }
      .center { display: flex; align-items: center; justify-content: center; }
      img { max-width: 100%; height: auto; }
      svg { max-width: 100%; height: auto; }
      .hint { font-size: 11px; color: #666; margin-top: 10px; text-align: center; }
      .actions { margin-top: 16px; display: flex; gap: 8px; }
      .btn { border: 1px solid #111; background: #111; color: #fff; padding: 10px 12px; border-radius: 8px; font-size: 12px; cursor: pointer; }
      .btn.secondary { background: #fff; color: #111; }
      @media print { .actions { display: none; } body { color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="header">
        <p class="name">${escapeHtml(product.name)}</p>
        <p class="meta">Código: <strong>${escapeHtml(product.code)}</strong></p>
      </div>

      <div class="grid">
        ${barcodeDataUrl ? `
          <div class="card">
            <h2>Código de barras</h2>
            <div class="center">
              <img src="${barcodeDataUrl}" alt="Código de barras" />
            </div>
            <div class="hint">${escapeHtml(product.barcode || "")}</div>
          </div>
        ` : ``}

        ${qrSvg ? `
          <div class="card">
            <h2>Código QR</h2>
            <div class="center" style="background:#fff;border-radius:8px;padding:10px;">
              ${qrSvg}
            </div>
            <div class="hint">Escaneá para ver el producto</div>
          </div>
        ` : `
          <div class="card">
            <h2>Código QR</h2>
            <p class="meta">No disponible.</p>
          </div>
        `}
      </div>

      <div class="actions">
        <button class="btn" onclick="window.print()">Imprimir</button>
        <button class="btn secondary" onclick="window.close()">Cerrar</button>
      </div>
    </div>
  </body>
</html>`)
    printWindow.document.close()
  }

  if (!product) return null

  // Función para obtener todas las imágenes disponibles del producto
  const getAllProductImages = (product: Product): string[] => {
    const images: string[] = []
    
    // 1. Prioridad: array de imágenes del producto
    if (product.images && product.images.length > 0) {
      return product.images
    }
    
    // 2. Si hay URL de WooCommerce específica, usarla
    if (product.woocommerce_image_url) {
      images.push(product.woocommerce_image_url)
    }
    
    // 3. Si hay URL de imagen general, usarla
    if (product.image_url) {
      images.push(product.image_url)
    }
    
    // 4. Construir URL de WooCommerce basada en el código del producto
    const woocommerceBaseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_IMAGE_URL || process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || ''
    
    if (woocommerceBaseUrl && images.length === 0) {
      const codeSlug = product.code.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      images.push(`${woocommerceBaseUrl}/wp-content/uploads/${codeSlug}.jpg`)
    }
    
    // 5. Si no hay imágenes, retornar array vacío (se mostrará placeholder)
    return images
  }

  // Función para obtener la URL de la imagen del producto (compatibilidad con código anterior)
  const getProductImageUrl = (product: Product): string => {
    const images = getAllProductImages(product)
    return images.length > 0 ? images[0] : `https://via.placeholder.com/400x400?text=${encodeURIComponent(product.name)}`
  }

  // Función para determinar el estado del stock
  const getStockStatus = (stock: number, minStock: number, maxStock: number) => {
    if (stock <= minStock) return "critico"
    if (stock >= maxStock * 0.8) return "alto"
    return "normal"
  }

  const stockStatus = getStockStatus(product.stock, product.min_stock, product.max_stock)
  const allImages = getAllProductImages(product)
  const hasImages = allImages.length > 0
  const currentImage = hasImages ? allImages[selectedImageIndex] : null

  const handlePreviousImage = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))
  }

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "critico":
        return "destructive"
      case "alto":
        return "default"
      default:
        return "secondary"
    }
  }

  const getEstadoText = (estado: string) => {
    switch (estado) {
      case "critico":
        return "Crítico"
      case "alto":
        return "Alto"
      default:
        return "Normal"
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Galería de imágenes del producto */}
          <div className="space-y-4">
            {/* Imagen principal */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
              {currentImage ? (
                <>
                  {/* Spinner de carga */}
                  {isImageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  <Image
                    src={currentImage}
                    alt={`${product.name || 'Producto'} - Imagen ${selectedImageIndex + 1}`}
                    fill
                    className={`object-cover transition-opacity duration-300 ${
                      isImageLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onLoad={() => {
                      // Ocultar spinner cuando la imagen carga
                      setIsImageLoading(false)
                    }}
                    onLoadingComplete={() => {
                      // Asegurar que cuando Next.js confirme la carga, ocultar el spinner
                      setIsImageLoading(false)
                    }}
                    onError={(e) => {
                      // Fallback si la imagen falla al cargar
                      const target = e.target as HTMLImageElement
                      target.src = `https://via.placeholder.com/400x400?text=${encodeURIComponent(product.name || 'Producto')}`
                      setIsImageLoading(false)
                    }}
                  />
                  {/* Botones de navegación (solo si hay más de una imagen) */}
                  {allImages.length > 1 && !isImageLoading && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white z-20"
                        onClick={handlePreviousImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70 text-white z-20"
                        onClick={handleNextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      {/* Indicador de imagen actual */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded z-20">
                        {selectedImageIndex + 1} / {allImages.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Miniaturas de imágenes (si hay más de una) */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-transparent hover:border-muted-foreground/50'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`Miniatura ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = `https://via.placeholder.com/80x80?text=${encodeURIComponent(product.name || 'Producto')}`
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Acciones rápidas */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/50 dark:hover:bg-primary/20 dark:hover:text-primary transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 dark:hover:bg-destructive/20 dark:hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Detalles del producto */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{product.category_name || 'Sin categoría'}</Badge>
              <Badge variant={getEstadoColor(stockStatus)}>{getEstadoText(stockStatus)}</Badge>
              <Badge variant={product.is_active ? "default" : "secondary"}>
                {product.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Precio:</span>
                <span className="font-semibold text-lg">${Math.round(product.price).toLocaleString('es-ES')}</span>
              </div>

              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Código:</span>
                <span className="font-mono">{product.code}</span>
              </div>

              {product.woocommerce_id && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ID WooCommerce:</span>
                  <span className="font-mono text-sm">{product.woocommerce_id}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">ID:</span>
                <span className="font-mono text-sm">{product.id}</span>
              </div>
            </div>

            <Separator />

            {/* Stock Information */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Información de Stock
              </h4>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-turquoise-600">{product.stock}</p>
                  <p className="text-xs text-muted-foreground">Actual</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-orange-600">{product.min_stock}</p>
                  <p className="text-xs text-muted-foreground">Mínimo</p>
                </div>
              </div>

              {product.stock <= product.min_stock && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700 dark:text-red-400">
                    Stock por debajo del mínimo recomendado
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Códigos de barras y QR */}
            {(product.barcode || product.qr_code) && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <ScanLine className="h-4 w-4" />
                      Códigos de Identificación
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintCodes}
                      disabled={!product.barcode && !product.qr_code}
                    >
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir códigos
                    </Button>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Código de barras */}
                    {product.barcode && (
                      <div className="bg-muted/50 p-4 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-2 text-center">Código de barras</p>
                        <div className="flex justify-center">
                          <canvas ref={barcodeCanvasRef} className="max-w-full" />
                        </div>
                        <p className="text-xs text-center text-muted-foreground mt-2 font-mono">
                          {product.barcode}
                        </p>
                      </div>
                    )}

                    {/* Código QR */}
                    {product.qr_code && (
                      <div className="bg-muted/50 p-4 rounded-lg border">
                        <p className="text-xs text-muted-foreground mb-2 text-center flex items-center justify-center gap-1">
                          <QrCode className="h-3 w-3" />
                          Código QR
                        </p>
                        <div className="flex justify-center">
                          <div ref={qrContainerRef} className="bg-white p-2 rounded">
                            <QRCodeSVG
                              value={product.qr_code || ''}
                              size={150}
                              level="M"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          Escanea para ver información pública
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Información adicional */}
            <div className="space-y-3">
              <h4 className="font-semibold">Información Adicional</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creado:</span>
                  <span>{new Date(product.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Actualizado:</span>
                  <span>{new Date(product.updated_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Descripción - Ocupa todo el ancho */}
        {product.description && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-semibold">Descripción</h4>
              <div 
                className="text-sm text-muted-foreground leading-relaxed [&_p]:my-2 [&_p]:mb-3 
                  [&_strong]:font-semibold [&_strong]:text-foreground 
                  [&_h1]:text-lg [&_h1]:font-bold [&_h1]:my-3 [&_h1]:text-foreground
                  [&_h2]:text-base [&_h2]:font-bold [&_h2]:my-2 [&_h2]:text-foreground
                  [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-2 [&_h3]:text-foreground
                  [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2
                  [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2
                  [&_li]:my-1 [&_li]:text-muted-foreground
                  [&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80
                  [&_br]:block [&_br]:content-[''] [&_br]:my-1"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
