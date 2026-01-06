"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useRole } from "@/app/hooks/useRole"
import { getClienteStats, getProductStats, getPurchaseStats } from "@/lib/api"
import { getCashDay } from "@/lib/cash"
import {
  Package,
  DollarSign,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Users,
  ShoppingCart,
  Bell,
  Eye,
  ArrowUpRight,
  Calendar,
  Shield,
  Loader2,
} from "lucide-react"

export default function Dashboard() {
  const { getCurrentRole, getCurrentRoleLabel, canViewSales, canViewLogistics, canViewFinance, canViewAdministration } = useRole()
  
  // Estados para los datos de la API
  const [loading, setLoading] = useState(true)
  const [clienteStats, setClienteStats] = useState<{ total_clients: number; active_clients: string } | null>(null)
  const [productStats, setProductStats] = useState<{ low_stock_count: number; out_of_stock_count: number } | null>(null)
  const [cashDay, setCashDay] = useState<{ incomes: number; expenses: number; balance: number } | null>(null)
  const [purchaseStats, setPurchaseStats] = useState<{ pending_orders?: number; total_value?: number; suppliers_count?: number } | null>(null)

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        
        // Cargar estadísticas en paralelo
        const [clientesData, productosData, cajaData, comprasData] = await Promise.allSettled([
          getClienteStats().catch(() => null),
          getProductStats().catch(() => null),
          getCashDay().catch(() => null),
          getPurchaseStats().catch(() => null)
        ])

        if (clientesData.status === 'fulfilled' && clientesData.value) {
          setClienteStats(clientesData.value)
        }
        
        if (productosData.status === 'fulfilled' && productosData.value) {
          setProductStats(productosData.value)
        }
        
        if (cajaData.status === 'fulfilled' && cajaData.value) {
          setCashDay(cajaData.value)
        }
        
        if (comprasData.status === 'fulfilled' && comprasData.value) {
          setPurchaseStats(comprasData.value.data || comprasData.value)
        }
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])
  
  return (
    <ERPLayout activeItem="dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-foreground">Dashboard MF Computers</h1>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {getCurrentRoleLabel()}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Resumen general de venta minorista -{" "}
                {new Date().toLocaleDateString("es-ES", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Filtrar período
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Notificaciones
                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                  3
                </Badge>
              </Button>
            </div>
          </div>
        </div>

        {/* Información específica por rol */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Vista Personalizada para {getCurrentRoleLabel()}
            </CardTitle>
            <CardDescription>
              Información relevante según tu rol en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {canViewSales() && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="font-medium">Ventas</div>
                    <div className="text-sm text-muted-foreground">Acceso completo</div>
                  </div>
                </div>
              )}
              {canViewLogistics() && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Package className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-medium">Logística</div>
                    <div className="text-sm text-muted-foreground">Gestión de inventario</div>
                  </div>
                </div>
              )}
              {canViewFinance() && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <DollarSign className="h-8 w-8 text-yellow-500" />
                  <div>
                    <div className="font-medium">Finanzas</div>
                    <div className="text-sm text-muted-foreground">Control financiero</div>
                  </div>
                </div>
              )}
              {canViewAdministration() && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Shield className="h-8 w-8 text-purple-500" />
                  <div>
                    <div className="font-medium">Administración</div>
                    <div className="text-sm text-muted-foreground">Gestión del sistema</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs Principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(canViewSales() || canViewFinance()) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-turquoise-600">
                      ${cashDay?.incomes?.toLocaleString() || '0'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-turquoise-500" />
                      Ingresos de hoy
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos del Día</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {purchaseStats?.pending_orders || 0}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ClipboardList className="h-3 w-3 text-turquoise-500" />
                    Pedidos recibidos hoy
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {clienteStats?.active_clients || '0'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3 text-turquoise-500" />
                    De {clienteStats?.total_clients || 0} totales
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    {(productStats?.low_stock_count || 0) + (productStats?.out_of_stock_count || 0)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">Stock bajo mínimo</div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stock y Ventas */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventario Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {productStats ? (productStats.low_stock_count + productStats.out_of_stock_count) : '0'} productos
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Package className="h-3 w-3 text-turquoise-500" />
                    Productos en inventario
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">1,847</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <TrendingUp className="h-3 w-3 text-turquoise-500" />
                +12% vs mes anterior
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Caja y Compras */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Caja del Día
              </CardTitle>
              <CardDescription>Ingresos y egresos de hoy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ingresos</span>
                    <span className="text-lg font-semibold text-turquoise-600">
                      ${cashDay?.incomes?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Egresos</span>
                    <span className="text-lg font-semibold text-red-600">
                      ${cashDay?.expenses?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Balance</span>
                      <span className="text-xl font-bold text-turquoise-600">
                        ${cashDay?.balance?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                </>
              )}
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                <Eye className="h-4 w-4 mr-2" />
                Ver detalle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Compras Pendientes
              </CardTitle>
              <CardDescription>Órdenes de compra a proveedores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Órdenes Pendientes</span>
                    <Badge variant="outline">{purchaseStats?.pending_orders || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Valor Total</span>
                    <span className="font-semibold">
                      ${purchaseStats?.total_value?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Proveedores</span>
                    <Badge variant="secondary">{purchaseStats?.suppliers_count || 0}</Badge>
                  </div>
                </>
              )}
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                <Eye className="h-4 w-4 mr-2" />
                Ver órdenes
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pedidos y Integraciones */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Resumen de Pedidos
              </CardTitle>
              <CardDescription>Estado general de pedidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">1,847</div>
                  <div className="text-xs text-muted-foreground">Total del Mes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-turquoise-600">34</div>
                  <div className="text-xs text-muted-foreground">Hoy</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pendientes</span>
                  <Badge variant="outline">127</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">En Preparación</span>
                  <Badge variant="secondary">45</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Entregados</span>
                  <Badge variant="default">1,675</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Estado de Integraciones
              </CardTitle>
              <CardDescription>Conexiones con servicios externos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-turquoise-500 rounded-full"></div>
                    <span className="text-sm">WooCommerce</span>
                  </div>
                  <Badge variant="default" className="bg-turquoise-500">
                    Activo
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-turquoise-500 rounded-full"></div>
                    <span className="text-sm">MercadoLibre</span>
                  </div>
                  <Badge variant="default" className="bg-turquoise-500">
                    Activo
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-sm">AFIP</span>
                  </div>
                  <Badge variant="destructive">Desconectado</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm">Shopify</span>
                  </div>
                  <Badge variant="outline">Sincronizando</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full bg-transparent">
                <Zap className="h-4 w-4 mr-2" />
                Configurar integraciones
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Alertas y Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas Importantes
            </CardTitle>
            <CardDescription>Notificaciones que requieren atención</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Stock crítico detectado</div>
                  <div className="text-xs text-muted-foreground">
                    {(productStats?.low_stock_count || 0) + (productStats?.out_of_stock_count || 0)} productos por debajo del stock mínimo
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Revisar
                </Button>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Pedidos atrasados</div>
                  <div className="text-xs text-muted-foreground">3 pedidos superaron el tiempo estimado de entrega</div>
                </div>
                <Button variant="outline" size="sm">
                  Ver pedidos
                </Button>
              </div>
              <div className="flex items-start gap-3 p-3 bg-turquoise-50 dark:bg-turquoise-950/20 rounded-lg border border-turquoise-200 dark:border-turquoise-800">
                <Zap className="h-4 w-4 text-turquoise-500 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Integración AFIP desconectada</div>
                  <div className="text-xs text-muted-foreground">Reconectar para continuar con la facturación</div>
                </div>
                <Button variant="outline" size="sm">
                  Conectar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  )
}
