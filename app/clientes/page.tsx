"use client"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClienteDetailModal } from "@/components/cliente-detail-modal"
import { Users, Search, Plus, Mail, Phone, MapPin, Filter, Download, UserPlus, AlertCircle, CreditCard } from "lucide-react"
import { useState, useEffect } from "react"
import { getClientes, getClienteStats } from "@/lib/api"

const TAX_CONDITION_LABELS: Record<string, string> = {
  responsable_inscripto: "Responsable Inscripto",
  inscripto: "Inscripto",
  consumidor_final: "Consumidor Final",
  monotributo: "Monotributo",
  exento: "Exento"
}

const formatTaxConditionLabel = (value?: string, fallback: string = "N/A") => {
  if (!value) return fallback
  const normalized = value.toLowerCase().replace(/\s+/g, '_')
  return TAX_CONDITION_LABELS[normalized] ?? value
}

import { NewClientModal } from "@/components/new-client-modal"
import { Pagination } from "@/components/ui/pagination"
import { getSalesChannelConfig, SalesChannel } from "@/lib/utils"
import { CuentasCorrientesSummary } from "@/components/cuentas-corrientes-summary"
import { ClienteActivityModal } from "@/components/cliente-activity-modal"  
import { CuentaCorrienteStatusBadge } from "@/components/cuenta-corriente-status-badge"

// Tipo para la UI (formato mapeado)
interface ClienteUI {
  id: string; // Código del cliente (MAY001, etc)
  dbId: number; // ID numérico de la base de datos
  salesChannel: SalesChannel; // Canal de venta
  nombre: string;
  email: string;
  telefono: string;
  ciudad: string;
  tipo: "Minorista" | "Mayorista" | "Personalizado";
  estado: "Activo" | "Inactivo";
  ultimaCompra: string;
  totalCompras: number;
  direccion?: string;
  cuit?: string;
  cuitSecundario?: string;
  personType?: "Persona Física" | "Persona Jurídica";
  taxCondition?: string;
  ccEnabled?: boolean;
  ccLimit?: number;
  ccBalance?: number;
  limiteCredito?: number;
}

export default function ClientesPage() {
  const [selectedCliente, setSelectedCliente] = useState<ClienteUI | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false)
  const [selectedClienteForActivity, setSelectedClienteForActivity] = useState<ClienteUI | null>(null)
  const [clientes, setClientes] = useState<any[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [channelFilter, setChannelFilter] = useState<"all" | "sistema_principal" | "woocommerce_mayorista" | "woocommerce_minorista" | "mercadolibre" | "manual">("all")

  // Función para cargar clientes reales desde la API
  const loadData = async (page: number = 1, search: string = "", status: string = "all", channel: string = "all") => {
    console.log('🚀 [COMPONENT] Cargando clientes desde API para página:', page);
    
    try {
      setLoading(true)
      setError(null)
      
      const statusParam = status === "all" ? undefined : (status as "active" | "inactive")
      const clientsResponse = await getClientes(page, 10, search, statusParam)
      const statsResponse = await getClienteStats()

      const channelFilteredClients = channel === "all"
        ? clientsResponse.clients
        : clientsResponse.clients.filter((cliente: any) => cliente.sales_channel === channel)

      console.log('✅ [COMPONENT] Clientes recibidos desde API:', channelFilteredClients)
      setClientes(channelFilteredClients)
      setPagination(clientsResponse.pagination)

      console.log('✅ [COMPONENT] Estadísticas recibidas desde API:', statsResponse)
      setStats(statsResponse)

      console.log('🎉 [COMPONENT] Datos API cargados exitosamente')
    } catch (err) {
      console.error('💥 [COMPONENT] Error al cargar datos de clientes:', err)
      setError('Error al cargar los datos')
      setClientes([])
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 })
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  // Cargar datos al montar el componente y cuando cambien los filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(currentPage, searchTerm, statusFilter, channelFilter)
    }, searchTerm ? 500 : 0) // Debounce para búsqueda
    
    return () => clearTimeout(timer)
  }, [currentPage, searchTerm, statusFilter, channelFilter])

  const handleVerPerfil = (cliente: ClienteUI) => {
    setSelectedCliente(cliente)
    setIsModalOpen(true)
  }

  const handleVerActividad = (cliente: ClienteUI) => {
    setSelectedClienteForActivity(cliente)
    setIsActivityModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedCliente(null)
  }

  const handleCloseActivityModal = () => {
    setIsActivityModalOpen(false)
    setSelectedClienteForActivity(null)
  }

  const handleNewClientSuccess = () => {
    console.log('🔄 [COMPONENT] Recargando datos después de crear nuevo cliente')
    // Recargar los datos de la página actual
    loadData(currentPage)
  }

  const handlePageChange = (page: number) => {
    console.log('📄 [COMPONENT] Cambiando a página:', page)
    setCurrentPage(page)
  }

  // Función helper para mapear estadísticas de la API al formato esperado por la UI
  const mapStatsForUI = (apiStats: any) => {
    if (!apiStats) return null;
    
    return {
      totalClientes: apiStats.total_clients || 0,
      clientesActivos: parseInt(apiStats.active_clients) || 0,
      clientesInactivos: parseInt(apiStats.inactive_clients) || 0,
      ciudadesCount: apiStats.cities_count || 0,
      paisesCount: apiStats.countries_count || 0,
      // Valores calculados para la UI
      porcentajeActivos: apiStats.total_clients > 0 ? 
        Math.round((parseInt(apiStats.active_clients) / apiStats.total_clients) * 100) : 0,
      // Valores por defecto para campos que no vienen de la API
      nuevosEsteMes: 0, // La API no proporciona este dato
      valorPromedio: 0, // La API no proporciona este dato
      crecimientoPorcentaje: 0, // La API no proporciona este dato
      crecimientoNuevos: 0 // La API no proporciona este dato
    };
  };

  // Función helper para mapear clientes hardcodeados al formato esperado por la UI
  const mapClienteForUI = (apiCliente: any): ClienteUI => {
    // Datos de compras hardcodeados por cliente
    const comprasPorCliente: Record<number, number> = {
      1: 450000, // Empresa ABC
      2: 850000, // Distribuidora XYZ  
      3: 320000, // Comercial Tech Solutions
      4: 0,      // Ventas Directas (inactivo)
      5: 680000  // Importadora del Sur
    }
    const personType = apiCliente.person_type === 'persona_fisica' ? 'Persona Física' : 'Persona Jurídica'
    const taxCondition = formatTaxConditionLabel(
      apiCliente.tax_condition,
      personType === 'Persona Jurídica' ? 'Responsable Inscripto' : 'Consumidor Final'
    )
    const ccEnabled = Boolean(apiCliente.cc_enabled)
    const ccLimit = typeof apiCliente.cc_limit === 'number' ? apiCliente.cc_limit : undefined
    const ccBalance = typeof apiCliente.cc_balance === 'number' ? apiCliente.cc_balance : (ccEnabled ? 0 : undefined)
    
    return {
      id: apiCliente.code,
      dbId: apiCliente.id,
      salesChannel: apiCliente.sales_channel,
      nombre: apiCliente.name,
      email: apiCliente.email,
      telefono: apiCliente.phone,
      ciudad: apiCliente.city,
      direccion: apiCliente.address,
      tipo: apiCliente.client_type === 'minorista' ? 'Minorista' : 
            apiCliente.client_type === 'mayorista' ? 'Mayorista' : 
            apiCliente.client_type === 'personalizado' ? 'Personalizado' : 'Minorista',
      estado: apiCliente.is_active === 1 ? 'Activo' : 'Inactivo',
      ultimaCompra: new Date(apiCliente.updated_at).toLocaleDateString('es-AR'),
      totalCompras: comprasPorCliente[apiCliente.id] || 0,
      cuit: apiCliente.primary_tax_id,
      cuitSecundario: apiCliente.secondary_tax_id,
      personType,
      taxCondition,
      ccEnabled,
      ccLimit,
      ccBalance,
      limiteCredito: ccLimit
    };
  };

  // Mapear clientes a formato UI (sin filtro local, el filtro se hace en el backend)
  const clientesUI = Array.isArray(clientes) ? clientes.map(mapClienteForUI) : []

  // Mapear estadísticas para la UI
  const uiStats = mapStatsForUI(stats);

  return (
    <Protected requiredRoles={['gerencia', 'ventas', 'admin']}>
      <ERPLayout activeItem="clientes">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-muted-foreground">Administra tu base de clientes y relaciones comerciales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setIsNewClientModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : (uiStats?.totalClientes || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? "Cargando..." : `${uiStats?.ciudadesCount || 0} ciudades registradas`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <UserPlus className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">
                {loading ? "..." : (uiStats?.clientesActivos || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? "Cargando..." : `${uiStats?.porcentajeActivos || 0}% del total`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Inactivos</CardTitle>
              <Plus className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loading ? "..." : (uiStats?.clientesInactivos || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? "Cargando..." : `Clientes inactivos`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Países</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? "..." : (uiStats?.paisesCount || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Países registrados</p>
            </CardContent>
          </Card>
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Base de Clientes</CardTitle>
            <CardDescription>
              {loading ? "Cargando..." : `Mostrando ${clientes.length} de ${pagination.total} clientes registrados`}
              <br />
              <span className="text-xs text-muted-foreground">
                💡 Haga clic en cualquier fila para ver la actividad completa del cliente
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4 flex-wrap">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nombre, email o código..." 
                    className="pl-8" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
              <Select value={channelFilter} onValueChange={(value: any) => setChannelFilter(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Canal de Venta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Canales</SelectItem>
                  <SelectItem value="sistema_principal">Sistema Principal</SelectItem>
                  <SelectItem value="woocommerce_mayorista">WooCommerce Mayorista</SelectItem>
                  <SelectItem value="woocommerce_minorista">WooCommerce Minorista</SelectItem>
                  <SelectItem value="mercadolibre">MercadoLibre</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700">{error}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.reload()}
                  className="ml-auto"
                >
                  Reintentar
                </Button>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead>Cuenta Corriente</TableHead>
                  <TableHead>Saldo / Límite</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  // Estado de carga
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                        Cargando clientes...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : clientesUI.length === 0 ? (
                  // Sin resultados
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {searchTerm || statusFilter !== "all" || channelFilter !== "all" ? "No se encontraron clientes que coincidan con los filtros" : "No hay clientes registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  // Datos de clientes
                  clientesUI.map((cliente) => (
                  <TableRow 
                    key={cliente.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleVerActividad(cliente)}
                  >
                    <TableCell>
                      <Badge variant={cliente.tipo === "Mayorista" ? "default" : cliente.tipo === "Personalizado" ? "outline" : "secondary"}>
                        {cliente.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{cliente.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{cliente.nombre}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {cliente.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {cliente.telefono}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {cliente.ciudad}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${getSalesChannelConfig(cliente.salesChannel).color} border`}
                        title={getSalesChannelConfig(cliente.salesChannel).description}
                      >
                        <span className="mr-1">{getSalesChannelConfig(cliente.salesChannel).icon}</span>
                        {getSalesChannelConfig(cliente.salesChannel).shortLabel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cliente.estado === "Activo" ? "default" : "secondary"}>{cliente.estado}</Badge>
                    </TableCell>
                    <TableCell>{cliente.ultimaCompra}</TableCell>
                    <TableCell>
                      <CuentaCorrienteStatusBadge 
                        hasAccount={cliente.ccEnabled ?? false}
                        balance={cliente.ccBalance ?? 0}
                        creditLimit={cliente.ccLimit ?? 0}
                        isActive={cliente.ccEnabled ?? false}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      {cliente.ccEnabled && cliente.ccLimit !== undefined ? (
                        <div className="text-sm font-semibold">
                          ${Math.abs(cliente.ccBalance ?? 0).toLocaleString()} {cliente.ccBalance && cliente.ccBalance < 0 ? "(deuda)" : ""}
                          <span className="text-muted-foreground"> / ${cliente.ccLimit.toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin CC</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVerPerfil(cliente)
                          }}
                        >
                          Ver Perfil
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVerActividad(cliente)
                          }}
                        >
                          Actividad
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Paginación */}
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              isLoading={loading}
            />
          </div>
        )}

        {/* Cuentas Corrientes Summary */}
        <CuentasCorrientesSummary onRefresh={() => loadData(currentPage, searchTerm, statusFilter, channelFilter)} />

        {/* Modal de detalles del cliente */}
        <ClienteDetailModal
          cliente={selectedCliente as unknown as any}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onClientUpdated={() => loadData(currentPage, searchTerm, statusFilter, channelFilter)}
        />

        {/* Modal para nuevo cliente */}
        <NewClientModal
          isOpen={isNewClientModalOpen}
          onClose={() => setIsNewClientModalOpen(false)}
          onSuccess={handleNewClientSuccess}
        />

        {/* Modal de actividad del cliente */}
        {selectedClienteForActivity && (
          <ClienteActivityModal
            cliente={selectedClienteForActivity}
            isOpen={isActivityModalOpen}
            onClose={handleCloseActivityModal}
          />
        )}
        </div>
      </ERPLayout>
    </Protected>
  )
}
