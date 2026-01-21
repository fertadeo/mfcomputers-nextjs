"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Package, 
  User, 
  MapPin, 
  CreditCard, 
  Truck, 
  Calendar,
  DollarSign,
  ShoppingCart
} from "lucide-react"
import { Order } from "@/lib/api"

interface OrderDetailModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
}

export function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
  if (!order) return null

  const jsonData = order.json || {}
  const billing = jsonData.billing || {}
  const shipping = jsonData.shipping || {}
  const lineItems = jsonData.line_items || []
  const shippingLines = jsonData.shipping_lines || []

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-"
    try {
      return new Date(dateString).toLocaleString('es-AR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: jsonData.currency || 'ARS',
      minimumFractionDigits: 2
    }).format(numAmount)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      "on-hold": { label: "En Espera", variant: "outline" },
      "processing": { label: "Procesando", variant: "secondary" },
      "completed": { label: "Completado", variant: "default" },
      "cancelled": { label: "Cancelado", variant: "destructive" },
      "refunded": { label: "Reembolsado", variant: "destructive" },
      "pending": { label: "Pendiente", variant: "outline" }
    }
    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Package className="h-5 w-5 flex-shrink-0" />
            <span className="break-words">Detalles del Pedido {order.order_number || `#${order.id}`}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Información completa del pedido {order.canal_venta === 'woocommerce' ? 'de WooCommerce' : 'local'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                <span>Información General</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Número de Pedido</p>
                  <p className="font-semibold break-words">{jsonData.number || order.order_number || `#${order.id}`}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Estado</p>
                  <div className="mt-1">
                    {getStatusBadge(jsonData.status || order.status)}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total</p>
                  <p className="font-semibold text-base sm:text-lg break-words">{formatCurrency(jsonData.total || order.total_amount)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Moneda</p>
                  <p className="font-semibold break-words">{jsonData.currency || 'ARS'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Fecha de Creación</p>
                  <p className="font-semibold text-sm sm:text-base break-words">{formatDate(jsonData.date_created || order.order_date)}</p>
                </div>
                {jsonData.date_paid && (
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Fecha de Pago</p>
                    <p className="font-semibold text-sm sm:text-base break-words">{formatDate(jsonData.date_paid)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información del Cliente */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <User className="h-4 w-4 flex-shrink-0" />
                <span>Información del Cliente</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Nombre</p>
                  <p className="font-semibold break-words">
                    {billing.first_name && billing.last_name 
                      ? `${billing.first_name} ${billing.last_name}`
                      : order.client_name || `Cliente #${order.client_id}`
                    }
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-semibold break-all">{billing.email || order.client_email || "-"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Teléfono</p>
                  <p className="font-semibold break-words">{billing.phone || order.delivery_phone || "-"}</p>
                </div>
                {billing.company && (
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Empresa</p>
                    <p className="font-semibold break-words">{billing.company}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dirección de Facturación */}
          {billing.address_1 && (
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>Dirección de Facturación</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-1">
                  <p className="font-semibold break-words">
                    {billing.first_name} {billing.last_name}
                  </p>
                  <p className="break-words">{billing.address_1}</p>
                  {billing.address_2 && <p className="break-words">{billing.address_2}</p>}
                  <p className="break-words">
                    {billing.city}, {billing.state} {billing.postcode}
                  </p>
                  <p className="break-words">{billing.country}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dirección de Envío */}
          {shipping.address_1 && (
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Truck className="h-4 w-4 flex-shrink-0" />
                  <span>Dirección de Envío</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-1">
                  <p className="font-semibold break-words">
                    {shipping.first_name} {shipping.last_name}
                  </p>
                  <p className="break-words">{shipping.address_1}</p>
                  {shipping.address_2 && <p className="break-words">{shipping.address_2}</p>}
                  <p className="break-words">
                    {shipping.city}, {shipping.state} {shipping.postcode}
                  </p>
                  <p className="break-words">{shipping.country}</p>
                  {shipping.phone && (
                    <p className="mt-2 text-xs sm:text-sm text-muted-foreground break-words">
                      Teléfono: {shipping.phone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items del Pedido */}
          {lineItems.length > 0 && (
            <Card>
              <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Package className="h-4 w-4 flex-shrink-0" />
                  <span>Items del Pedido</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Producto</TableHead>
                          <TableHead className="hidden sm:table-cell min-w-[100px]">SKU</TableHead>
                          <TableHead className="text-right min-w-[80px]">Cant.</TableHead>
                          <TableHead className="text-right min-w-[100px]">Precio</TableHead>
                          <TableHead className="text-right min-w-[100px]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item: any, index: number) => (
                          <TableRow key={item.id || index}>
                            <TableCell className="font-medium break-words">
                              <div className="space-y-1">
                                <p>{item.name}</p>
                                <p className="text-xs text-muted-foreground sm:hidden">{item.sku || "Sin SKU"}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden sm:table-cell break-words">{item.sku || "-"}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="text-right font-semibold whitespace-nowrap">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Método de Pago y Envío */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4 flex-shrink-0" />
                <span>Pago y Envío</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Método de Pago</p>
                  <p className="font-semibold break-words">
                    {jsonData.payment_method_title || jsonData.payment_method || order.payment_method_title || "-"}
                  </p>
                  {jsonData.transaction_id && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-all">
                      ID Transacción: {jsonData.transaction_id}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">Método de Envío</p>
                  {shippingLines.length > 0 ? (
                    <div className="space-y-1">
                      {shippingLines.map((shipping: any, index: number) => (
                        <div key={shipping.id || index}>
                          <p className="font-semibold break-words">
                            {shipping.method_title || order.transport_company || "-"}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Costo: {formatCurrency(shipping.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-semibold break-words">
                      {order.transport_company || "-"}
                      {order.transport_cost && (
                        <span className="text-xs sm:text-sm text-muted-foreground ml-2">
                          ({formatCurrency(order.transport_cost)})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumen Financiero */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4 flex-shrink-0" />
                <span>Resumen Financiero</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">Subtotal:</span>
                  <span className="font-semibold text-right break-words">
                    {formatCurrency(jsonData.total ? parseFloat(jsonData.total) - parseFloat(jsonData.shipping_total || "0") - parseFloat(jsonData.tax_total || "0") : order.total_amount)}
                  </span>
                </div>
                {jsonData.shipping_total && parseFloat(jsonData.shipping_total) > 0 && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">Envío:</span>
                    <span className="font-semibold text-right break-words">{formatCurrency(jsonData.shipping_total)}</span>
                  </div>
                )}
                {jsonData.tax_total && parseFloat(jsonData.tax_total) > 0 && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">Impuestos:</span>
                    <span className="font-semibold text-right break-words">{formatCurrency(jsonData.tax_total)}</span>
                  </div>
                )}
                {jsonData.discount_total && parseFloat(jsonData.discount_total) > 0 && (
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">Descuento:</span>
                    <span className="font-semibold text-green-600 text-right break-words">
                      -{formatCurrency(jsonData.discount_total)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-start gap-2 text-base sm:text-lg">
                  <span className="font-bold flex-shrink-0">Total:</span>
                  <span className="font-bold text-right break-words">{formatCurrency(jsonData.total || order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
