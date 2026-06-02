"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { DashboardChartData } from "@/lib/dashboard-chart-data"
import { Loader2, LineChart, PieChartIcon, Wrench } from "lucide-react"

const salesChartConfig = {
  pos: { label: "POS", color: "var(--color-chart-1)" },
  orders: { label: "WooCommerce", color: "var(--color-chart-2)" },
  total: { label: "Total", color: "var(--color-chart-3)" },
} satisfies ChartConfig

const channelChartConfig = {
  pos: { label: "Punto de venta", color: "var(--color-chart-1)" },
  woo: { label: "WooCommerce", color: "var(--color-chart-2)" },
} satisfies ChartConfig

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}k`
  return `$${value.toLocaleString("es-AR")}`
}

interface DashboardChartsProps {
  loading?: boolean
  data: DashboardChartData | null
}

export function DashboardCharts({ loading, data }: DashboardChartsProps) {
  const hasDailyData = data?.dailySales.some((d) => d.total > 0) ?? false
  const channelTotal =
    (data?.channelMix.reduce((s, c) => s + (c.channel !== "sin_datos" ? c.amount : 0), 0) ?? 0)
  const hasChannelData = channelTotal > 0
  const hasRepairData = (data?.repairByStatus.length ?? 0) > 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Análisis visual</h2>
        <p className="text-sm text-muted-foreground">
          Tendencia de ventas, mix de canales y carga del taller
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="h-4 w-4 text-turquoise-500" />
              Ventas — últimos 14 días
            </CardTitle>
            <CardDescription>POS y WooCommerce apilados por día</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {loading ? (
              <div className="flex h-[280px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !hasDailyData ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Sin ventas en el período
              </div>
            ) : (
              <ChartContainer config={salesChartConfig} className="h-[280px] w-full">
                <AreaChart data={data!.dailySales} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={56}
                    tickFormatter={(v) => formatCurrency(Number(v))}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span className="font-mono">
                            {formatCurrency(Number(value))} ·{" "}
                            {salesChartConfig[name as keyof typeof salesChartConfig]?.label ?? name}
                          </span>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="pos"
                    stackId="sales"
                    stroke="var(--color-chart-1)"
                    fill="url(#fillPos)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stackId="sales"
                    stroke="var(--color-chart-2)"
                    fill="url(#fillOrders)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-turquoise-500" />
              Mix del mes
            </CardTitle>
            <CardDescription>Participación POS vs WooCommerce</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            {loading ? (
              <div className="flex h-[280px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !hasChannelData ? (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                Sin ventas este mes
              </div>
            ) : (
              <ChartContainer config={channelChartConfig} className="mx-auto h-[280px] w-full max-w-[320px]">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                    }
                  />
                  <Pie
                    data={data!.channelMix}
                    dataKey="amount"
                    nameKey="channel"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="var(--color-card)"
                  >
                    {data!.channelMix.map((entry) => (
                      <Cell key={entry.channel} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="channel" />}
                    className="-translate-y-2 flex-wrap gap-2"
                  />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-turquoise-500" />
            Taller — órdenes abiertas por estado
          </CardTitle>
          <CardDescription>Distribución actual del pipeline de reparaciones</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          {loading ? (
            <div className="flex h-[220px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !hasRepairData ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No hay órdenes abiertas en taller
            </div>
          ) : (
            <ChartContainer
              config={Object.fromEntries(
                data!.repairByStatus.map((r) => [r.status, { label: r.label, color: r.fill }])
              )}
              className="h-[220px] w-full"
            >
              <BarChart
                data={data!.repairByStatus}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                  {data!.repairByStatus.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
