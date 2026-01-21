"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Download,
  Printer,
  Mail,
  Share2,
  FileText,
  Calendar,
  User,
  Phone,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface BudgetItem {
  id: string
  service: string
  description: string
  equipmentType?: string
  equipmentModel?: string
  problemDescription?: string
  quantity: number
  vat: number
  unitPrice: number
  subtotal: number
}

interface BudgetData {
  id: string
  numero: string
  cliente: string
  email?: string
  telefono?: string
  direccion?: string
  fecha: string
  fechaVencimiento: string
  estado: string
  items: BudgetItem[]
  subtotal: number
  vat21: number
  vat105: number
  total: number
  observaciones?: string
  validez?: number
  formaPago?: string
  vendedor?: string
}

interface BudgetPdfModalProps {
  isOpen: boolean
  onClose: () => void
  budget: BudgetData | null
}

export function BudgetPdfModal({ isOpen, onClose, budget }: BudgetPdfModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const handleDownloadPDF = async () => {
    if (!budget) return
    
    setIsGeneratingPdf(true)
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPosition = margin

      // Header con fondo turquoise
      doc.setFillColor(20, 184, 166)
      doc.rect(0, 0, pageWidth, 35, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('MF COMPUTERS', margin, 15)
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Servicios y Reparaciones de Hardware', margin, 21)
      doc.text('Av. Ejemplo 1234, CABA | Tel: (011) 4444-5555', margin, 26)
      doc.text('info@mfcomputers.com', margin, 31)

      // Recuadro de PRESUPUESTO
      const boxX = pageWidth - margin - 50
      doc.setFillColor(240, 240, 240)
      doc.roundedRect(boxX, 8, 48, 22, 2, 2, 'FD')
      
      doc.setTextColor(20, 184, 166)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('PRESUPUESTO', boxX + 24, 15, { align: 'center' })
      
      doc.setFontSize(12)
      doc.text(`N° ${budget.numero}`, boxX + 24, 20, { align: 'center' })
      
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text('Fecha:', boxX + 5, 25)
      doc.text(new Date(budget.fecha).toLocaleDateString('es-AR'), boxX + 18, 25)
      
      doc.text('Válido hasta:', boxX + 5, 29)
      doc.text(new Date(budget.fechaVencimiento).toLocaleDateString('es-AR'), boxX + 34, 29)

      yPosition = 45

      // Datos del cliente
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('CLIENTE:', margin, yPosition)
      
      yPosition += 6
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Nombre: ${budget.cliente}`, margin, yPosition)
      
      if (budget.email) {
        yPosition += 5
        doc.text(`Email: ${budget.email}`, margin, yPosition)
      }
      
      if (budget.telefono) {
        yPosition += 5
        doc.text(`Teléfono: ${budget.telefono}`, margin, yPosition)
      }
      
      if (budget.direccion) {
        yPosition += 5
        doc.text(`Dirección: ${budget.direccion}`, margin, yPosition)
      }

      yPosition += 10

      // Tabla de servicios/reparaciones
      const tableData = budget.items.map(item => [
        item.quantity.toString(),
        item.service,
        item.equipmentType ? item.equipmentType.replace('_', ' ').toUpperCase() : '-',
        `${item.vat}%`,
        `$${item.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
        `$${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
      ])

      autoTable(doc, {
        startY: yPosition,
        head: [['Cant.', 'Servicio/Reparación', 'Equipo', 'IVA', 'P.Unit.', 'Subtotal']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [20, 184, 166],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 70 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: margin, right: margin }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 10

      // Totales
      const totalsX = pageWidth - margin - 60
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      doc.text('Subtotal:', totalsX, yPosition, { align: 'right' })
      doc.text(`$${budget.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - margin, yPosition, { align: 'right' })
      
      if (budget.vat21 > 0) {
        yPosition += 5
        doc.text('IVA 21%:', totalsX, yPosition, { align: 'right' })
        doc.text(`$${budget.vat21.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - margin, yPosition, { align: 'right' })
      }
      
      if (budget.vat105 > 0) {
        yPosition += 5
        doc.text('IVA 10.5%:', totalsX, yPosition, { align: 'right' })
        doc.text(`$${budget.vat105.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - margin, yPosition, { align: 'right' })
      }

      yPosition += 8
      doc.setDrawColor(20, 184, 166)
      doc.setLineWidth(0.5)
      doc.line(totalsX - 10, yPosition, pageWidth - margin, yPosition)

      yPosition += 7
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(20, 184, 166)
      doc.text('TOTAL:', totalsX, yPosition, { align: 'right' })
      doc.text(`$${budget.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pageWidth - margin, yPosition, { align: 'right' })

      yPosition += 15

      // Observaciones
      if (budget.observaciones) {
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('OBSERVACIONES:', margin, yPosition)
        yPosition += 5
        doc.setFont('helvetica', 'normal')
        const obsLines = doc.splitTextToSize(budget.observaciones, pageWidth - 2 * margin)
        doc.text(obsLines, margin, yPosition)
        yPosition += obsLines.length * 5 + 5
      }

      // Pie de página
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        'Este presupuesto tiene una validez de 10 días desde su emisión.',
        pageWidth / 2,
        pageHeight - 15,
        { align: 'center' }
      )
      doc.text(
        'Para consultas o aprobación, contáctenos por email o teléfono.',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      )

      const date = new Date().toISOString().split('T')[0]
      doc.save(`Presupuesto_${budget.numero}_${date}.pdf`)
    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('No se pudo generar el PDF. Intenta nuevamente.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handlePrint = () => {
    window.print()
    console.log("Imprimiendo presupuesto:", budget.numero)
  }

  const handleSendEmail = async () => {
    if (!budget.email) {
      alert('El presupuesto no tiene un email asociado')
      return
    }

    setIsSendingEmail(true)
    try {
      // Aquí iría la lógica para enviar el presupuesto por email
      // Por ahora solo simulamos
      console.log("Enviando presupuesto por email a:", budget.email)
      
      // Simular delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      alert(`Presupuesto ${budget.numero} enviado exitosamente a ${budget.email}`)
    } catch (error) {
      console.error('Error al enviar email:', error)
      alert('No se pudo enviar el email. Intenta nuevamente.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const getEstadoConfig = (estado: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      pendiente: {
        label: "Pendiente",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        icon: Clock
      },
      enviado: {
        label: "Enviado",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
        icon: Mail
      },
      aprobado: {
        label: "Aprobado",
        color: "bg-turquoise-100 text-turquoise-800 dark:bg-turquoise-900/20 dark:text-turquoise-400",
        icon: CheckCircle
      },
      rechazado: {
        label: "Rechazado",
        color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        icon: AlertCircle
      }
    }
    return configs[estado] || configs.pendiente
  }

  if (!budget) return null

  const estadoConfig = getEstadoConfig(budget.estado)
  const EstadoIcon = estadoConfig.icon

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/50 rounded-lg">
              <FileText className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
            </div>
            <div>
              <div>Presupuesto {budget.numero}</div>
              <div className="text-sm font-normal text-muted-foreground mt-1">
                <Badge className={estadoConfig.color}>
                  <EstadoIcon className="h-3 w-3 mr-1" />
                  {estadoConfig.label}
                </Badge>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Visualización y acciones del presupuesto
          </DialogDescription>
        </DialogHeader>

        {/* Botones de acción */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={handleDownloadPDF} 
            disabled={isGeneratingPdf}
            variant="outline"
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}
          </Button>
          <Button 
            onClick={handlePrint} 
            variant="outline"
            className="flex-1"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button 
            onClick={handleSendEmail} 
            disabled={isSendingEmail || !budget.email}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
          >
            <Mail className="h-4 w-4 mr-2" />
            {isSendingEmail ? 'Enviando...' : 'Enviar por Email'}
          </Button>
        </div>

        <Separator />

        {/* Vista previa del presupuesto */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 print:p-8 print:border-0">
          {/* Header */}
          <div className="bg-turquoise-600 text-white p-4 rounded-t-lg mb-6 print:mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">MF COMPUTERS</h2>
                <p className="text-sm">Servicios y Reparaciones de Hardware</p>
                <p className="text-xs mt-1">Av. Ejemplo 1234, CABA | Tel: (011) 4444-5555</p>
                <p className="text-xs">info@mfcomputers.com</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded text-right">
                <div className="text-lg font-bold mb-1">PRESUPUESTO</div>
                <div className="text-sm">N° {budget.numero}</div>
                <div className="text-xs mt-2">
                  <div>Fecha: {new Date(budget.fecha).toLocaleDateString('es-AR')}</div>
                  <div>Válido hasta: {new Date(budget.fechaVencimiento).toLocaleDateString('es-AR')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-3">CLIENTE:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Nombre:</span> {budget.cliente}
              </div>
              {budget.email && (
                <div>
                  <span className="font-medium">Email:</span> {budget.email}
                </div>
              )}
              {budget.telefono && (
                <div>
                  <span className="font-medium">Teléfono:</span> {budget.telefono}
                </div>
              )}
              {budget.direccion && (
                <div className="col-span-2">
                  <span className="font-medium">Dirección:</span> {budget.direccion}
                </div>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Tabla de servicios */}
          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-turquoise-600 text-white">
                  <th className="border p-2 text-left">Cant.</th>
                  <th className="border p-2 text-left">Servicio/Reparación</th>
                  <th className="border p-2 text-left">Equipo</th>
                  <th className="border p-2 text-left">IVA</th>
                  <th className="border p-2 text-right">P.Unit.</th>
                  <th className="border p-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {budget.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900' : ''}>
                    <td className="border p-2">{item.quantity}</td>
                    <td className="border p-2">
                      <div className="font-medium">{item.service}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                      )}
                      {item.problemDescription && (
                        <div className="text-xs text-orange-600 mt-1 italic">Problema: {item.problemDescription}</div>
                      )}
                    </td>
                    <td className="border p-2">
                      <div className="text-xs">
                        {item.equipmentType && (
                          <div className="font-medium uppercase">{item.equipmentType.replace('_', ' ')}</div>
                        )}
                        {item.equipmentModel && (
                          <div className="text-muted-foreground">{item.equipmentModel}</div>
                        )}
                      </div>
                    </td>
                    <td className="border p-2">{item.vat}%</td>
                    <td className="border p-2 text-right">${item.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td className="border p-2 text-right font-medium">${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span>Subtotal:</span>
                <span className="font-medium">${budget.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
              {budget.vat21 > 0 && (
                <div className="flex justify-between py-2">
                  <span>IVA 21%:</span>
                  <span className="font-medium">${budget.vat21.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {budget.vat105 > 0 && (
                <div className="flex justify-between py-2">
                  <span>IVA 10.5%:</span>
                  <span className="font-medium">${budget.vat105.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between py-2 text-lg font-bold text-turquoise-600">
                <span>TOTAL:</span>
                <span>${budget.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {budget.observaciones && (
            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded">
              <h4 className="font-bold mb-2">OBSERVACIONES:</h4>
              <p className="text-sm whitespace-pre-wrap">{budget.observaciones}</p>
            </div>
          )}

          {/* Pie de página */}
          <div className="text-xs text-center text-muted-foreground mt-8 pt-4 border-t border-slate-300">
            <p>Este presupuesto tiene una validez de {budget.validez || 10} días desde su emisión.</p>
            <p className="mt-1">Para consultas o aprobación, contáctenos por email o teléfono.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
