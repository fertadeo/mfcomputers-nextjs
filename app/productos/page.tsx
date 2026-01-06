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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [productStats, setProductStats] = useState<ProductStats | null>(null)
  const limit = 50 // Productos por página

  // Cargar productos y estadísticas al montar el componente
  useEffect(() => {
    loadProducts()
    loadProductStats()
  }, [])

  // Recargar productos cuando cambie la página
  useEffect(() => {
    loadProducts()
  }, [currentPage])

  const loadProductStats = async () => {
    try {
      const stats = await getProductStats()
      setProductStats(stats)
    } catch (err) {
      console.error('Error al cargar estadísticas de productos:', err)
    }
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getProducts(currentPage, limit)
      
      // Verificar si la respuesta tiene estructura paginada
      if (data && typeof data === 'object' && 'products' in data && 'pagination' in data) {
        setProducts(data.products)
        setTotalPages(data.pagination.totalPages)
        setTotalProducts(data.pagination.total)
      } else if (Array.isArray(data)) {
        // Fallback: si es un array simple, usar paginación del lado del cliente
        setProducts(data)
        setTotalPages(Math.ceil(data.length / limit))
        setTotalProducts(data.length)
      } else {
        setProducts([])
        setTotalPages(1)
        setTotalProducts(0)
      }
    } catch (err) {
      console.error('Error al cargar productos:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
      setProducts([])
      setTotalPages(1)
      setTotalProducts(0)
    } finally {
      setLoading(false)
    }
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
              {canManageProducts && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              )}
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
                  ${productStats?.total_stock_value?.replace(/[^\d.-]/g, '') || products?.reduce((sum, p) => sum + (p.price * p.stock), 0)?.toLocaleString() || '0'}
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
                    <Input placeholder="Buscar productos..." className="pl-8" />
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
                        <TableCell>${product.price.toLocaleString()}</TableCell>
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
                            variant={product.is_active ? "default" : "secondary"}
                          >
                            {product.is_active ? "Activo" : "Inactivo"}
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
      </ERPLayout>
    </Protected>
  )
}
