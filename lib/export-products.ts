import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import type { Product } from "@/lib/api"
import { getAllProductImages } from "@/lib/product-image-utils"
import { formatSaleIvaRateLabel, productIvaRate } from "@/lib/sale-iva"

export type ProductExportColumnId =
  | "code"
  | "name"
  | "description"
  | "category"
  | "price"
  | "iva"
  | "stock"
  | "min_stock"
  | "max_stock"
  | "status"
  | "barcode"
  | "backorders"
  | "weight"
  | "dimensions"
  | "updated_at"

export interface ProductExportColumn {
  id: ProductExportColumnId
  label: string
}

export const PRODUCT_EXPORT_COLUMNS: ProductExportColumn[] = [
  { id: "code", label: "Código" },
  { id: "name", label: "Nombre" },
  { id: "description", label: "Descripción" },
  { id: "category", label: "Categoría" },
  { id: "price", label: "Precio" },
  { id: "iva", label: "IVA" },
  { id: "stock", label: "Stock" },
  { id: "min_stock", label: "Stock mínimo" },
  { id: "max_stock", label: "Stock máximo" },
  { id: "status", label: "Estado" },
  { id: "barcode", label: "Código de barras" },
  { id: "backorders", label: "Venta por encargo" },
  { id: "weight", label: "Peso" },
  { id: "dimensions", label: "Dimensiones" },
  { id: "updated_at", label: "Última modificación" },
]

export const DEFAULT_PRODUCT_EXPORT_COLUMNS: ProductExportColumnId[] = [
  "code",
  "name",
  "category",
  "price",
  "stock",
]

export type ProductExportFormat = "csv" | "pdf"

export interface ProductExportOptions {
  products: Product[]
  columns: ProductExportColumnId[]
  includeImage: boolean
  format: ProductExportFormat
  onProgress?: (done: number, total: number) => void
}

function plainText(value?: string | null): string {
  if (!value) return ""
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function formatMoney(value: number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return ""
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value?: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("es-AR")
}

function productImageUrl(product: Product): string {
  return getAllProductImages(product)[0] ?? ""
}

function columnValue(product: Product, column: ProductExportColumnId): string {
  switch (column) {
    case "code":
      return product.code ?? ""
    case "name":
      return product.name ?? ""
    case "description":
      return plainText(product.description)
    case "category":
      return product.category_name ?? ""
    case "price":
      return formatMoney(product.price)
    case "iva":
      return formatSaleIvaRateLabel(productIvaRate(product))
    case "stock":
      return String(product.stock ?? 0)
    case "min_stock":
      return String(product.min_stock ?? 0)
    case "max_stock":
      return String(product.max_stock ?? 0)
    case "status":
      return product.is_active ? "Activo" : "Inactivo"
    case "barcode":
      return product.barcode ?? ""
    case "backorders":
      return product.allow_backorders ? "Sí" : "No"
    case "weight":
      return product.weight != null && product.weight !== 0 ? `${product.weight} kg` : product.weight === 0 ? "0 kg" : ""
    case "dimensions": {
      const { length, width, height } = product
      if (length == null && width == null && height == null) return ""
      return `${length ?? "—"} × ${width ?? "—"} × ${height ?? "—"} cm`
    }
    case "updated_at":
      return formatDate(product.updated_at)
    default:
      return ""
  }
}

function selectedColumns(ids: ProductExportColumnId[]): ProductExportColumn[] {
  const wanted = new Set(ids)
  return PRODUCT_EXPORT_COLUMNS.filter((column) => wanted.has(column.id))
}

function exportFileStamp(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function escapeCsv(value: string): string {
  if (/[;"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function buildProductsCsv(options: ProductExportOptions): string {
  const columns = selectedColumns(options.columns)
  const headers = [
    ...(options.includeImage ? ["Imagen"] : []),
    ...columns.map((column) => column.label),
  ]
  const lines = [headers.map(escapeCsv).join(";")]
  for (const product of options.products) {
    const cells = [
      ...(options.includeImage ? [productImageUrl(product)] : []),
      ...columns.map((column) => columnValue(product, column.id)),
    ]
    lines.push(cells.map(escapeCsv).join(";"))
  }
  return `\uFEFF${lines.join("\r\n")}`
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  let done = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await mapper(items[index], index)
      done += 1
      onProgress?.(done, items.length)
    }
  })
  await Promise.all(workers)
  return results
}

function loadImageDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    const timer = window.setTimeout(() => {
      img.onload = null
      img.onerror = null
      resolve(null)
    }, 5000)
    img.onload = () => {
      window.clearTimeout(timer)
      try {
        const size = 80
        const canvas = document.createElement("canvas")
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx || !img.width || !img.height) {
          resolve(null)
          return
        }
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, size, size)
        const scale = Math.min(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        resolve(canvas.toDataURL("image/jpeg", 0.72))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

async function loadProductImages(
  products: Product[],
  onProgress?: (done: number, total: number) => void
): Promise<Array<string | null>> {
  return mapPool(
    products,
    6,
    async (product) => {
      const url = productImageUrl(product)
      if (!url) return null
      return loadImageDataUrl(url)
    },
    onProgress
  )
}

export async function buildProductsPdf(options: ProductExportOptions): Promise<jsPDF> {
  const columns = selectedColumns(options.columns)
  const includeImage = options.includeImage
  const images = includeImage
    ? await loadProductImages(options.products, options.onProgress)
    : []

  const wide = includeImage || columns.length > 6
  const doc = new jsPDF({ orientation: wide ? "landscape" : "portrait", unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 28

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text("Catálogo de productos", marginX, 36)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  const stamp = new Date().toLocaleString("es-AR")
  doc.text(`${options.products.length} producto${options.products.length === 1 ? "" : "s"} · ${stamp}`, marginX, 52)

  const head = [
    ...(includeImage ? ["Imagen"] : []),
    ...columns.map((column) => column.label),
  ]
  const body = options.products.map((product) => [
    ...(includeImage ? [""] : []),
    ...columns.map((column) => {
      const value = columnValue(product, column.id)
      return column.id === "description" && value.length > 180 ? `${value.slice(0, 177)}...` : value
    }),
  ])

  autoTable(doc, {
    startY: 64,
    margin: { left: marginX, right: marginX, bottom: 36 },
    head: [head],
    body,
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 3,
      textColor: [15, 23, 42],
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: includeImage
      ? { 0: { cellWidth: 28, minCellHeight: 22 } }
      : undefined,
    didDrawCell: (data) => {
      if (!includeImage || data.section !== "body" || data.column.index !== 0) return
      const image = images[data.row.index]
      if (!image) return
      const padding = 2
      const size = Math.min(18, data.cell.height - padding * 2, data.cell.width - padding * 2)
      if (size <= 0) return
      try {
        doc.addImage(
          image,
          "JPEG",
          data.cell.x + (data.cell.width - size) / 2,
          data.cell.y + (data.cell.height - size) / 2,
          size,
          size
        )
      } catch {
        // La imagen no se pudo incrustar; la fila sigue con el resto de columnas.
      }
    },
    didDrawPage: () => {
      const pageHeight = doc.internal.pageSize.getHeight()
      const page = doc.getNumberOfPages()
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text("MFComputers", marginX, pageHeight - 16)
      doc.text(`Página ${page}`, pageWidth - marginX, pageHeight - 16, { align: "right" })
    },
  })

  return doc
}

export async function exportProducts(options: ProductExportOptions): Promise<void> {
  if (typeof window === "undefined") return
  const filename = `productos-${exportFileStamp()}`
  if (options.format === "csv") {
    const csv = buildProductsCsv(options)
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${filename}.csv`)
    return
  }
  const doc = await buildProductsPdf(options)
  doc.save(`${filename}.pdf`)
}
