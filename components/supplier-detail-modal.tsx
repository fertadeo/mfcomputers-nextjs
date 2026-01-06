"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  Building2,
  ShoppingCart, 
  FileText, 
  Truck,
  CreditCard,
  Link2,
  TrendingUp,
  DollarSign,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Package,
  Receipt,
  ArrowRight,
  Calendar,
  Plus,
  Wallet
} from "lucide-react"
import { type Supplier } from "@/lib/api"
import { SupplierInvoiceModal } from "@/components/supplier-invoice-modal"
import { AccruedExpenseModal } from "@/components/accrued-expense-modal"
import { AccruedLiabilityModal } from "@/components/accrued-liability-modal"

interface SupplierDetailModalProps {
  supplier: Supplier | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
  onRefresh?: () => void
}

// Datos hardcodeados para visualización
const mockPurchaseOrders = [
  {
    id: 1,
    purchase_number: "OC-2024-001",
    date: "2024-01-15",
    status: "pending",
    debt_type: "compromiso",
    total_amount: 150000.00,
    commitment_amount: 150000.00,
    debt_amount: 0.00,
    items_count: 5
  },
  {
    id: 2,
    purchase_number: "OC-2024-002",
    date: "2024-01-20",
    status: "received",
    debt_type: "deuda_directa",
    total_amount: 250000.00,
    commitment_amount: 0.00,
    debt_amount: 250000.00,
    items_count: 8
  },
  {
    id: 3,
    purchase_number: "OC-2024-003",
    date: "2024-01-25",
    status: "pending",
    debt_type: "compromiso",
    total_amount: 85000.00,
    commitment_amount: 85000.00,
    debt_amount: 0.00,
    items_count: 3
  }
]

const mockInvoices = [
  {
    id: 1,
    invoice_number: "FC-2024-001",
    date: "2024-01-18",
    due_date: "2024-02-18",
    status: "paid",
    total_amount: 150000.00,
    purchase_id: 1,
    purchase_number: "OC-2024-001",
    items: [
      { material_code: "MAT-001", description: "Motor Eléctrico 1HP", quantity: 10, unit_price: 15000.00 }
    ]
  },
  {
    id: 2,
    invoice_number: "FC-2024-002",
    date: "2024-01-22",
    due_date: "2024-02-22",
    status: "pending",
    total_amount: 250000.00,
    purchase_id: 2,
    purchase_number: "OC-2024-002",
    items: [
      { material_code: "MAT-002", description: "Aspas Premium", quantity: 50, unit_price: 5000.00 }
    ]
  }
]

const mockDeliveryNotes = [
  {
    id: 1,
    delivery_number: "REM-2024-001",
    date: "2024-01-19",
    purchase_id: 1,
    purchase_number: "OC-2024-001",
    invoice_id: 1,
    invoice_number: "FC-2024-001",
    status: "validated",
    items_count: 5
  },
  {
    id: 2,
    delivery_number: "REM-2024-002",
    date: "2024-01-23",
    purchase_id: 2,
    purchase_number: "OC-2024-002",
    invoice_id: null,
    invoice_number: null,
    status: "pending",
    items_count: 8
  }
]

const mockAccountMovements = [
  {
    id: 1,
    date: "2024-01-15",
    type: "commitment",
    description: "OC-2024-001 - Compromiso",
    amount: 150000.00,
    balance_after: 150000.00
  },
  {
    id: 2,
    date: "2024-01-18",
    type: "debt",
    description: "FC-2024-001 - Factura recibida",
    amount: 150000.00,
    balance_after: 300000.00
  },
  {
    id: 3,
    date: "2024-01-20",
    type: "debt",
    description: "OC-2024-002 - Deuda directa",
    amount: 250000.00,
    balance_after: 550000.00
  },
  {
    id: 4,
    date: "2024-01-25",
    type: "payment",
    description: "Pago FC-2024-001",
    amount: -150000.00,
    balance_after: 400000.00
  }
]

const mockTraceability = [
  {
    oc: { number: "OC-2024-001", date: "2024-01-15", amount: 150000.00 },
    invoice: { number: "FC-2024-001", date: "2024-01-18", amount: 150000.00 },
    delivery_note: { number: "REM-2024-001", date: "2024-01-19" },
    payment: { date: "2024-01-25", amount: 150000.00, status: "paid" },
    status: "complete"
  },
  {
    oc: { number: "OC-2024-002", date: "2024-01-20", amount: 250000.00 },
    invoice: { number: "FC-2024-002", date: "2024-01-22", amount: 250000.00 },
    delivery_note: { number: "REM-2024-002", date: "2024-01-23" },
    payment: null,
    status: "pending_payment"
  }
]

export function SupplierDetailModal({ supplier, isOpen, onClose, onEdit, onRefresh }: SupplierDetailModalProps) {
  const [activeTab, setActiveTab] = useState<string>("resumen")
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [isAccruedExpenseModalOpen, setIsAccruedExpenseModalOpen] = useState(false)
  const [isAccruedLiabilityModalOpen, setIsAccruedLiabilityModalOpen] = useState(false)

  if (!supplier) return null

  // Determinar tipo de proveedor
  const isProductivo = supplier.supplier_type === 'productivo'
  const isNoProductivo = supplier.supplier_type === 'no_productivo'
  const isOtroPasivo = supplier.supplier_type === 'otro_pasivo'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR')
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendiente", variant: "secondary" },
      received: { label: "Recibida", variant: "default" },
      paid: { label: "Pagada", variant: "default" },
      validated: { label: "Validada", variant: "default" },
      complete: { label: "Completa", variant: "default" },
      pending_payment: { label: "Pago Pendiente", variant: "secondary" }
    }
    const config = statusMap[status] || { label: status, variant: "outline" }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getDebtTypeBadge = (debtType: string) => {
    if (debtType === "compromiso") {
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Compromiso</Badge>
    }
    return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Deuda Directa</Badge>
  }

  // Calcular resumen de cuenta corriente
  const totalCommitment = mockAccountMovements
    .filter(m => m.type === "commitment")
    .reduce((sum, m) => sum + m.amount, 0)
  const totalDebt = mockAccountMovements
    .filter(m => m.type === "debt")
    .reduce((sum, m) => sum + m.amount, 0)
  const totalPayments = Math.abs(mockAccountMovements
    .filter(m => m.type === "payment")
    .reduce((sum, m) => sum + m.amount, 0))
  const currentBalance = mockAccountMovements[mockAccountMovements.length - 1]?.balance_after || 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-7xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              {supplier.legal_name || supplier.name}
          </DialogTitle>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Eye className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tabs de navegación */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-2 border-b bg-background">
            <TabsList className={`grid w-full ${isOtroPasivo ? 'grid-cols-4' : isNoProductivo ? 'grid-cols-7' : 'grid-cols-6'}`}>
              <TabsTrigger value="resumen" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Resumen</span>
              </TabsTrigger>
              {!isOtroPasivo && (
                <>
                  <TabsTrigger value="oc" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden sm:inline">Órdenes</span>
                  </TabsTrigger>
                  <TabsTrigger value="facturas" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Facturas</span>
                  </TabsTrigger>
                  {isProductivo && (
                    <TabsTrigger value="remitos" className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      <span className="hidden sm:inline">Remitos</span>
                    </TabsTrigger>
                  )}
                </>
              )}
              {isNoProductivo && (
                <TabsTrigger value="egresos" className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Egresos</span>
                </TabsTrigger>
              )}
              {isOtroPasivo && (
                <TabsTrigger value="pasivos" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Pasivos</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="cuenta-corriente" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Cuenta</span>
              </TabsTrigger>
              {isProductivo && (
                <TabsTrigger value="trazabilidad" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Trazabilidad</span>
                </TabsTrigger>
              )}
            </TabsList>
              </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Tab: Resumen */}
            <TabsContent value="resumen" className="space-y-4 mt-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total OC</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold">{mockPurchaseOrders.length}</div>
                <p className="text-xs text-muted-foreground">
                      {formatCurrency(mockPurchaseOrders.reduce((sum, oc) => sum + oc.total_amount, 0))}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Compromiso</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(totalCommitment)}
                    </div>
                    <p className="text-xs text-muted-foreground">En compromiso</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deuda</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalDebt)}
                    </div>
                    <p className="text-xs text-muted-foreground">Deuda real</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Balance</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(currentBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">Saldo actual</p>
              </CardContent>
            </Card>
          </div>

              {/* Información del Proveedor */}
              <Card>
                <CardHeader>
                  <CardTitle>Información del Proveedor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Código</p>
                      <p className="text-base font-semibold">{supplier.code}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                      <p className="text-base">
                        {supplier.supplier_type ? (
                          <Badge variant="outline">
                            {supplier.supplier_type === 'productivo' ? 'Productivo' :
                             supplier.supplier_type === 'no_productivo' ? 'No Productivo' : 'Otro Pasivo'}
                          </Badge>
                        ) : '-'}
                      </p>
                    </div>
                    {supplier.legal_name && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Razón Social</p>
                        <p className="text-base">{supplier.legal_name}</p>
                  </div>
                    )}
                    {supplier.trade_name && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Nombre de Fantasía</p>
                        <p className="text-base">{supplier.trade_name}</p>
                    </div>
                    )}
                    {supplier.contact_name && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Contacto</p>
                        <p className="text-base">{supplier.contact_name}</p>
                      </div>
                    )}
                    {supplier.email && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Email</p>
                        <p className="text-base">{supplier.email}</p>
                    </div>
                  )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Órdenes de Compra */}
            <TabsContent value="oc" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Órdenes de Compra</CardTitle>
                  <CardDescription>Lista de órdenes de compra con indicadores de compromiso/deuda</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OC</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Compromiso</TableHead>
                        <TableHead>Deuda</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Items</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockPurchaseOrders.map((oc) => (
                        <TableRow key={oc.id}>
                          <TableCell className="font-medium">{oc.purchase_number}</TableCell>
                          <TableCell>{formatDate(oc.date)}</TableCell>
                          <TableCell>{getDebtTypeBadge(oc.debt_type)}</TableCell>
                          <TableCell>
                            {oc.commitment_amount > 0 ? (
                              <span className="text-blue-600 font-medium">
                                {formatCurrency(oc.commitment_amount)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {oc.debt_amount > 0 ? (
                              <span className="text-orange-600 font-medium">
                                {formatCurrency(oc.debt_amount)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(oc.total_amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(oc.status)}</TableCell>
                          <TableCell>{oc.items_count} items</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Facturas */}
            <TabsContent value="facturas" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Facturas</CardTitle>
                      <CardDescription>
                        {isProductivo 
                          ? "Facturas con códigos de materiales" 
                          : "Facturas (pueden existir sin OC previa)"}
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => setIsInvoiceModalOpen(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Factura
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Factura</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>OC Relacionada</TableHead>
                        <TableHead>Materiales</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell>
                            {invoice.purchase_number ? (
                              <Badge variant="outline">{invoice.purchase_number}</Badge>
                            ) : (
                              isNoProductivo ? (
                                <Badge variant="secondary" className="text-xs">Sin OC</Badge>
                              ) : '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {invoice.items.map((item, idx) => (
                                <div key={idx} className="text-sm">
                                  <Badge variant="secondary" className="mr-1">{item.material_code}</Badge>
                                  <span className="text-muted-foreground">{item.description}</span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(invoice.total_amount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Remitos (Solo Productivos) */}
            {isProductivo && (
              <TabsContent value="remitos" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Remitos de Entrega</CardTitle>
                    <CardDescription>Remitos con validación de coincidencia</CardDescription>
                  </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Remito</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>OC Relacionada</TableHead>
                        <TableHead>Factura Relacionada</TableHead>
                        <TableHead>Validación</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockDeliveryNotes.map((remito) => (
                        <TableRow key={remito.id}>
                          <TableCell className="font-medium">{remito.delivery_number}</TableCell>
                          <TableCell>{formatDate(remito.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{remito.purchase_number}</Badge>
                          </TableCell>
                          <TableCell>
                            {remito.invoice_number ? (
                              <Badge variant="outline">{remito.invoice_number}</Badge>
                            ) : (
                              <span className="text-muted-foreground">Sin factura</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {remito.status === "validated" ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Coincide
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendiente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{remito.items_count} items</TableCell>
                          <TableCell>{getStatusBadge(remito.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              </TabsContent>
            )}

            {/* Tab: Egresos Devengados (Solo No Productivos) */}
            {isNoProductivo && (
              <TabsContent value="egresos" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Egresos Devengados</CardTitle>
                        <CardDescription>Compromisos o devengamientos sin factura (seguros, impuestos, alquileres)</CardDescription>
                      </div>
                      <Button 
                        onClick={() => setIsAccruedExpenseModalOpen(true)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Egreso
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          id: 1,
                          concept: "Seguro de Responsabilidad Civil",
                          category: "seguro",
                          amount: 45000.00,
                          accrual_date: "2024-01-01",
                          due_date: "2024-12-31",
                          status: "pending"
                        },
                        {
                          id: 2,
                          concept: "Alquiler Mensual - Enero",
                          category: "alquiler",
                          amount: 120000.00,
                          accrual_date: "2024-01-01",
                          due_date: "2024-01-31",
                          status: "paid"
                        }
                      ].map((egreso) => (
                        <Card key={egreso.id} className="border-l-4 border-l-blue-500">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{egreso.concept}</h4>
                                  <Badge variant="outline">{egreso.category}</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Devengamiento:</span>
                                    <p className="font-medium">{formatDate(egreso.accrual_date)}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Vencimiento:</span>
                                    <p className="font-medium">{formatDate(egreso.due_date)}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold">{formatCurrency(egreso.amount)}</p>
                                {egreso.status === "pending" ? (
                                  <Badge variant="secondary" className="mt-2">Pendiente</Badge>
                                ) : (
                                  <Badge className="mt-2 bg-green-500">Pagado</Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Pasivos Devengados (Solo Otros Pasivos) */}
            {isOtroPasivo && (
              <TabsContent value="pasivos" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Pasivos Devengados</CardTitle>
                        <CardDescription>Obligaciones no derivadas de proveedores tradicionales (impuestos, seguros, alquileres)</CardDescription>
                      </div>
                      <Button 
                        onClick={() => setIsAccruedLiabilityModalOpen(true)}
                        size="sm"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Pasivo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead>Devengamiento</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Cuenta Tesorería</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          {
                            id: 1,
                            liability_type: "impuesto",
                            description: "IVA Mensual - Enero 2024",
                            accrual_date: "2024-01-01",
                            due_date: "2024-02-10",
                            amount: 85000.00,
                            status: "pending",
                            treasury_account: "Caja General"
                          },
                          {
                            id: 2,
                            liability_type: "seguro",
                            description: "Seguro de Incendio - Anual",
                            accrual_date: "2024-01-01",
                            due_date: "2024-12-31",
                            amount: 125000.00,
                            status: "partial",
                            treasury_account: "Banco Nación"
                          }
                        ].map((pasivo) => (
                          <TableRow key={pasivo.id}>
                            <TableCell>
                              <Badge variant="outline">{pasivo.liability_type}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{pasivo.description}</TableCell>
                            <TableCell>{formatDate(pasivo.accrual_date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {formatDate(pasivo.due_date)}
                                {new Date(pasivo.due_date) < new Date() && (
                                  <Badge variant="destructive" className="text-xs">Vencido</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{formatCurrency(pasivo.amount)}</TableCell>
                            <TableCell>
                              {pasivo.status === "pending" ? (
                                <Badge variant="secondary">Pendiente</Badge>
                              ) : pasivo.status === "partial" ? (
                                <Badge className="bg-yellow-500">Parcial</Badge>
                              ) : (
                                <Badge className="bg-green-500">Pagado</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{pasivo.treasury_account}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Cuenta Corriente */}
            <TabsContent value="cuenta-corriente" className="space-y-4 mt-0">
              {/* Resumen de Cuenta */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Compromiso</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(totalCommitment)}
                    </div>
                    <p className="text-xs text-muted-foreground">En compromiso</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deuda</CardTitle>
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalDebt)}
                  </div>
                    <p className="text-xs text-muted-foreground">Deuda real</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pagos</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalPayments)}
                    </div>
                    <p className="text-xs text-muted-foreground">Total pagado</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(currentBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground">Saldo actual</p>
                </CardContent>
              </Card>
            </div>

              {/* Movimientos */}
            <Card>
              <CardHeader>
                  <CardTitle>Movimientos de Cuenta Corriente</CardTitle>
                  <CardDescription>Historial de movimientos</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {mockAccountMovements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>{formatDate(movement.date)}</TableCell>
                        <TableCell>
                            {movement.type === "commitment" && (
                              <Badge className="bg-blue-500">Compromiso</Badge>
                            )}
                            {movement.type === "debt" && (
                              <Badge className="bg-orange-500">Deuda</Badge>
                            )}
                            {movement.type === "payment" && (
                              <Badge className="bg-green-500">Pago</Badge>
                            )}
                          </TableCell>
                          <TableCell>{movement.description}</TableCell>
                          <TableCell className={movement.amount < 0 ? "text-green-600" : "text-red-600"}>
                            {movement.amount < 0 ? "" : "+"}{formatCurrency(movement.amount)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(movement.balance_after)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </TabsContent>

            {/* Tab: Trazabilidad */}
            <TabsContent value="trazabilidad" className="space-y-4 mt-0">
            <Card>
              <CardHeader>
                  <CardTitle>Trazabilidad Completa</CardTitle>
                  <CardDescription>Vista de flujo OC → Factura → Remito → Pago</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="space-y-6">
                    {mockTraceability.map((trace, idx) => (
                      <Card key={idx} className="border-l-4 border-l-primary">
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* OC */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium">Orden de Compra</span>
                              </div>
                              <p className="font-semibold">{trace.oc.number}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(trace.oc.date)}</p>
                              <p className="text-sm font-medium">{formatCurrency(trace.oc.amount)}</p>
                            </div>

                            <div className="flex items-center justify-center">
                              <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </div>

                            {/* Factura */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">Factura</span>
                              </div>
                              <p className="font-semibold">{trace.invoice.number}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(trace.invoice.date)}</p>
                              <p className="text-sm font-medium">{formatCurrency(trace.invoice.amount)}</p>
                            </div>

                            <div className="flex items-center justify-center">
                              <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </div>

                            {/* Remito */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4 text-purple-500" />
                                <span className="text-sm font-medium">Remito</span>
                              </div>
                              <p className="font-semibold">{trace.delivery_note.number}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(trace.delivery_note.date)}</p>
                            </div>

                            {trace.payment && (
                              <>
                                <div className="flex items-center justify-center">
                                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-medium">Pago</span>
                        </div>
                                  <p className="text-xs text-muted-foreground">{formatDate(trace.payment.date)}</p>
                                  <p className="text-sm font-medium">{formatCurrency(trace.payment.amount)}</p>
                                  <Badge className={trace.payment.status === "paid" ? "bg-green-500" : "bg-yellow-500"}>
                                    {trace.payment.status === "paid" ? "Pagado" : "Pendiente"}
                                  </Badge>
                      </div>
                              </>
                            )}
                      </div>

                          <Separator className="my-4" />

                          <div className="flex items-center justify-between">
                            <Badge variant={trace.status === "complete" ? "default" : "secondary"}>
                              {trace.status === "complete" ? "Completo" : "Pago Pendiente"}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalle
                            </Button>
                    </div>
                        </CardContent>
                      </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
            </TabsContent>
        </div>
        </Tabs>

        {/* Modales */}
        <SupplierInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onSuccess={() => {
            setIsInvoiceModalOpen(false)
            onRefresh?.()
          }}
          supplierId={supplier.id}
          mode="create"
        />

        <AccruedExpenseModal
          isOpen={isAccruedExpenseModalOpen}
          onClose={() => setIsAccruedExpenseModalOpen(false)}
          onSuccess={() => {
            setIsAccruedExpenseModalOpen(false)
            onRefresh?.()
          }}
          supplierId={supplier.id}
          mode="create"
        />

        <AccruedLiabilityModal
          isOpen={isAccruedLiabilityModalOpen}
          onClose={() => setIsAccruedLiabilityModalOpen(false)}
          onSuccess={() => {
            setIsAccruedLiabilityModalOpen(false)
            onRefresh?.()
          }}
          mode="create"
        />
      </DialogContent>
    </Dialog>
  )
}
