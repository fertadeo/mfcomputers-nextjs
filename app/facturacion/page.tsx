import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Search, Plus, Download, Eye, Send, AlertTriangle, CheckCircle, Clock } from "lucide-react"

const facturasData = [
  {
    id: "FAC001",
    cliente: "María González",
    fecha: "2024-01-22",
    vencimiento: "2024-02-21",
    estado: "Pagada",
    total: 12450,
    tipo: "Factura A",
  },
  {
    id: "FAC002",
    cliente: "Comercial San Martín",
    fecha: "2024-01-21",
    vencimiento: "2024-02-20",
    estado: "Pendiente",
    total: 45230,
    tipo: "Factura B",
  },
  {
    id: "FAC003",
    cliente: "Juan Pérez",
    fecha: "2024-01-20",
    vencimiento: "2024-02-19",
    estado: "Vencida",
    total: 8900,
    tipo: "Factura C",
  },
  {
    id: "FAC004",
    cliente: "Distribuidora Norte",
    fecha: "2024-01-19",
    vencimiento: "2024-02-18",
    estado: "Enviada",
    total: 67800,
    tipo: "Factura A",
  },
]

export default function FacturacionPage() {
  return (
    <Protected requiredRoles={['gerencia', 'ventas', 'finanzas', 'admin']}>
      <ERPLayout activeItem="facturacion">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Facturación</h1>
            <p className="text-muted-foreground">Gestiona facturas, pagos y cumplimiento fiscal</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturado Este Mes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1,247,580</div>
              <p className="text-xs text-muted-foreground">+15% vs mes anterior</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes de Cobro</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">$113,030</div>
              <p className="text-xs text-muted-foreground">23 facturas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturas Vencidas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">$34,560</div>
              <p className="text-xs text-muted-foreground">8 facturas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Cobro</CardTitle>
              <CheckCircle className="h-4 w-4 text-turquoise-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">87%</div>
              <p className="text-xs text-muted-foreground">Promedio mensual</p>
            </CardContent>
          </Card>
        </div>

        {/* AFIP Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Estado de Integración AFIP
            </CardTitle>
            <CardDescription>Conexión con servicios fiscales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div>
                <div className="font-medium text-red-900 dark:text-red-100">Conexión AFIP Desconectada</div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  Reconecta para continuar emitiendo facturas electrónicas
                </div>
              </div>
              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-100 bg-transparent">
                Reconectar AFIP
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Facturas Recientes</CardTitle>
            <CardDescription>Lista de facturas emitidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar facturas..." className="pl-8" />
                </div>
              </div>
              <Button variant="outline">Filtros</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturasData.map((factura) => (
                  <TableRow key={factura.id}>
                    <TableCell className="font-medium">{factura.id}</TableCell>
                    <TableCell>{factura.cliente}</TableCell>
                    <TableCell>{factura.fecha}</TableCell>
                    <TableCell>{factura.vencimiento}</TableCell>
                    <TableCell>{factura.tipo}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          factura.estado === "Pagada"
                            ? "default"
                            : factura.estado === "Vencida"
                              ? "destructive"
                              : factura.estado === "Enviada"
                                ? "secondary"
                                : "outline"
                        }
                      >
                        {factura.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>${factura.total.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
