"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Percent, RefreshCw } from "lucide-react"
import { useToast } from "@/contexts/ToastContext"
import {
  applyCategoryPriceAdjustmentWithMessage,
  formatArs,
  getPricingCategories,
  previewCategoryPriceAdjustment,
  type CategoryAdjustmentPreview,
  type PricingCategoryRow,
} from "@/lib/product-pricing"

interface CategoryAdjustmentPanelProps {
  onApplied?: () => void
}

export function CategoryAdjustmentPanel({ onApplied }: CategoryAdjustmentPanelProps) {
  const { showToast } = useToast()
  const [categories, setCategories] = useState<PricingCategoryRow[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [includeUncategorized, setIncludeUncategorized] = useState(false)
  const [percentage, setPercentage] = useState("")
  const [syncWoo, setSyncWoo] = useState(false)
  const [preview, setPreview] = useState<CategoryAdjustmentPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numericCategories = useMemo(
    () => categories.filter((c) => c.category_id != null),
    [categories]
  )
  const uncategorizedRow = useMemo(
    () => categories.find((c) => c.category_id == null),
    [categories]
  )

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true)
    setError(null)
    try {
      const rows = await getPricingCategories()
      setCategories(rows)
      const ids = rows
        .filter((c) => c.category_id != null)
        .map((c) => c.category_id as number)
      setSelectedIds(new Set(ids))
      const unc = rows.find((c) => c.category_id == null)
      setIncludeUncategorized(!!unc && unc.product_count > 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar categorías")
    } finally {
      setLoadingCategories(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const allNumericSelected =
    numericCategories.length > 0 &&
    numericCategories.every((c) => selectedIds.has(c.category_id as number))

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(numericCategories.map((c) => c.category_id as number)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const toggleCategory = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    setPreview(null)
  }

  const hasSelection = selectedIds.size > 0 || includeUncategorized

  const parsedPercentage = parseFloat(percentage.replace(",", "."))
  const percentageValid =
    percentage.trim() !== "" && !Number.isNaN(parsedPercentage) && parsedPercentage !== 0

  const buildBody = () => ({
    category_ids: Array.from(selectedIds),
    include_uncategorized: includeUncategorized,
    percentage: parsedPercentage,
  })

  const runPreview = async () => {
    if (!hasSelection) {
      showToast({ message: "Seleccioná al menos una categoría o productos sin categoría", type: "error" })
      return
    }
    if (!percentageValid) {
      showToast({ message: "Ingresá un porcentaje distinto de cero", type: "error" })
      return
    }
    setLoadingPreview(true)
    setError(null)
    setPreview(null)
    try {
      const data = await previewCategoryPriceAdjustment({
        ...buildBody(),
        preview_limit: 10,
      })
      setPreview(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error en vista previa"
      setError(msg)
      showToast({ message: msg, type: "error" })
    } finally {
      setLoadingPreview(false)
    }
  }

  const runApply = async () => {
    if (!hasSelection || !percentageValid) return
    const count = preview?.products_affected ?? 0
    if (preview && count === 0) {
      showToast({ message: "No hay productos afectados con esta selección", type: "error" })
      return
    }
    const sign = parsedPercentage > 0 ? "+" : ""
    const msg = preview
      ? `¿Confirmar actualización de ${preview.products_affected} producto(s) con ${sign}${parsedPercentage}%?`
      : `¿Aplicar ${sign}${parsedPercentage}% a las categorías seleccionadas?`
    if (!window.confirm(msg)) return

    setApplying(true)
    setError(null)
    try {
      const { data, message } = await applyCategoryPriceAdjustmentWithMessage({
        ...buildBody(),
        sync_to_woocommerce: syncWoo,
      })
      let detail = message
      if (data.woocommerce_sync && syncWoo) {
        detail += ` · WooCommerce: ${data.woocommerce_sync.synced} ok`
        if (data.woocommerce_sync.failed > 0) {
          detail += `, ${data.woocommerce_sync.failed} fallidos`
        }
      }
      showToast({ message: detail, type: "success", duration: 6000 })
      setPreview(null)
      setPercentage("")
      onApplied?.()
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Error al aplicar"
      setError(errMsg)
      showToast({ message: errMsg, type: "error" })
    } finally {
      setApplying(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Ajuste por categoría
        </CardTitle>
        <CardDescription>
          Elegí categorías y un porcentaje (positivo aumenta, negativo descuenta). Los precios se
          redondean a 2 decimales.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadCategories()}
            disabled={loadingCategories}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingCategories ? "animate-spin" : ""}`} />
            Recargar categorías
          </Button>
        </div>

        {loadingCategories ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando categorías…
          </div>
        ) : (
          <div className="rounded-md border max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allNumericSelected}
                      onCheckedChange={(v) => toggleAll(v === true)}
                      aria-label="Seleccionar todas las categorías"
                    />
                  </TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Productos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numericCategories.map((row) => {
                  const id = row.category_id as number
                  return (
                    <TableRow key={id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(id)}
                          onCheckedChange={(v) => toggleCategory(id, v === true)}
                          aria-label={`Seleccionar ${row.category_name}`}
                        />
                      </TableCell>
                      <TableCell>{row.category_name}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.product_count}</TableCell>
                    </TableRow>
                  )
                })}
                {uncategorizedRow && uncategorizedRow.product_count > 0 && (
                  <TableRow>
                    <TableCell>
                      <Checkbox
                        checked={includeUncategorized}
                        onCheckedChange={(v) => {
                          setIncludeUncategorized(v === true)
                          setPreview(null)
                        }}
                        aria-label="Incluir sin categoría"
                      />
                    </TableCell>
                    <TableCell>{uncategorizedRow.category_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {uncategorizedRow.product_count}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="pricing-percentage">Porcentaje (%)</Label>
            <Input
              id="pricing-percentage"
              type="number"
              step="0.01"
              placeholder="Ej: 15 o -5"
              value={percentage}
              onChange={(e) => {
                setPercentage(e.target.value)
                setPreview(null)
              }}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={syncWoo} onCheckedChange={(v) => setSyncWoo(v === true)} />
          Sincronizar con WooCommerce al aplicar
        </label>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void runPreview()}
            disabled={loadingPreview || loadingCategories || !hasSelection || !percentageValid}
          >
            {loadingPreview && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Vista previa
          </Button>
          <Button
            type="button"
            onClick={() => void runApply()}
            disabled={
              applying ||
              loadingCategories ||
              !hasSelection ||
              !percentageValid ||
              (preview != null && preview.products_affected === 0)
            }
          >
            {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aplicar cambios
          </Button>
        </div>

        {preview && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">
              {preview.products_affected} producto(s) afectados · multiplicador{" "}
              {preview.multiplier.toFixed(4)} ({preview.percentage > 0 ? "+" : ""}
              {preview.percentage}%)
            </p>
            {preview.sample.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Nuevo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.sample.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.code}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{row.name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatArs(row.current_price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatArs(row.new_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
