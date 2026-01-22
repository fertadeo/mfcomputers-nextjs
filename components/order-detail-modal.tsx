"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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

  // Colores de WooCommerce para estados (igual que en la tabla)
  const getStatusBadgeStyle = (status: string) => {
    const statusLower = status.toLowerCase()
    const statusMap: Record<string, { bgColor: string; textColor: string; borderColor?: string; label: string }> = {
      "pending": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7", label: "Pendiente" },
      "processing": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "Procesando" },
      "on-hold": { bgColor: "#f8dda7", textColor: "#94660c", borderColor: "#f0b849", label: "En Espera" },
      "completed": { bgColor: "#c8e6c9", textColor: "#155724", borderColor: "#46b450", label: "Completado" },
      "cancelled": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#dc3232", label: "Cancelado" },
      "refunded": { bgColor: "#e5e5e5", textColor: "#777", borderColor: "#999", label: "Reembolsado" },
      "failed": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#a00", label: "Fallido" },
      "pendiente": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7", label: "Pendiente" },
      "pendiente_preparacion": { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7", label: "Pendiente Preparación" },
      "en_proceso": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "En Proceso" },
      "aprobado": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "Aprobado" },
      "listo_despacho": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "Listo Despacho" },
      "pagado": { bgColor: "#c6e1c6", textColor: "#5b841b", borderColor: "#7ad03a", label: "Pagado" },
      "completado": { bgColor: "#c8e6c9", textColor: "#155724", borderColor: "#46b450", label: "Completado" },
      "cancelado": { bgColor: "#f1adad", textColor: "#761919", borderColor: "#dc3232", label: "Cancelado" },
      "atrasado": { bgColor: "#f8dda7", textColor: "#94660c", borderColor: "#f0b849", label: "Atrasado" },
    }
    return statusMap[statusLower] || { bgColor: "#f0f0f1", textColor: "#50575e", borderColor: "#c3c4c7", label: status }
  }

  // Verificar si las direcciones son iguales
  const addressesMatch = billing.address_1 && shipping.address_1 && 
    billing.address_1 === shipping.address_1 &&
    billing.city === shipping.city

  const statusInfo = getStatusBadgeStyle(jsonData.status || order.status)
  const clientName = billing.first_name && billing.last_name 
    ? `${billing.first_name} ${billing.last_name}`
    : order.client_name || `Cliente #${order.client_id}`
  const clientEmail = billing.email || order.client_email
  const clientPhone = billing.phone || order.delivery_phone || shipping.phone

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header estilo WooCommerce */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              Pedido {order.order_number || `#${order.id}`}
            </DialogTitle>
            <Badge 
              variant="outline"
              className="font-medium border-2"
              style={{
                backgroundColor: statusInfo.bgColor,
                color: statusInfo.textColor,
                borderColor: statusInfo.borderColor || statusInfo.bgColor,
              }}
            >
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {/* Detalles de Facturación y Envío - Dos columnas como WooCommerce */}
          {(billing.address_1 || shipping.address_1) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Columna Facturación */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Detalles de facturación</h3>
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium">{clientName}</p>
                  {billing.address_1 && (
                    <>
                      <p className="text-muted-foreground">{billing.address_1}</p>
                      {billing.address_2 && <p className="text-muted-foreground">{billing.address_2}</p>}
                      <p className="text-muted-foreground">
                        {[billing.city, billing.state, billing.postcode].filter(Boolean).join(", ")}
                      </p>
                      {billing.country && <p className="text-muted-foreground">{billing.country}</p>}
                    </>
                  )}
                  {clientEmail && (
                    <p className="mt-2">
                      <a 
                        href={`mailto:${clientEmail}`} 
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {clientEmail}
                      </a>
                    </p>
                  )}
                  {clientPhone && (
                    <p>
                      <a 
                        href={`tel:${clientPhone.replace(/\s/g, '')}`} 
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {clientPhone}
                      </a>
                    </p>
                  )}
                  <p className="mt-3 text-muted-foreground">
                    <span className="font-medium">Método de pago:</span>{" "}
                    {jsonData.payment_method_title || jsonData.payment_method || order.payment_method_title || "-"}
                  </p>
                  {jsonData.transaction_id && (
                    <p className="text-xs text-muted-foreground">
                      ID Transacción: {jsonData.transaction_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Columna Envío */}
              <div>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Detalles de envío</h3>
                <div className="space-y-1.5 text-sm">
                  {shipping.address_1 ? (
                    <>
                      <p className="font-medium">
                        {shipping.first_name && shipping.last_name 
                          ? `${shipping.first_name} ${shipping.last_name}`
                          : clientName
                        }
                      </p>
                      <p className="text-muted-foreground">{shipping.address_1}</p>
                      {shipping.address_2 && <p className="text-muted-foreground">{shipping.address_2}</p>}
                      <p className="text-muted-foreground">
                        {[shipping.city, shipping.state, shipping.postcode].filter(Boolean).join(", ")}
                      </p>
                      {shipping.country && <p className="text-muted-foreground">{shipping.country}</p>}
                      {shipping.phone && (
                        <p className="mt-2">
                          <a 
                            href={`tel:${shipping.phone.replace(/\s/g, '')}`} 
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {shipping.phone}
                          </a>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{clientName}</p>
                      {billing.address_1 && (
                        <>
                          <p className="text-muted-foreground">{billing.address_1}</p>
                          {billing.address_2 && <p className="text-muted-foreground">{billing.address_2}</p>}
                          <p className="text-muted-foreground">
                            {[billing.city, billing.state, billing.postcode].filter(Boolean).join(", ")}
                          </p>
                        </>
                      )}
                    </>
                  )}
                  <p className="mt-3 text-muted-foreground">
                    <span className="font-medium">Método de envío:</span>{" "}
                    {shippingLines.length > 0 
                      ? shippingLines.map((s: any) => s.method_title || order.transport_company || "-").join(", ")
                      : order.transport_company || "-"
                    }
                    {(jsonData.shipping_total && parseFloat(jsonData.shipping_total) > 0) && (
                      <span className="ml-1">({formatCurrency(jsonData.shipping_total)})</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabla de Productos - Estilo WooCommerce */}
          {lineItems.length > 0 && (
            <div className="mb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Producto</TableHead>
                    <TableHead className="text-right w-[12%]">Cantidad</TableHead>
                    <TableHead className="text-right w-[16%]">Impuesto</TableHead>
                    <TableHead className="text-right w-[16%]">Precio</TableHead>
                    <TableHead className="text-right w-[16%]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item: any, index: number) => (
                    <TableRow key={item.id || index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.sku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.tax_total ? formatCurrency(item.tax_total) : formatCurrency(0)}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Resumen Financiero - Al final como WooCommerce */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2 text-sm">
                {jsonData.shipping_total && parseFloat(jsonData.shipping_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío:</span>
                    <span>{formatCurrency(jsonData.shipping_total)}</span>
                  </div>
                )}
                {jsonData.tax_total && parseFloat(jsonData.tax_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impuestos:</span>
                    <span>{formatCurrency(jsonData.tax_total)}</span>
                  </div>
                )}
                {jsonData.discount_total && parseFloat(jsonData.discount_total) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="text-green-600">-{formatCurrency(jsonData.discount_total)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(jsonData.total || order.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
