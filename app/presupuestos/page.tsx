"use client"

import { useState } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { NewBudgetModal } from "@/components/new-budget-modal"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Plus,
  Eye,
  Edit,
  Send,
  FileText,
  Calculator,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"

// Datos de ejemplo para presupuestos
const presupuestosData = [
  {
    id: "PRES-001",
    cliente: "María González",
    email: "maria@email.com",
    telefono: "+54 11 1234-5678",
    producto: "Abanico Personalizado Arte Abstracto",
    material: "Plástico",
    cantidad: 50,
    diseño: "Arte abstracto con colores vibrantes",
    precioUnitario: 850,
    total: 42500,
    estado: "pendiente",
    fechaCreacion: "2024-01-15",
    fechaVencimiento: "2024-01-30",
    observaciones: "Cliente solicita muestra antes de producción",
  },
  {
    id: "PRES-002",
    cliente: "Carlos Rodríguez",
    email: "carlos@empresa.com",
    telefono: "+54 11 9876-5432",
    producto: "Abanico Corporativo Madera Premium",
    material: "Madera",
    cantidad: 100,
    diseño: "Logo corporativo con acabado elegante",
    precioUnitario: 1200,
    total: 120000,
    estado: "aprobado",
    fechaCreacion: "2024-01-10",
    fechaVencimiento: "2024-01-25",
    observaciones: "Aprobado para producción inmediata",
  },
  {
    id: "PRES-003",
    cliente: "Ana Martínez",
    email: "ana@eventos.com",
    telefono: "+54 11 5555-1234",
    producto: "Abanico Temático Boda",
    material: "Plástico",
    cantidad: 200,
    diseño: "Diseño romántico con nombres de novios",
    precioUnitario: 750,
    total: 150000,
    estado: "revision",
    fechaCreacion: "2024-01-12",
    fechaVencimiento: "2024-01-27",
    observaciones: "Esperando confirmación de colores",
  },
  {
    id: "PRES-004",
    cliente: "Festival de Arte",
    email: "info@festivalarte.com",
    telefono: "+54 11 7777-8888",
    producto: "Abanico Artístico Edición Limitada",
    material: "Madera",
    cantidad: 75,
    diseño: "Colaboración con artista local",
    precioUnitario: 1500,
    total: 112500,
    estado: "rechazado",
    fechaCreacion: "2024-01-08",
    fechaVencimiento: "2024-01-23",
    observaciones: "Presupuesto excede límite del cliente",
  },
]

const estadoConfig = {
  pendiente: {
    label: "Pendiente",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    icon: Clock,
  },
  aprobado: {
    label: "Aprobado",
    color: "bg-turquoise-100 text-turquoise-800 dark:bg-turquoise-900/20 dark:text-turquoise-400",
    icon: CheckCircle,
  },
  revision: {
    label: "En Revisión",
    color: "bg-turquoise-100 text-turquoise-800 dark:bg-turquoise-900/20 dark:text-turquoise-400",
    icon: AlertCircle,
  },
  rechazado: {
    label: "Rechazado",
    color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    icon: XCircle,
  },
}

export default function PresupuestosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEstado, setSelectedEstado] = useState("todos")
  const [isNewPresupuestoOpen, setIsNewPresupuestoOpen] = useState(false)
  const [selectedPresupuesto, setSelectedPresupuesto] = useState<any>(null)

  const filteredPresupuestos = presupuestosData.filter((presupuesto) => {
    const matchesSearch =
      presupuesto.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      presupuesto.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEstado = selectedEstado === "todos" || presupuesto.estado === selectedEstado
    return matchesSearch && matchesEstado
  })

  const totalPresupuestos = presupuestosData.length
  const pendientes = presupuestosData.filter((p) => p.estado === "pendiente").length
  const aprobados = presupuestosData.filter((p) => p.estado === "aprobado").length
  const valorTotal = presupuestosData.reduce((sum, p) => sum + p.total, 0)

  return (
    <Protected requiredRoles={['gerencia', 'ventas', 'admin']}>
      <ERPLayout activeItem="presupuestos">
        <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Presupuestos</h1>
            <p className="text-muted-foreground">Gestión de presupuestos para productos personalizados</p>
          </div>
          <Button 
            onClick={() => setIsNewPresupuestoOpen(true)}
            className="gap-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Nuevo Presupuesto
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Presupuestos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPresupuestos}</div>
              <p className="text-xs text-muted-foreground">Este mes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendientes}</div>
              <p className="text-xs text-muted-foreground">Esperando respuesta</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprobados</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-turquoise-600">{aprobados}</div>
              <p className="text-xs text-muted-foreground">Listos para producir</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${valorTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">En presupuestos activos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar por cliente o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="revision">En Revisión</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Presupuestos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Presupuestos</CardTitle>
            <CardDescription>{filteredPresupuestos.length} presupuesto(s) encontrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPresupuestos.map((presupuesto) => {
                    const estadoInfo = estadoConfig[presupuesto.estado as keyof typeof estadoConfig]
                    const IconComponent = estadoInfo.icon

                    return (
                      <TableRow key={presupuesto.id}>
                        <TableCell className="font-medium">{presupuesto.id}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{presupuesto.cliente}</div>
                            <div className="text-sm text-muted-foreground">{presupuesto.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-48">
                            <div className="font-medium truncate">{presupuesto.producto}</div>
                            <div className="text-sm text-muted-foreground truncate">{presupuesto.diseño}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{presupuesto.material}</Badge>
                        </TableCell>
                        <TableCell>{presupuesto.cantidad}</TableCell>
                        <TableCell className="font-medium">${presupuesto.total.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={estadoInfo.color}>
                            <IconComponent className="h-3 w-3 mr-1" />
                            {estadoInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{presupuesto.fechaVencimiento}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedPresupuesto(presupuesto)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Detalle */}
        <Dialog open={!!selectedPresupuesto} onOpenChange={() => setSelectedPresupuesto(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle del Presupuesto {selectedPresupuesto?.id}</DialogTitle>
            </DialogHeader>
            {selectedPresupuesto && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Cliente</Label>
                    <p className="text-sm">{selectedPresupuesto.cliente}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm">{selectedPresupuesto.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Teléfono</Label>
                    <p className="text-sm">{selectedPresupuesto.telefono}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Estado</Label>
                    <Badge className={estadoConfig[selectedPresupuesto.estado as keyof typeof estadoConfig].color}>
                      {estadoConfig[selectedPresupuesto.estado as keyof typeof estadoConfig].label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Producto</Label>
                  <p className="text-sm">{selectedPresupuesto.producto}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Descripción del Diseño</Label>
                  <p className="text-sm">{selectedPresupuesto.diseño}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Material</Label>
                    <p className="text-sm">{selectedPresupuesto.material}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Cantidad</Label>
                    <p className="text-sm">{selectedPresupuesto.cantidad}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Precio Unitario</Label>
                    <p className="text-sm">${selectedPresupuesto.precioUnitario}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total</Label>
                  <p className="text-lg font-bold">${selectedPresupuesto.total.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Observaciones</Label>
                  <p className="text-sm">{selectedPresupuesto.observaciones}</p>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline">Editar</Button>
                  <Button>Enviar por Email</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Nuevo Presupuesto */}
        <NewBudgetModal
          isOpen={isNewPresupuestoOpen}
          onClose={() => setIsNewPresupuestoOpen(false)}
          onSuccess={() => {
            setIsNewPresupuestoOpen(false)
            // Aquí podrías agregar lógica para refrescar la lista de presupuestos
            console.log('Presupuesto creado exitosamente')
          }}
        />
        </div>
      </ERPLayout>
    </Protected>
  )
}
