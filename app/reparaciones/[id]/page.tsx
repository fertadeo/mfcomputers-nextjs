"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getRepairOrder,
  updateRepairOrder,
  sendRepairOrderBudget,
  acceptRepairOrder,
  cancelRepairOrder,
  updateRepairOrderStatus,
  getRepairOrderPayments,
  parseRepairOrderPaymentsPayload,
  deleteRepairOrderItem,
  REPAIR_ORDER_STATUS_LABELS,
  type RepairOrder,
  type RepairOrderStatus,
  type RepairOrderPayment,
} from "@/lib/api"
import { RepairOrderAddItemModal } from "@/components/repair-order-add-item-modal"
import { RepairOrderPaymentModal } from "@/components/repair-order-payment-modal"
import { RepairOrderAcceptanceDocumentModal } from "@/components/repair-order-acceptance-document-modal"
import { CurrencyFieldInput } from "@/components/currency-field-input"
import {
  ArrowLeft,
  Wrench,
  Send,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  DollarSign,
  FileText,
  Edit2,
  Trash2,
  Plus,
} from "lucide-react"
import { toast } from "sonner"

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatMoney(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value
  if (Number.isNaN(n)) return "—"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

function getStatusVariant(s: RepairOrderStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "entregado":
      return "default"
    case "cancelado":
      return "destructive"
    case "consulta_recibida":
    case "presupuestado":
      return "secondary"
    default:
      return "outline"
  }
}

function getStatusClassName(status: RepairOrderStatus): string {
  switch (status) {
    case "consulta_recibida":
      return "bg-sky-100 text-sky-800 border-sky-200"
    case "presupuestado":
      return "bg-amber-100 text-amber-800 border-amber-200"
    case "aceptado":
      return "bg-indigo-100 text-indigo-800 border-indigo-200"
    case "en_proceso_reparacion":
      return "bg-violet-100 text-violet-800 border-violet-200"
    case "listo_entrega":
      return "bg-emerald-100 text-emerald-800 border-emerald-200"
    case "entregado":
      return "bg-green-100 text-green-800 border-green-200"
    case "cancelado":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return ""
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
}

export default function RepairOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string | undefined
  const [order, setOrder] = useState<RepairOrder | null>(null)
  const [payments, setPayments] = useState<RepairOrderPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [acceptanceDocOpen, setAcceptanceDocOpen] = useState(false)
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false)
  const [daysToClaim, setDaysToClaim] = useState("30")
  const [accepting, setAccepting] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({
    equipment_description: "",
    diagnosis: "",
    work_description: "",
    reception_date: "",
    delivery_date_estimated: "",
    labor_amount: 0,
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  const loadOrder = async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await getRepairOrder(id)
      const data = res.data as RepairOrder
      setOrder(data)
      setEditForm({
        equipment_description: data.equipment_description || "",
        diagnosis: data.diagnosis || "",
        work_description: data.work_description || "",
        reception_date: data.reception_date?.slice(0, 10) || "",
        delivery_date_estimated: data.delivery_date_estimated?.slice(0, 10) || "",
        labor_amount: parseFloat(String(data.labor_amount || "0")) || 0,
        notes: data.notes || "",
      })
    } catch (e: unknown) {
      const err = e as { status?: number }
      if (err?.status === 404) {
        toast.error("Orden no encontrada")
        router.push("/reparaciones")
        return
      }
      toast.error("Error al cargar la orden")
    } finally {
      setLoading(false)
    }
  }

  const loadPayments = async () => {
    if (!id) return
    try {
      const res = await getRepairOrderPayments(id)
      setPayments(parseRepairOrderPaymentsPayload(res.data))
    } catch {
      setPayments([])
    }
  }

  useEffect(() => {
    loadOrder()
  }, [id])

  useEffect(() => {
    if (order) loadPayments()
  }, [order?.id])

  const refreshOrder = () => {
    loadOrder()
    loadPayments()
  }

  const canEdit =
    order &&
    order.status !== "entregado" &&
    order.status !== "cancelado"

  const handleSendBudget = async () => {
    if (!id || !order) return
    try {
      await sendRepairOrderBudget(id)
      toast.success("Presupuesto enviado. Estado: Presupuestado.")
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al enviar presupuesto")
    }
  }

  const handleAccept = async () => {
    if (!id) return
    setAccepting(true)
    try {
      const days = parseInt(daysToClaim, 10)
      await acceptRepairOrder(id, Number.isNaN(days) ? undefined : { days_to_claim: days })
      toast.success("Orden aceptada. Stock descontado.")
      setAcceptDialogOpen(false)
      refreshOrder()
      setAcceptanceDocOpen(true)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al aceptar presupuesto")
    } finally {
      setAccepting(false)
    }
  }

  const handleCancel = async () => {
    if (!id || !confirm("¿Cancelar esta orden? Se devolverá el stock si ya fue descontado.")) return
    try {
      await cancelRepairOrder(id)
      toast.success("Orden cancelada.")
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cancelar")
    }
  }

  const handleStatusChange = async (newStatus: "en_proceso_reparacion" | "listo_entrega" | "entregado") => {
    if (!id) return
    try {
      await updateRepairOrderStatus(id, newStatus)
      toast.success("Estado actualizado.")
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar estado")
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !order) return
    setSaving(true)
    try {
      const labor = editForm.labor_amount
      await updateRepairOrder(id, {
        equipment_description: editForm.equipment_description,
        diagnosis: editForm.diagnosis || undefined,
        work_description: editForm.work_description || undefined,
        reception_date: editForm.reception_date,
        delivery_date_estimated: editForm.delivery_date_estimated || undefined,
        labor_amount: Number.isNaN(labor) ? undefined : labor,
        notes: editForm.notes || undefined,
      })
      toast.success("Orden actualizada.")
      setEditMode(false)
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!id || !confirm("¿Quitar este ítem? Si ya se descontó stock, se devolverá.")) return
    try {
      await deleteRepairOrderItem(id, itemId)
      toast.success("Ítem eliminado.")
      refreshOrder()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar ítem")
    }
  }

  if (!id) return null
  const balance = order
    ? parseFloat(order.total_amount || "0") - parseFloat(order.amount_paid || "0")
    : 0

  if (loading && !order) {
    return (
      <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
        <ERPLayout activeItem="reparaciones">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </ERPLayout>
      </Protected>
    )
  }

  if (!order) {
    return (
      <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
        <ERPLayout activeItem="reparaciones">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Orden no encontrada.</p>
            <Button variant="link" asChild>
              <Link href="/reparaciones">Volver al listado</Link>
            </Button>
          </div>
        </ERPLayout>
      </Protected>
    )
  }

  const status = order.status
  const items = order.items ?? []
  const nextActionLabel: Partial<Record<RepairOrderStatus, string>> = {
    consulta_recibida: "Enviar presupuesto",
    presupuestado: "Aceptar presupuesto",
    aceptado: "Pasar a en reparación",
    en_proceso_reparacion: "Marcar como listo para entrega",
    listo_entrega: "Marcar como entregado",
  }

  return (
    <Protected requiredRoles={["gerencia", "ventas", "admin"]}>
      <ERPLayout activeItem="reparaciones">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/reparaciones">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{order.repair_number}</h1>
                <p className="text-muted-foreground">
                  {order.client?.name ?? `Cliente #${order.client_id}`}
                </p>
              </div>
              <Badge variant={getStatusVariant(status)} className={getStatusClassName(status)}>
                {REPAIR_ORDER_STATUS_LABELS[status] ?? status}
              </Badge>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Datos de la orden</CardTitle>
                <CardDescription>Equipo, diagnóstico y fechas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!editMode ? (
                  <>
                    <p><strong>Equipo:</strong> {order.equipment_description}</p>
                    {order.diagnosis && <p><strong>Diagnóstico:</strong> {order.diagnosis}</p>}
                    {order.work_description && (
                      <p><strong>Trabajo a realizar:</strong> {order.work_description}</p>
                    )}
                    <p><strong>Recepción:</strong> {formatDate(order.reception_date)}</p>
                    {order.delivery_date_estimated && (
                      <p><strong>Entrega estimada:</strong> {formatDate(order.delivery_date_estimated)}
                      </p>
                    )}
                    <p><strong>Mano de obra:</strong> {formatMoney(order.labor_amount)}</p>
                    {order.notes && <p><strong>Notas:</strong> {order.notes}</p>}
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                        <Edit2 className="h-4 w-4 mr-1" /> Editar
                      </Button>
                    )}
                  </>
                ) : (
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div>
                      <Label>Descripción del equipo</Label>
                      <Textarea
                        value={editForm.equipment_description}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, equipment_description: e.target.value }))
                        }
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Diagnóstico</Label>
                      <Textarea
                        value={editForm.diagnosis}
                        onChange={(e) => setEditForm((p) => ({ ...p, diagnosis: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Trabajo a realizar</Label>
                      <Textarea
                        value={editForm.work_description}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, work_description: e.target.value }))
                        }
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Fecha recepción</Label>
                        <Input
                          type="date"
                          value={editForm.reception_date}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, reception_date: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Fecha estimada entrega</Label>
                        <Input
                          type="date"
                          value={editForm.delivery_date_estimated}
                          onChange={(e) =>
                            setEditForm((p) => ({ ...p, delivery_date_estimated: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Mano de obra ($)</Label>
                      <CurrencyFieldInput
                        placeholder="$0,00"
                        value={editForm.labor_amount}
                        onValueChange={(n) =>
                          setEditForm((p) => ({ ...p, labor_amount: n }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Notas</Label>
                      <Input
                        value={editForm.notes}
                        onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditMode(false)}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Totales y saldo</CardTitle>
                <CardDescription>Monto total y pagos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Total:</strong> {formatMoney(order.total_amount)}</p>
                <p><strong>Pagado:</strong> {formatMoney(order.amount_paid)}</p>
                <p><strong>Saldo pendiente:</strong> {formatMoney(balance)}</p>
                {(status === "aceptado" ||
                  status === "en_proceso_reparacion" ||
                  status === "listo_entrega") && (
                  <Button
                    className="mt-2"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentOpen(true)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar pago
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Materiales (ítems)
              </CardTitle>
              <CardDescription>
                Productos del stock utilizados en la reparación
              </CardDescription>
              {canEdit && status === "consulta_recibida" && (
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => setAddItemOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Agregar ítem
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-muted-foreground">Sin ítems. Agregá materiales desde el botón superior.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>P. unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      {canEdit && <TableHead className="w-[80px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.product?.name ?? `Producto #${item.product_id}`}
                          {item.stock_deducted ? " (stock descontado)" : ""}
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{formatMoney(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{formatMoney(item.total_price)}</TableCell>
                        {canEdit && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pagos y movimientos</CardTitle>
              <CardDescription>
                Historial de cobros registrados en esta orden (coherente con el total pagado arriba).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no hay pagos registrados. Usá &quot;Registrar pago&quot; cuando el cliente abone (desde estado
                  aceptado, en reparación o listo para entrega).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.payment_date)}</TableCell>
                        <TableCell>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</TableCell>
                        <TableCell className="text-right">{formatMoney(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
              <CardDescription>Transiciones de estado según el flujo de la orden</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {nextActionLabel[status] && (
                <div className="w-full rounded-md border bg-muted/30 p-3 mb-2">
                  <p className="text-sm text-muted-foreground">Siguiente paso recomendado</p>
                  <p className="font-medium">{nextActionLabel[status]}</p>
                </div>
              )}
              {status === "consulta_recibida" && (
                <Button onClick={handleSendBudget}>
                  <Send className="h-4 w-4 mr-1" /> Enviar presupuesto
                </Button>
              )}
              {status === "presupuestado" && (
                <>
                  <Button onClick={() => setAcceptDialogOpen(true)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Aceptar presupuesto
                  </Button>
                  <Button variant="destructive" onClick={handleCancel}>
                    <XCircle className="h-4 w-4 mr-1" /> Cancelar orden
                  </Button>
                </>
              )}
              {status === "aceptado" && (
                <>
                  <Button onClick={() => handleStatusChange("en_proceso_reparacion")}>
                    En proceso de reparación
                  </Button>
                  <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar pago
                  </Button>
                </>
              )}
              {status === "en_proceso_reparacion" && (
                <>
                  <Button onClick={() => handleStatusChange("listo_entrega")}>
                    Listo entrega
                  </Button>
                  <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar pago
                  </Button>
                </>
              )}
              {status === "listo_entrega" && (
                <>
                  <Button onClick={() => handleStatusChange("entregado")}>
                    Marcar como entregado
                  </Button>
                  <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-1" /> Registrar pago
                  </Button>
                </>
              )}
              {(status === "entregado" || status === "cancelado") && (
                <p className="text-muted-foreground text-sm">
                  No hay acciones disponibles para este estado.
                </p>
              )}
              {(status === "aceptado" ||
                status === "en_proceso_reparacion" ||
                status === "listo_entrega" ||
                status === "entregado") && (
                <Button variant="outline" onClick={() => setAcceptanceDocOpen(true)}>
                  <FileText className="h-4 w-4 mr-1" /> Ver documento de aceptación
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <RepairOrderAddItemModal
          orderId={id}
          isOpen={addItemOpen}
          onClose={() => setAddItemOpen(false)}
          onSuccess={refreshOrder}
        />
        <RepairOrderPaymentModal
          orderId={id}
          balance={balance}
          isOpen={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          onSuccess={refreshOrder}
        />
        <RepairOrderAcceptanceDocumentModal
          orderId={id}
          isOpen={acceptanceDocOpen}
          onClose={() => setAcceptanceDocOpen(false)}
        />

        <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Aceptar presupuesto</DialogTitle>
              <DialogDescription>
                Al aceptar, se descontará el stock de los materiales. Podés indicar los días para retiro (aviso al cliente).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Días para retiro (aviso)</Label>
                <Input
                  type="number"
                  min={1}
                  className="w-full max-w-[7rem]"
                  value={daysToClaim}
                  onChange={(e) => setDaysToClaim(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAcceptDialogOpen(false)} disabled={accepting}>
                Cancelar
              </Button>
              <Button onClick={handleAccept} disabled={accepting}>
                {accepting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Aceptar presupuesto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ERPLayout>
    </Protected>
  )
}
