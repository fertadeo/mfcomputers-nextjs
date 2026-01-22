"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Package } from "lucide-react"
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

  // Verificar si las direcciones son iguales
  const addressesMatch = billing.address_1 && shipping.address_1 && 
    billing.address_1 === shipping.address_1 &&
    billing.city === shipping.city

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-4">
        <DialogHeader className="pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 flex-shrink-0" />
            <span className="break-words">Pedido {order.order_number || `#${order.id}`}</span>
            <div className="ml-auto">
              {getStatusBadge(jsonData.status || order.status)}
            </div>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {order.canal_venta === 'woocommerce' ? 'WooCommerce' : 'Local'} • {formatDate(jsonData.date_created || order.order_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {/* Información General y Cliente - Combinada */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                  <p className="font-semibold text-base break-words">{formatCurrency(jsonData.total || order.total_amount)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Cliente</p>
                  <p className="font-semibold text-sm break-words">
                    {billing.first_name && billing.last_name 
                      ? `${billing.first_name} ${billing.last_name}`
                      : order.client_name || `Cliente #${order.client_id}`
                    }
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="font-semibold text-xs break-all">{billing.email || order.client_email || "-"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Teléfono</p>
                  <p className="font-semibold text-xs break-words">{billing.phone || order.delivery_phone || "-"}</p>
                </div>
                {billing.company && (
                  <div className="min-w-0 col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Empresa</p>
                    <p className="font-semibold text-xs break-words">{billing.company}</p>
                  </div>
                )}
                {jsonData.date_paid && (
                  <div className="min-w-0 col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Fecha de Pago</p>
                    <p className="font-semibold text-xs break-words">{formatDate(jsonData.date_paid)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Direcciones - Combinadas si son iguales */}
          {(billing.address_1 || shipping.address_1) && (
            <Card>
              <CardContent className="p-4">
                {addressesMatch ? (
                  <div>
                    <p className="text-xs font-semibold mb-2 text-muted-foreground">Dirección (Facturación y Envío)</p>
                    <div className="text-sm space-y-0.5">
                      <p className="font-semibold break-words">
                        {billing.first_name} {billing.last_name}
                      </p>
                      <p className="break-words">{billing.address_1}</p>
                      {billing.address_2 && <p className="break-words text-xs">{billing.address_2}</p>}
                      <p className="break-words text-xs">
                        {billing.city}, {billing.state} {billing.postcode}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {billing.address_1 && (
                      <div>
                        <p className="text-xs font-semibold mb-1.5 text-muted-foreground">Facturación</p>
                        <div className="text-sm space-y-0.5">
                          <p className="font-semibold break-words text-xs">
                            {billing.first_name} {billing.last_name}
                          </p>
                          <p className="break-words text-xs">{billing.address_1}</p>
                          {billing.address_2 && <p className="break-words text-xs">{billing.address_2}</p>}
                          <p className="break-words text-xs">
                            {billing.city}, {billing.state} {billing.postcode}
                          </p>
                        </div>
                      </div>
                    )}
                    {shipping.address_1 && (
                      <div>
                        <p className="text-xs font-semibold mb-1.5 text-muted-foreground">Envío</p>
                        <div className="text-sm space-y-0.5">
                          <p className="font-semibold break-words text-xs">
                            {shipping.first_name} {shipping.last_name}
                          </p>
                          <p className="break-words text-xs">{shipping.address_1}</p>
                          {shipping.address_2 && <p className="break-words text-xs">{shipping.address_2}</p>}
                          <p className="break-words text-xs">
                            {shipping.city}, {shipping.state} {shipping.postcode}
                          </p>
                          {shipping.phone && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Tel: {shipping.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Items del Pedido */}
          {lineItems.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4 flex-shrink-0" />
                  <span>Items ({lineItems.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-visible">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="text-xs py-2">Producto</TableHead>
                        <TableHead className="text-xs py-2 text-right hidden sm:table-cell">SKU</TableHead>
                        <TableHead className="text-xs py-2 text-right w-16">Cant.</TableHead>
                        <TableHead className="text-xs py-2 text-right w-20">Precio</TableHead>
                        <TableHead className="text-xs py-2 text-right w-24">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item: any, index: number) => (
                        <TableRow key={item.id || index} className="h-auto">
                          <TableCell className="py-2 text-xs">
                            <div>
                              <p className="font-medium break-words">{item.name}</p>
                              <p className="text-xs text-muted-foreground sm:hidden mt-0.5">{item.sku || "Sin SKU"}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden sm:table-cell py-2 break-words">{item.sku || "-"}</TableCell>
                          <TableCell className="text-right text-xs py-2">{item.quantity}</TableCell>
                          <TableCell className="text-right text-xs py-2 whitespace-nowrap">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="text-right text-xs font-semibold py-2 whitespace-nowrap">
                            {formatCurrency(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pago, Envío y Resumen - Combinados */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Pago</p>
                  <p className="font-semibold text-xs break-words">
                    {jsonData.payment_method_title || jsonData.payment_method || order.payment_method_title || "-"}
                  </p>
                  {jsonData.transaction_id && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-all">
                      ID: {jsonData.transaction_id}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Envío</p>
                  {shippingLines.length > 0 ? (
                    <div>
                      {shippingLines.map((shipping: any, index: number) => (
                        <div key={shipping.id || index}>
                          <p className="font-semibold text-xs break-words">
                            {shipping.method_title || order.transport_company || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(shipping.total)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-semibold text-xs break-words">
                      {order.transport_company || "-"}
                      {order.transport_cost && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({formatCurrency(order.transport_cost)})
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Resumen</p>
                  <div className="space-y-0.5 text-xs">
                    {jsonData.shipping_total && parseFloat(jsonData.shipping_total) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Envío:</span>
                        <span className="font-medium">{formatCurrency(jsonData.shipping_total)}</span>
                      </div>
                    )}
                    {jsonData.tax_total && parseFloat(jsonData.tax_total) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Impuestos:</span>
                        <span className="font-medium">{formatCurrency(jsonData.tax_total)}</span>
                      </div>
                    )}
                    {jsonData.discount_total && parseFloat(jsonData.discount_total) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Descuento:</span>
                        <span className="font-medium text-green-600">-{formatCurrency(jsonData.discount_total)}</span>
                      </div>
                    )}
                    <Separator className="my-1" />
                    <div className="flex justify-between font-bold text-sm">
                      <span>Total:</span>
                      <span>{formatCurrency(jsonData.total || order.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
