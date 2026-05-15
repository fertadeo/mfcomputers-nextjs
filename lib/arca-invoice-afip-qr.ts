/** Construye la URL del QR AFIP (RG 4290) cuando la API no devolvió qrUrl. */
export function buildAfipQrUrl(params: {
  fechaEmision: string
  cuitEmisor: string | number
  puntoVenta: number
  tipoComprobante: number
  numeroComprobante: number
  importe: number
  moneda?: string
  cotizacion?: number
  docTipoReceptor: number
  docNroReceptor: number
  cae: string
}): string {
  const cuit = String(params.cuitEmisor).replace(/\D/g, "")
  const payload = {
    ver: 1,
    fecha: params.fechaEmision.slice(0, 10),
    cuit: Number(cuit),
    ptoVta: params.puntoVenta,
    tipoCmp: params.tipoComprobante,
    nroCmp: params.numeroComprobante,
    importe: Math.round(params.importe * 100) / 100,
    moneda: params.moneda ?? "PES",
    ctz: params.cotizacion ?? 1,
    tipoDocRec: params.docTipoReceptor,
    nroDocRec: params.docNroReceptor,
    tipoCodAut: "E",
    codAut: Number(String(params.cae).replace(/\D/g, "")) || params.cae,
  }

  const json = JSON.stringify(payload)
  const p =
    typeof window !== "undefined"
      ? btoa(unescape(encodeURIComponent(json)))
      : Buffer.from(json, "utf-8").toString("base64")

  return `https://www.afip.gob.ar/fe/qr/?p=${p}`
}
