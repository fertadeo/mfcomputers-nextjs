import { buildAfipQrUrl } from "@/lib/arca-invoice-afip-qr"
import type { GenerateArcaInvoicePdfParams } from "@/lib/generate-arca-invoice-pdf"
import {
  buildDefaultFacturarFormRequest,
  getStoredFacturacionCuitEmisor,
  getStoredFacturacionPuntoVenta,
} from "@/lib/facturacion-settings"

/** Muestra basada en comprobante real ARCA (Factura B 00004-00002378). */
export function getArcaInvoiceSampleParams(): GenerateArcaInvoicePdfParams {
  const defaults = buildDefaultFacturarFormRequest()
  const tipo = defaults.tipo ?? 6
  const puntoVenta = getStoredFacturacionPuntoVenta() ?? 4
  const numero = 2378
  const fechaEmision = "2026-05-07"
  const cuit =
    getStoredFacturacionCuitEmisor() ||
    process.env.NEXT_PUBLIC_FACTURADOR_CUIT_EMISOR?.replace(/\D/g, "") ||
    "20339985945"
  const subtotal = 55000
  const ivaContenido = 9545.45
  const total = 55000
  const docTipo = 99
  const docNro = 0

  const qrUrl = buildAfipQrUrl({
    fechaEmision,
    cuitEmisor: cuit,
    puntoVenta,
    tipoComprobante: tipo,
    numeroComprobante: numero,
    importe: total,
    docTipoReceptor: docTipo,
    docNroReceptor: docNro,
    cae: "86194547780882",
  })

  return {
    emisor: {
      razonSocial: "FIGUEROA MAXIMILIANO IVAN JESUS",
      domicilio: "Luther King 1095 - Santa Rosa, La Pampa",
      condicionIva: "IVA Responsable Inscripto",
      cuit,
      ingresosBrutos: "2275400",
      inicioActividades: "03/01/2011",
    },
    comprobante: {
      tipo,
      puntoVenta,
      numero,
      fechaEmision,
      concepto: (defaults.concepto ?? 1) as 1 | 2 | 3,
    },
    receptor: {
      razonSocial: "",
      docTipo,
      docNro,
      condicionIvaLabel: "Consumidor Final",
    },
    items: [
      {
        descripcion: "Cargador dell",
        cantidad: 1,
        unidadMedida: "unidades",
        precioUnitario: 55000,
        bonificacionPct: 0,
        importeBonificacion: 0,
        subtotal: 55000,
      },
    ],
    totales: {
      subtotal,
      otrosTributos: 0,
      total,
      ivaContenido,
    },
    cae: "86194547780882",
    caeVencimiento: "2026-05-17",
    qrUrl,
    condicionVenta: "Contado",
    firmaAutorizada: "Figueroa Maximiliano",
  }
}
