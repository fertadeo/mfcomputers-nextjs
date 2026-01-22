"use client"

import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import { useRole } from "@/app/hooks/useRole"
import { getProducts, deleteProduct, getProductStats, ProductStats } from "@/lib/api"
import { useState, useEffect } from "react"
import { Product } from "@/lib/api"
import { ProductDetailModal } from "@/components/product-detail-modal"
import { NewProductModal } from "@/components/new-product-modal"
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Download
} from "lucide-react"

export default function ProductosPage() {
  const { canViewSales, canViewLogistics, canViewFinance, isAdmin } = useRole()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [productStats, setProductStats] = useState<ProductStats | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [allProducts, setAllProducts] = useState<Product[]>([]) // Todos los productos cargados
  const [productsLoaded, setProductsLoaded] = useState(false) // Flag para saber si ya se cargaron todos los productos
  const limit = 50 // Productos por página

  // Cargar productos y estadísticas al montar el componente
  useEffect(() => {
    loadAllProducts()
    loadProductStats()
  }, [])

  // Actualizar productos mostrados cuando cambie la página o el término de búsqueda
  useEffect(() => {
    updateDisplayedProducts()
  }, [currentPage, searchTerm, allProducts])

  const loadProductStats = async () => {
    try {
      const stats = await getProductStats()
      setProductStats(stats)
    } catch (err) {
      console.error('Error al cargar estadísticas de productos:', err)
    }
  }

  // Cargar todos los productos una vez al inicio
  const loadAllProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      // Cargar todos los productos para permitir búsqueda completa
      const data = await getProducts(1, 10000)
      
      let allProductsData: Product[] = []
      
      // Verificar si la respuesta tiene estructura paginada
      if (data && typeof data === 'object' && 'products' in data && 'pagination' in data) {
        allProductsData = data.products
      } else if (Array.isArray(data)) {
        allProductsData = data
      }
      
      // Guardar todos los productos para búsqueda
      setAllProducts(allProductsData)
      setProductsLoaded(true)
    } catch (err) {
      console.error('Error al cargar productos:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
      setProducts([])
      setAllProducts([])
      setTotalPages(1)
      setTotalProducts(0)
    } finally {
      setLoading(false)
    }
  }

  // Función para actualizar los productos mostrados según búsqueda y paginación
  const updateDisplayedProducts = () => {
    if (!productsLoaded) return

    let productsToShow: Product[] = []

    if (searchTerm.trim()) {
      // Filtrar productos cuando hay búsqueda
      const term = searchTerm.trim().toLowerCase()
      
      // Filtrar productos: buscar en SKU, nombre y categoría
      const filtered = allProducts.filter((product) => {
        const codeMatch = product.code?.toLowerCase().includes(term)
        const nameMatch = product.name?.toLowerCase().includes(term)
        const categoryMatch = product.category_name?.toLowerCase().includes(term)
        
        return codeMatch || nameMatch || categoryMatch
      })

      // Ordenar: primero coincidencias exactas en SKU, luego parciales en SKU, luego nombre, luego categoría
      productsToShow = filtered.sort((a, b) => {
        const aCode = a.code?.toLowerCase() || ""
        const bCode = b.code?.toLowerCase() || ""
        const aName = a.name?.toLowerCase() || ""
        const bName = b.name?.toLowerCase() || ""
        
        // Coincidencia exacta en SKU tiene máxima prioridad
        if (aCode === term && bCode !== term) return -1
        if (bCode === term && aCode !== term) return 1
        
        // Coincidencia que empieza con el término en SKU
        if (aCode.startsWith(term) && !bCode.startsWith(term)) return -1
        if (bCode.startsWith(term) && !aCode.startsWith(term)) return 1
        
        // Coincidencia en SKU
        if (aCode.includes(term) && !bCode.includes(term)) return -1
        if (bCode.includes(term) && !aCode.includes(term)) return 1
        
        // Coincidencia en nombre
        if (aName.includes(term) && !bName.includes(term)) return -1
        if (bName.includes(term) && !aName.includes(term)) return 1
        
        return 0
      })
    } else {
      // Sin búsqueda, usar todos los productos
      productsToShow = allProducts
    }

    // Aplicar paginación
    const startIndex = (currentPage - 1) * limit
    const endIndex = startIndex + limit
    setProducts(productsToShow.slice(startIndex, endIndex))
    setTotalPages(Math.ceil(productsToShow.length / limit))
    setTotalProducts(productsToShow.length)
  }

  // Función para recargar productos (usada después de crear/eliminar)
  const loadProducts = async () => {
    await loadAllProducts()
  }

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return
    }

    try {
      await deleteProduct(id)
      await loadProducts() // Recargar la lista
      await loadProductStats() // Recargar estadísticas
    } catch (err) {
      console.error('Error al eliminar producto:', err)
      alert(err instanceof Error ? err.message : 'Error al eliminar producto')
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedProduct(null)
  }

  // Verificar si el usuario puede realizar acciones de administración
  const canManageProducts = isAdmin()

  return (
    <Protected requiredRoles={['gerencia', 'ventas', 'logistica', 'finanzas']}>
      <ERPLayout activeItem="productos">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Gestión de Productos</h1>
              <p className="text-muted-foreground">
                Administra el catálogo de productos del sistema
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button onClick={() => setIsNewProductModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productStats?.total_products || totalProducts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {productStats?.active_products || products?.filter(p => p.is_active)?.length || 0} activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {productStats?.low_stock_count || products?.filter(p => p.stock <= p.min_stock)?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Requieren reposición</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
                <TrendingUp className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {productStats?.out_of_stock_count || products?.filter(p => p.stock === 0)?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Agotados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                <CheckCircle className="h-4 w-4 text-turquoise-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${productStats?.total_stock_value 
                    ? parseFloat(productStats.total_stock_value.replace(/[^\d.-]/g, '') || '0').toLocaleString('es-AR', { maximumFractionDigits: 0 })
                    : products?.reduce((sum, p) => sum + (p.price * p.stock), 0)?.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || '0'}
                </div>
                <p className="text-xs text-muted-foreground">En inventario</p>
              </CardContent>
            </Card>
          </div>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Productos</CardTitle>
              <CardDescription>
                Catálogo completo de productos del sistema
                <br />
                <span className="text-xs text-muted-foreground">
                  💡 Haga clic en cualquier fila para ver los detalles del producto
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-800 dark:text-red-200 text-sm">
                    Error: {error}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadProducts}
                    className="mt-2"
                  >
                    Reintentar
                  </Button>
                </div>
              )}

              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por SKU, nombre o categoría..." 
                      className="pl-8" 
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setCurrentPage(1) // Resetear a la primera página al buscar
                      }}
                    />
                  </div>
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((product) => (
                      <TableRow 
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleViewProduct(product)}
                      >
                        <TableCell className="font-medium">{product.code}</TableCell>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                        </TableCell>
                        <TableCell>${product.price.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{product.stock}</span>
                            {product.stock <= product.min_stock && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                            {product.stock === 0 && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={(product.is_active && product.stock > 0) ? "default" : "secondary"}
                          >
                            {(product.is_active && product.stock > 0) ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewProduct(product)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canManageProducts && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    // TODO: Implementar edición
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteProduct(product.id)
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Paginación */}
              {!loading && products.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    isLoading={loading}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Modal de detalle del producto */}
        <ProductDetailModal
          product={selectedProduct}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
        />

        {/* Modal de nuevo producto */}
        <NewProductModal
          isOpen={isNewProductModalOpen}
          onClose={() => setIsNewProductModalOpen(false)}
          onSuccess={() => {
            loadProducts()
            loadProductStats()
          }}
        />
      </ERPLayout>
    </Protected>
  )
}
