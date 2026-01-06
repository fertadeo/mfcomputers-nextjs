"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  AlertTriangle, 
  CheckCircle, 
  Calendar, 
  User, 
  DollarSign, 
  CreditCard, 
  ShoppingCart, 
  Plus,
  Trash2,
  FileText,
  Settings,
  Calculator,
  Percent,
  Clock,
  CheckSquare
} from "lucide-react"

interface NewBudgetModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface BudgetItem {
  id: string
  product: string
  description: string
  quantity: number
  vat: number
  recovery: number
  unitPrice: number
  subtotal: number
}

interface FormData {
  date: string
  client: string
  currency: string
  quote: number
  paymentMethod: string
  seller: string
  priceList: string
  internalObservations: string
  proforma: boolean
  totalize: boolean
  detailPrice: boolean
  feasibility: number
  validity: number
}

export function NewBudgetModal({ isOpen, onClose, onSuccess }: NewBudgetModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'texts' | 'observations'>('general')
  
  const [formData, setFormData] = useState<FormData>({
    date: new Date().toISOString().split('T')[0],
    client: "",
    currency: "pesos",
    quote: 1.0,
    paymentMethod: "cuenta_corriente",
    seller: "administracion",
    priceList: "general",
    internalObservations: "",
    proforma: false,
    totalize: true,
    detailPrice: true,
    feasibility: 0,
    validity: 10
  })

  const [currentItem, setCurrentItem] = useState({
    product: "",
    description: "",
    quantity: 1,
    vat: 21.0,
    recovery: 0.0,
    unitPrice: 0
  })

  const [items, setItems] = useState<BudgetItem[]>([])

  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setError(null)
  }

  const handleItemChange = (field: keyof typeof currentItem, value: string | number) => {
    setCurrentItem(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addItem = () => {
    if (!currentItem.product.trim()) {
      setError("Debe ingresar un producto")
      return
    }

    const subtotal = currentItem.quantity * currentItem.unitPrice
    const newItem: BudgetItem = {
      id: Date.now().toString(),
      product: currentItem.product,
      description: currentItem.description,
      quantity: currentItem.quantity,
      vat: currentItem.vat,
      recovery: currentItem.recovery,
      unitPrice: currentItem.unitPrice,
      subtotal
    }

    setItems(prev => [...prev, newItem])
    setCurrentItem({
      product: "",
      description: "",
      quantity: 1,
      vat: 21.0,
      recovery: 0.0,
      unitPrice: 0
    })
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
    const vat21 = items.filter(item => item.vat === 21.0).reduce((sum, item) => sum + (item.subtotal * 0.21), 0)
    const vat105 = items.filter(item => item.vat === 10.5).reduce((sum, item) => sum + (item.subtotal * 0.105), 0)
    const exempt = items.filter(item => item.vat === 0).reduce((sum, item) => sum + item.subtotal, 0)
    const total = subtotal + vat21 + vat105

    return {
      subtotal,
      vat21,
      vat105,
      exempt,
      total
    }
  }

  const totals = calculateTotals()

  const validateForm = () => {
    if (!formData.client.trim()) {
      setError("Debe seleccionar un cliente")
      return false
    }
    if (items.length === 0) {
      setError("Debe agregar al menos un producto")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      // Aquí iría la lógica para enviar el presupuesto a la API
      console.log('Creando presupuesto:', { formData, items, totals })
      
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess()
        onClose()
        resetForm()
      }, 1500)

    } catch (err) {
      console.error('Error al crear presupuesto:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al crear el presupuesto')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      client: "",
      currency: "pesos",
      quote: 1.0,
      paymentMethod: "cuenta_corriente",
      seller: "administracion",
      priceList: "general",
      internalObservations: "",
      proforma: false,
      totalize: true,
      detailPrice: true,
      feasibility: 0,
      validity: 10
    })
    setItems([])
    setCurrentItem({
      product: "",
      description: "",
      quantity: 1,
      vat: 21.0,
      recovery: 0.0,
      unitPrice: 0
    })
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[78vw] h-[78vh] max-w-none max-h-none overflow-y-auto bg-slate-900 dark:bg-slate-900 border-slate-700">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            Nuevo Presupuesto
          </DialogTitle>
        </DialogHeader>

        {/* Pestañas */}
        <div className="flex space-x-1 bg-soft-card rounded-lg p-1 mb-6">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'texts', label: 'Textos', icon: FileText },
            { id: 'observations', label: 'Observaciones', icon: CheckSquare }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-turquoise-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 lg:space-y-12">
          {/* Mensajes de estado */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-sm">
              <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">Error al crear presupuesto</p>
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
                <p className="font-medium text-turquoise-800 dark:text-turquoise-300">¡Presupuesto creado exitosamente!</p>
                <p className="text-sm text-turquoise-600 dark:text-turquoise-400">El presupuesto ha sido generado correctamente</p>
              </div>
            </div>
          )}

          {/* Layout principal con sidebar */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-12">
            {/* Columna principal - Información general y productos */}
            <div className="xl:col-span-2 space-y-8 lg:space-y-12">

          {/* Contenido de las pestañas */}
          {activeTab === 'general' && (
            <div className="space-y-8">
              {/* Información General */}
              <Card className="border-0 shadow-lg bg-modal-card border-slate-200 dark:border-slate-600">
                <CardContent className="p-6 lg:p-10 space-y-8 lg:space-y-10">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/50 rounded-lg">
                      <Settings className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
                    </div>
                    <div>
                    <h3 className="font-semibold text-lg text-white">Información General</h3>
                    <p className="text-sm text-slate-300">Datos principales del presupuesto</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                    <div className="space-y-6">
                      <Label htmlFor="date" className="text-sm font-medium text-slate-300">
                        Fecha *
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleInputChange('date', e.target.value)}
                          className="h-11 pl-9 border-slate-300 dark:border-slate-600 focus:border-turquoise-500 focus:ring-turquoise-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <Label htmlFor="client" className="text-sm font-medium text-slate-300">
                        Cliente *
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          id="client"
                          value={formData.client}
                          onChange={(e) => handleInputChange('client', e.target.value)}
                          placeholder="Seleccionar cliente"
                          className="h-11 pl-9 border-slate-300 dark:border-slate-600 focus:border-turquoise-500 focus:ring-turquoise-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <Label htmlFor="currency" className="text-sm font-medium text-slate-300">
                        Moneda
                      </Label>
                      <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                        <SelectTrigger className="h-11 bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pesos">Pesos</SelectItem>
                          <SelectItem value="dollars">Dólares</SelectItem>
                          <SelectItem value="euros">Euros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-6">
                      <Label htmlFor="quote" className="text-sm font-medium text-slate-300">
                        Cotización
                      </Label>
                      <Input
                        id="quote"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.quote}
                        onChange={(e) => handleInputChange('quote', parseFloat(e.target.value) || 0)}
                        className="h-11 bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500"
                      />
                    </div>

                    <div className="space-y-6">
                      <Label htmlFor="paymentMethod" className="text-sm font-medium text-slate-300">
                        Forma de Pago
                      </Label>
                      <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                        <SelectTrigger className="h-11 bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cuenta_corriente">Cuenta Corriente</SelectItem>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-6">
                      <Label htmlFor="seller" className="text-sm font-medium text-slate-300">
                        Vendedor
                      </Label>
                      <Select value={formData.seller} onValueChange={(value) => handleInputChange('seller', value)}>
                        <SelectTrigger className="h-11 bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="administracion">Administración</SelectItem>
                          <SelectItem value="ventas">Ventas</SelectItem>
                          <SelectItem value="comercial">Comercial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-6">
                      <Label htmlFor="priceList" className="text-sm font-medium text-slate-300">
                        Lista de Precios
                      </Label>
                      <Select value={formData.priceList} onValueChange={(value) => handleInputChange('priceList', value)}>
                        <SelectTrigger className="h-11 bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="mayorista">Mayorista</SelectItem>
                          <SelectItem value="minorista">Minorista</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Productos */}
              <Card className="border-0 shadow-lg bg-modal-card border-slate-200 dark:border-slate-600">
                <CardContent className="p-6 lg:p-10 space-y-8 lg:space-y-10">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/50 rounded-lg">
                      <ShoppingCart className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
                    </div>
                    <div>
                    <h3 className="font-semibold text-lg text-white">Productos</h3>
                    <p className="text-sm text-slate-300">Agregar productos al presupuesto</p>
                    </div>
                  </div>

                  {/* Formulario para agregar productos */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 lg:gap-6 p-6 lg:p-8 bg-soft/50 rounded-lg">
                    <div className="space-y-6">
                      <Label className="text-xs font-medium text-slate-300">Producto</Label>
                      <Input
                        value={currentItem.product}
                        onChange={(e) => handleItemChange('product', e.target.value)}
                        placeholder="Código/Nombre"
                        className="h-9 text-sm bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                      />
                    </div>
                    <div className="space-y-6">
                      <Label className="text-xs font-medium text-slate-300">I.V.A.</Label>
                      <Select value={currentItem.vat.toString()} onValueChange={(value) => handleItemChange('vat', parseFloat(value))}>
                        <SelectTrigger className="h-9 text-sm bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="10.5">10,5%</SelectItem>
                          <SelectItem value="21">21%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-6">
                      <Label className="text-xs font-medium text-slate-300">Cantidad</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentItem.quantity}
                        onChange={(e) => handleItemChange('quantity', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                      />
                    </div>
                    <div className="space-y-6">
                      <Label className="text-xs font-medium text-slate-300">% Rec.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentItem.recovery}
                        onChange={(e) => handleItemChange('recovery', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                      />
                    </div>
                    <div className="space-y-6">
                      <Label className="text-xs font-medium text-slate-300">P.Unitario</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentItem.unitPrice}
                        onChange={(e) => handleItemChange('unitPrice', parseFloat(e.target.value) || 0)}
                        className="h-9 text-sm bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
                      />
                    </div>
                    <div className="space-y-6">
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 invisible">Agregar</Label>
                      <Button
                        type="button"
                        onClick={addItem}
                        className="h-9 w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Tabla de productos */}
                  {items.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden overflow-x-auto">
                      <Table className="min-w-[600px]">
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-soft-card">
                            <TableHead className="w-20">Cant.</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="w-20">Alicuota</TableHead>
                            <TableHead className="w-20">% Rec.</TableHead>
                            <TableHead className="w-24">P.Unitario</TableHead>
                            <TableHead className="w-24">Sub Total</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.quantity}</TableCell>
                              <TableCell>{item.product}</TableCell>
                              <TableCell>{item.vat}%</TableCell>
                              <TableCell>{item.recovery}%</TableCell>
                              <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                              <TableCell className="font-medium">{formatCurrency(item.subtotal)}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeItem(item.id)}
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Totales */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 lg:gap-8 p-6 lg:p-8 bg-soft/50 rounded-lg border border-slate-600">
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-300">Gravado</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(totals.subtotal)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-300">IVA 21%</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(totals.vat21)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-300">IVA 10,5%</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(totals.vat105)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-300">Exento</p>
                      <p className="text-lg font-bold text-white">{formatCurrency(totals.exempt)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-300">Total</p>
                      <p className="text-xl font-bold text-turquoise-400">{formatCurrency(totals.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'texts' && (
            <Card className="border-0 shadow-lg bg-white/70 dark:bg-soft-card/70 backdrop-blur-sm">
              <CardContent className="p-4 lg:p-8 space-y-6 lg:space-y-8">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">Textos del Presupuesto</h3>
                    <p className="text-sm text-slate-300">Configurar textos personalizados</p>
                  </div>
                </div>
                <div className="space-y-4 lg:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="headerText" className="text-sm font-medium text-slate-300">
                      Texto de Encabezado
                    </Label>
                    <Textarea
                      id="headerText"
                      placeholder="Texto que aparecerá en el encabezado del presupuesto"
                      rows={3}
                      className="bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500 resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="footerText" className="text-sm font-medium text-slate-300">
                      Texto de Pie
                    </Label>
                    <Textarea
                      id="footerText"
                      placeholder="Texto que aparecerá en el pie del presupuesto"
                      rows={3}
                      className="bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500 resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'observations' && (
            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-modal-card border-slate-200 dark:border-slate-600">
                <CardContent className="p-6 lg:p-10 space-y-8 lg:space-y-10">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                      <CheckSquare className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                    <h3 className="font-semibold text-lg text-white">Observaciones Internas</h3>
                    <p className="text-sm text-slate-300">Notas internas del presupuesto</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="internalObservations" className="text-sm font-medium text-slate-300">
                      Observaciones
                    </Label>
                    <Textarea
                      id="internalObservations"
                      value={formData.internalObservations}
                      onChange={(e) => handleInputChange('internalObservations', e.target.value)}
                      placeholder="Observaciones internas sobre el presupuesto..."
                      rows={4}
                      className="bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

            </div>
          )}
            </div>

            {/* Sidebar - Resumen y opciones rápidas */}
            <div className="xl:col-span-1 space-y-8">
              {/* Resumen del presupuesto */}
              <Card className="border-0 shadow-lg bg-modal-card border-slate-200 dark:border-slate-600">
                <CardContent className="p-8 space-y-8">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/50 rounded-lg">
                      <Calculator className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">Resumen</h3>
                      <p className="text-sm text-slate-300">Totales del presupuesto</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-300">Productos:</span>
                      <span className="font-medium text-white">{items.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-300">Gravado:</span>
                      <span className="font-medium text-white">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-300">IVA 21%:</span>
                      <span className="font-medium text-white">{formatCurrency(totals.vat21)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-300">IVA 10.5%:</span>
                      <span className="font-medium text-white">{formatCurrency(totals.vat105)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-300">Exento:</span>
                      <span className="font-medium text-white">{formatCurrency(totals.exempt)}</span>
                    </div>
                    <Separator className="my-6" />
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-white">Total:</span>
                      <span className="text-xl font-bold text-turquoise-400">{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Opciones rápidas */}
              <Card className="border-0 shadow-lg bg-modal-card border-slate-200 dark:border-slate-600">
                <CardContent className="p-8 space-y-8">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/50 rounded-lg">
                      <Settings className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-white">Opciones</h3>
                      <p className="text-sm text-slate-300">Configuración rápida</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Proforma</span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange('proforma', true)}
                          className={`w-8 h-4 rounded-full transition-colors ${
                            formData.proforma ? 'bg-turquoise-500' : 'bg-slate-600'
                          }`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                            formData.proforma ? 'translate-x-4' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Totalizar</span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange('totalize', true)}
                          className={`w-8 h-4 rounded-full transition-colors ${
                            formData.totalize ? 'bg-turquoise-500' : 'bg-slate-600'
                          }`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                            formData.totalize ? 'translate-x-4' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">Detallar Precio</span>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleInputChange('detailPrice', true)}
                          className={`w-8 h-4 rounded-full transition-colors ${
                            formData.detailPrice ? 'bg-turquoise-500' : 'bg-slate-600'
                          }`}
                        >
                          <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                            formData.detailPrice ? 'translate-x-4' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-6">
                      <div>
                        <label className="text-sm text-slate-300">Factibilidad %</label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.feasibility}
                          onChange={(e) => handleInputChange('feasibility', parseInt(e.target.value) || 0)}
                          className="mt-1 h-9 bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-slate-300">Validez (días)</label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.validity}
                          onChange={(e) => handleInputChange('validity', parseInt(e.target.value) || 1)}
                          className="mt-1 h-9 bg-soft-input border-slate-300 dark:border-slate-500 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:border-turquoise-500 focus:ring-turquoise-500"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Botones de acción */}
              <div className="space-y-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose} 
                  disabled={loading}
                  className="w-full h-12 border-slate-600 bg-soft-input text-slate-800 dark:text-white hover:bg-soft dark:hover:bg-soft-card"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 mr-3" />
                      Crear Presupuesto
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
