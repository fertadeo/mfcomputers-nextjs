"use client"

import QRCodeSVG from "react-qr-code"
import {
  FACTURA_COPIAS,
  type FacturaCopia,
  type GenerateArcaInvoicePdfParams,
} from "@/lib/generate-arca-invoice-pdf"
import {
  fmtDateAr,
  formatDocReceptor,
  moneyAr,
  moneyArWithSymbol,
} from "@/lib/arca-invoice-format"
import { ArcaInvoiceHeader } from "@/components/arca-invoice-header"

const border = "1px solid #000"
const headerBg = "#e6e6e6"
const font = "Arial, Helvetica, sans-serif"

function LabelValue({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className} style={{ fontSize: "11px", lineHeight: 1.35 }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

export interface ArcaInvoiceTemplatePreviewProps {
  data: GenerateArcaInvoicePdfParams
  className?: string
  triplicado?: boolean
}

export function ArcaInvoiceTemplatePreview({
  data,
  className,
  triplicado = true,
}: ArcaInvoiceTemplatePreviewProps) {
  const copias: FacturaCopia[] =
    triplicado === false ? [data.copia ?? "ORIGINAL"] : [...FACTURA_COPIAS]

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {copias.map((copia, index) => (
        <ArcaInvoiceCopyPreview
          key={copia}
          data={data}
          copia={copia}
          pagina={copias.length > 1 ? `${index + 1}/${copias.length}` : "1/1"}
        />
      ))}
    </div>
  )
}

interface ArcaInvoiceCopyPreviewProps {
  data: GenerateArcaInvoicePdfParams
  copia: FacturaCopia
  pagina: string
}

function ArcaInvoiceCopyPreview({ data, copia, pagina }: ArcaInvoiceCopyPreviewProps) {
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: "11px",
        color: "#000",
        background: "#fff",
        border,
        maxWidth: "210mm",
        margin: "0 auto",
      }}
    >
      <ArcaInvoiceHeader copia={copia} emisor={data.emisor} comprobante={data.comprobante} />

      <div style={{ borderTop: border, fontSize: "11px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: border }}>
          <div style={{ padding: "6px 10px", borderRight: border }}>
            <LabelValue
              label="Doc.: "
              value={formatDocReceptor(data.receptor.docTipo, data.receptor.docNro)}
            />
          </div>
          <div style={{ padding: "6px 10px" }}>
            <LabelValue label="Apellido y Nombre / Razón Social: " value={data.receptor.razonSocial} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: border }}>
          <div style={{ padding: "6px 10px", borderRight: border }}>
            <LabelValue label="Condición frente al IVA: " value={data.receptor.condicionIvaLabel} />
          </div>
          <div style={{ padding: "6px 10px" }}>
            <LabelValue label="Domicilio: " value={data.receptor.domicilio ?? ""} />
          </div>
        </div>
        <div style={{ padding: "6px 10px" }}>
          <LabelValue label="Condición de venta: " value={data.condicionVenta ?? "Contado"} />
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
        <thead>
          <tr style={{ background: headerBg }}>
            {[
              "Código",
              "Producto / Servicio",
              "Cantidad",
              "U. Medida",
              "Precio Unit.",
              "% Bonif",
              "Imp. Bonif.",
              "Subtotal",
            ].map((h) => (
              <th
                key={h}
                style={{
                  border,
                  padding: "5px 4px",
                  fontWeight: 700,
                  textAlign: h === "Producto / Servicio" || h === "Código" ? "left" : "right",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.items.map((it, i) => (
            <tr key={i}>
              <td style={{ border, padding: "4px" }}>{it.codigo ?? ""}</td>
              <td style={{ border, padding: "4px", textAlign: "left" }}>{it.descripcion}</td>
              <td style={{ border, padding: "4px", textAlign: "right" }}>{moneyAr(it.cantidad)}</td>
              <td style={{ border, padding: "4px", textAlign: "center" }}>{it.unidadMedida ?? "unidades"}</td>
              <td style={{ border, padding: "4px", textAlign: "right" }}>{moneyAr(it.precioUnitario)}</td>
              <td style={{ border, padding: "4px", textAlign: "right" }}>{moneyAr(it.bonificacionPct ?? 0)}</td>
              <td style={{ border, padding: "4px", textAlign: "right" }}>
                {moneyAr(it.importeBonificacion ?? 0)}
              </td>
              <td style={{ border, padding: "4px", textAlign: "right" }}>{moneyAr(it.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: border, borderBottom: border, padding: "10px 12px", minHeight: "72px" }}>
        <div style={{ float: "right", width: "220px", fontSize: "11px" }}>
          <TotalRow label="Subtotal: $" value={data.totales.subtotal} />
          <TotalRow label="Importe Otros Tributos: $" value={data.totales.otrosTributos ?? 0} />
          <TotalRow label="Importe Total: $" value={data.totales.total} bold />
          {data.totales.ivaContenido != null ? (
            <div style={{ marginTop: "10px", borderTop: "1px solid #999", paddingTop: "6px" }}>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: "10px",
                  marginBottom: "4px",
                  fontStyle: "italic",
                  textDecoration: "underline",
                  margin: 0,
                }}
              >
                Régimen de Transparencia Fiscal al Consumidor (Ley 27.743)
              </p>
              <TotalRow label="IVA Contenido: $" value={data.totales.ivaContenido} />
            </div>
          ) : null}
        </div>
        <div style={{ clear: "both" }} />
      </div>

      {data.firmaAutorizada ? (
        <div style={{ textAlign: "center", padding: "10px 0 6px", fontStyle: "italic", fontSize: "11px" }}>
          &quot;{data.firmaAutorizada}&quot;
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "end",
          padding: "8px 10px 12px",
          gap: "8px",
          fontSize: "10px",
        }}
      >
        <div>
          <QRCodeSVG value={data.qrUrl} size={90} level="M" />
          <div style={{ fontWeight: 700, marginTop: "4px" }}>ARCA</div>
          <div>Comprobante Autorizado</div>
          <div style={{ fontSize: "8px", maxWidth: "140px", lineHeight: 1.3, marginTop: "2px" }}>
            Esta Agencia no se responsabiliza por los datos ingresados en el detalle de la operación
          </div>
        </div>
        <div style={{ textAlign: "center", alignSelf: "center" }}>Pág. {pagina}</div>
        <div style={{ textAlign: "right", fontSize: "11px" }}>
          <LabelValue label="CAE N°: " value={data.cae} />
          <LabelValue
            label="Fecha de Vto. de CAE: "
            value={data.caeVencimiento ? fmtDateAr(data.caeVencimiento) : "—"}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )
}

function TotalRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "3px",
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span>{moneyArWithSymbol(value)}</span>
    </div>
  )
}
