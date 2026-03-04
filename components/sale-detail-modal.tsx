"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { SaleResponseData, SalePaymentMethod } from "@/lib/api"

interface SaleDetailModalProps {
  sale: SaleResponseData | null
  isOpen: boolean
  onClose: () => void
}

const paymentMethodLabels: Record<SalePaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  mixto: "Mixto",
}

const syncStatusLabels: Record<string, string> = {
  pending: "Pendiente",
  synced: "Sincronizado",
  error: "Error",
}

export function SaleDetailModal({ sale, isOpen, onClose }: SaleDetailModalProps) {
  if (!sale) return null

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Venta POS #{sale.sale_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Fecha:</span>
              <p className="font-medium">{formatDate(sale.sale_date)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cliente ID:</span>
              <p className="font-medium">{sale.client_id ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Método de pago:</span>
              <p className="font-medium">{paymentMethodLabels[sale.payment_method] ?? sale.payment_method}</p>
            </div>
            {sale.sync_status && (
              <div>
                <span className="text-muted-foreground">Sincronización:</span>
                <p>
                  <Badge variant="outline">{syncStatusLabels[sale.sync_status] ?? sale.sync_status}</Badge>
                </p>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Items</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto ID</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Precio unit.</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sale.items || []).map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{item.product_id}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>
                      ${typeof item.unit_price === "number" ? item.unit_price.toLocaleString("es-AR") : item.unit_price}
                    </TableCell>
                    <TableCell>
                      ${(item.subtotal ?? item.quantity * (typeof item.unit_price === "number" ? item.unit_price : 0)).toLocaleString("es-AR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="border-t pt-2 flex justify-end">
            <span className="text-lg font-bold">
              Total: ${sale.total_amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
