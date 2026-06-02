import { getSales, getOrders, type Sale, type Order } from "@/lib/api"

export interface DailySalesPoint {
  date: string
  label: string
  pos: number
  orders: number
  total: number
}

export interface ChannelMixPoint {
  channel: string
  amount: number
  fill: string
}

export interface RepairStatusPoint {
  status: string
  label: string
  count: number
  fill: string
}

export interface DashboardChartData {
  dailySales: DailySalesPoint[]
  channelMix: ChannelMixPoint[]
  repairByStatus: RepairStatusPoint[]
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = parseFloat(value.replace(/[^\d.-]/g, "") || "0")
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function formatDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString("es-AR", { weekday: "short", day: "numeric" })
}

/** Últimos N días inclusive (YYYY-MM-DD). */
export function getLastNDaysRange(days: number): { dateFrom: string; dateTo: string; keys: string[] } {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    keys.push(`${y}-${m}-${day}`)
  }
  return { dateFrom: keys[0], dateTo: keys[keys.length - 1], keys }
}

function saleDateKey(sale: Sale): string {
  const raw = sale.sale_date || sale.created_at
  if (!raw) return ""
  return raw.slice(0, 10)
}

function orderDateKey(order: Order): string {
  const raw = order.order_date || ""
  return raw.slice(0, 10)
}

async function fetchSalesInRange(dateFrom: string, dateTo: string): Promise<Sale[]> {
  const all: Sale[] = []
  let page = 1
  const limit = 100
  for (;;) {
    const res = await getSales({ date_from: dateFrom, date_to: dateTo, page, limit })
    const list = res.data?.sales ?? []
    all.push(...list)
    const total = res.data?.total ?? list.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    if (page >= totalPages || list.length < limit) break
    page += 1
    if (page > 20) break
  }
  return all
}

async function fetchOrdersInRange(dateFrom: string, dateTo: string): Promise<Order[]> {
  const all: Order[] = []
  let page = 1
  const limit = 100
  for (;;) {
    const res = await getOrders({ date_from: dateFrom, date_to: dateTo, page, limit })
    const list = res.data?.orders ?? []
    all.push(...list)
    const pagination = res.data?.pagination
    const totalPages = pagination?.totalPages ?? (list.length < limit ? page : page + 1)
    if (page >= totalPages || list.length < limit) break
    page += 1
    if (page > 20) break
  }
  return all
}

function buildDailySeries(
  dayKeys: string[],
  sales: Sale[],
  orders: Order[]
): DailySalesPoint[] {
  const posByDay = new Map<string, number>()
  const ordersByDay = new Map<string, number>()
  for (const key of dayKeys) {
    posByDay.set(key, 0)
    ordersByDay.set(key, 0)
  }

  for (const sale of sales) {
    const key = saleDateKey(sale)
    if (!key || !posByDay.has(key)) continue
    posByDay.set(key, (posByDay.get(key) ?? 0) + toNumber(sale.total_amount))
  }

  for (const order of orders) {
    if (order.status === "cancelado" || order.status === "cancelled") continue
    const key = orderDateKey(order)
    if (!key || !ordersByDay.has(key)) continue
    ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + toNumber(order.total_amount))
  }

  return dayKeys.map((date) => {
    const pos = posByDay.get(date) ?? 0
    const ord = ordersByDay.get(date) ?? 0
    return {
      date,
      label: formatDayLabel(date),
      pos,
      orders: ord,
      total: pos + ord,
    }
  })
}

const CHANNEL_COLORS = {
  pos: "var(--color-chart-1)",
  woo: "var(--color-chart-2)",
}

const REPAIR_STATUS_COLORS: Record<string, string> = {
  consulta_recibida: "var(--color-chart-3)",
  presupuestado: "var(--color-chart-4)",
  aceptado: "var(--color-chart-2)",
  en_proceso_reparacion: "var(--color-chart-1)",
  listo_entrega: "var(--color-chart-5)",
}

/**
 * Series para gráficos del dashboard (últimos 14 días + mix del mes + taller).
 */
export async function fetchDashboardChartData(
  monthlyPos: number,
  monthlyOrders: number,
  repairByStatus: Record<string, number>,
  statusLabels: Record<string, string>
): Promise<DashboardChartData> {
  const { dateFrom, dateTo, keys } = getLastNDaysRange(14)

  const [sales, orders] = await Promise.all([
    fetchSalesInRange(dateFrom, dateTo).catch(() => [] as Sale[]),
    fetchOrdersInRange(dateFrom, dateTo).catch(() => [] as Order[]),
  ])

  const dailySales = buildDailySeries(keys, sales, orders)

  const channelMix: ChannelMixPoint[] = []
  if (monthlyPos > 0) {
    channelMix.push({ channel: "pos", amount: monthlyPos, fill: CHANNEL_COLORS.pos })
  }
  if (monthlyOrders > 0) {
    channelMix.push({ channel: "woo", amount: monthlyOrders, fill: CHANNEL_COLORS.woo })
  }

  const repairByStatusPoints: RepairStatusPoint[] = Object.entries(repairByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count], i) => ({
      status,
      label: statusLabels[status] ?? status,
      count,
      fill: REPAIR_STATUS_COLORS[status] ?? `var(--color-chart-${(i % 5) + 1})`,
    }))

  return {
    dailySales,
    channelMix,
    repairByStatus: repairByStatusPoints,
  }
}
