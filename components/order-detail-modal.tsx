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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalles del Pedido {order.order_number || `#${order.id}`}
          </DialogTitle>
          <DialogDescription>
            Información completa del pedido {order.canal_venta === 'woocommerce' ? 'de WooCommerce' : 'local'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número de Pedido</p>
                  <p className="font-semibold">{jsonData.number || order.order_number || `#${order.id}`}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <div className="mt-1">
                    {getStatusBadge(jsonData.status || order.status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-semibold text-lg">{formatCurrency(jsonData.total || order.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Moneda</p>
                  <p className="font-semibold">{jsonData.currency || 'ARS'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Creación</p>
                  <p className="font-semibold">{formatDate(jsonData.date_created || order.order_date)}</p>
                </div>
                {jsonData.date_paid && (
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha de Pago</p>
                    <p className="font-semibold">{formatDate(jsonData.date_paid)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información del Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-semibold">
                    {billing.first_name && billing.last_name 
                      ? `${billing.first_name} ${billing.last_name}`
                      : order.client_name || `Cliente #${order.client_id}`
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold">{billing.email || order.client_email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-semibold">{billing.phone || order.delivery_phone || "-"}</p>
                </div>
                {billing.company && (
                  <div>
                    <p className="text-sm text-muted-foreground">Empresa</p>
                    <p className="font-semibold">{billing.company}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dirección de Facturación */}
          {billing.address_1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Dirección de Facturación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-semibold">
                    {billing.first_name} {billing.last_name}
                  </p>
                  <p>{billing.address_1}</p>
                  {billing.address_2 && <p>{billing.address_2}</p>}
                  <p>
                    {billing.city}, {billing.state} {billing.postcode}
                  </p>
                  <p>{billing.country}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dirección de Envío */}
          {shipping.address_1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Dirección de Envío
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="font-semibold">
                    {shipping.first_name} {shipping.last_name}
                  </p>
                  <p>{shipping.address_1}</p>
                  {shipping.address_2 && <p>{shipping.address_2}</p>}
                  <p>
                    {shipping.city}, {shipping.state} {shipping.postcode}
                  </p>
                  <p>{shipping.country}</p>
                  {shipping.phone && (
                    <p className="mt-2 text-sm text-muted-foreground">
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
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item: any, index: number) => (
                      <TableRow key={item.id || index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.sku || "-"}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Método de Pago y Envío */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Pago y Envío
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Método de Pago</p>
                  <p className="font-semibold">
                    {jsonData.payment_method_title || jsonData.payment_method || order.payment_method_title || "-"}
                  </p>
                  {jsonData.transaction_id && (
                    <p className="text-sm text-muted-foreground mt-1">
                      ID Transacción: {jsonData.transaction_id}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Método de Envío</p>
                  {shippingLines.length > 0 ? (
                    <div className="space-y-1">
                      {shippingLines.map((shipping: any, index: number) => (
                        <div key={shipping.id || index}>
                          <p className="font-semibold">
                            {shipping.method_title || order.transport_company || "-"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Costo: {formatCurrency(shipping.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-semibold">
                      {order.transport_company || "-"}
                      {order.transport_cost && (
                        <span className="text-sm text-muted-foreground ml-2">
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
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Resumen Financiero
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-semibold">
                    {formatCurrency(jsonData.total ? parseFloat(jsonData.total) - parseFloat(jsonData.shipping_total || "0") - parseFloat(jsonData.tax_total || "0") : order.total_amount)}
                  </span>
                </div>
                {jsonData.shipping_total && parseFloat(jsonData.shipping_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío:</span>
                    <span className="font-semibold">{formatCurrency(jsonData.shipping_total)}</span>
                  </div>
                )}
                {jsonData.tax_total && parseFloat(jsonData.tax_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impuestos:</span>
                    <span className="font-semibold">{formatCurrency(jsonData.tax_total)}</span>
                  </div>
                )}
                {jsonData.discount_total && parseFloat(jsonData.discount_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="font-semibold text-green-600">
                      -{formatCurrency(jsonData.discount_total)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold">{formatCurrency(jsonData.total || order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
