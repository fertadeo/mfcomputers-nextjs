"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Calendar,
  User,
  CreditCard,
  Package,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import type { SaleResponseData, SalePaymentMethod } from "@/lib/api"
import { getProductById } from "@/lib/api"

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

const syncStatusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }
> = {
  pending: { label: "Pendiente", variant: "secondary", icon: Clock },
  synced: { label: "Sincronizado", variant: "default", icon: CheckCircle2 },
  error: { label: "Error", variant: "destructive", icon: AlertCircle },
}

type ProductInfo = { name: string; imageUrl?: string }

/** Formato argentino: punto para miles, coma para decimales. Ej: 1500000 → "1.500.000,00" */
function formatPrice(value: number | string, decimals = 2): string {
  const n = typeof value === "number" ? value : Number(value)
  if (Number.isNaN(n)) return "—"
  const fixed = n.toFixed(decimals)
  const [intPart, decPart] = fixed.split(".")
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return decPart ? `${withDots},${decPart}` : withDots
}

export function SaleDetailModal({ sale, isOpen, onClose }: SaleDetailModalProps) {
  const [productInfoMap, setProductInfoMap] = useState<Record<number, ProductInfo>>({})

  useEffect(() => {
    if (!sale?.items?.length) {
      setProductInfoMap({})
      return
    }
    const ids = [...new Set(sale.items.map((i) => i.product_id))]
    let cancelled = false
    Promise.all(
      ids.map(async (id) => {
        try {
          const p = await getProductById(id)
          return { id, name: p.name, imageUrl: p.image_url ?? p.images?.[0] }
        } catch {
          return { id, name: `Producto #${id}` }
        }
      })
    ).then((results) => {
      if (cancelled) return
      setProductInfoMap(
        results.reduce<Record<number, ProductInfo>>((acc, { id, name, imageUrl }) => {
          acc[id] = { name, imageUrl }
          return acc
        }, {})
      )
    })
    return () => {
      cancelled = true
    }
  }, [sale?.id, sale?.items?.map((i) => i.product_id).join(",")])

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

  const syncConfig = sale.sync_status
    ? syncStatusConfig[sale.sync_status] ?? {
        label: sale.sync_status,
        variant: "outline" as const,
        icon: Clock,
      }
    : null
  const SyncIcon = syncConfig?.icon ?? Clock

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[min(42rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0">
        <DialogHeader className="border-b bg-muted/30 px-6 pr-12 py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Receipt className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl tracking-tight">
                Venta POS #{sale.sale_number}
              </DialogTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatDate(sale.sale_date)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 p-6 pr-12 min-w-0">
          <section className="rounded-xl border bg-muted/20 p-4 min-w-0 overflow-hidden">
            <h3 className="sr-only">Detalles de la venta</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Fecha
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{formatDate(sale.sale_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border text-muted-foreground">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cliente
                  </p>
                  <p className="mt-0.5 text-sm font-medium">
                    {sale.client_id != null ? `#${sale.client_id}` : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Pago
                  </p>
                  <p className="mt-0.5 text-sm font-medium">
                    {paymentMethodLabels[sale.payment_method] ?? sale.payment_method}
                  </p>
                </div>
              </div>
              {syncConfig && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border text-muted-foreground">
                    <SyncIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sincronización
                    </p>
                    <p className="mt-0.5">
                      <Badge variant={syncConfig.variant} className="font-normal">
                        {syncConfig.label}
                      </Badge>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <h4 className="text-sm font-semibold">Artículos</h4>
            </div>
            <div className="rounded-xl border overflow-hidden min-w-0">
              <div className="overflow-x-auto">
                <Table className="w-full min-w-[320px]" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "50%" }} />
                    <col style={{ width: "4rem" }} />
                    <col style={{ width: "6rem" }} />
                    <col style={{ width: "7rem" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b bg-muted/30">
                      <TableHead className="whitespace-nowrap">Producto</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Cant.</TableHead>
                      <TableHead className="text-right whitespace-nowrap">P. unit.</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {(sale.items || []).map((item, idx) => {
                    const info = productInfoMap[item.product_id]
                    const subtotal =
                      item.subtotal ??
                      item.total_price ??
                      item.quantity * (typeof item.unit_price === "number" ? item.unit_price : 0)
                    return (
                      <TableRow key={idx} className="border-b last:border-b-0">
                        <TableCell className="align-top py-3 whitespace-normal w-0">
                          <div className="flex items-start gap-3 min-w-0 w-full overflow-hidden">
                            {info?.imageUrl ? (
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
                                <Image
                                  src={info.imageUrl}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                                <Package className="h-5 w-5" />
                              </div>
                            )}
                            <span
                              className="font-medium text-sm block break-words min-w-0"
                              style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
                            >
                              {info?.name ?? `Producto #${item.product_id}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right align-top py-3 tabular-nums whitespace-nowrap">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right align-top py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                          ${typeof item.unit_price === "number" ? formatPrice(item.unit_price) : String(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right align-top py-3 font-medium tabular-nums whitespace-nowrap">
                          ${formatPrice(subtotal)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          </section>

          <div className="flex justify-end rounded-xl border bg-muted/20 px-5 py-4 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-2xl font-bold tabular-nums">
                ${formatPrice(sale.total_amount)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
