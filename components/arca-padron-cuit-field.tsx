"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getClientArcaPadron, getSupplierArcaPadron } from "@/lib/api"
import {
  formatCuitDisplay,
  getArcaPadronDisplayName,
  getArcaPadronIvaHint,
  isValidCuitDigits,
  normalizeCuitDigits,
  type ArcaPadronEntity,
  type ArcaPadronResult,
} from "@/lib/arca-padron"
import { AlertCircle, CheckCircle2, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

const DEBOUNCE_MS = 500

export interface ArcaPadronCuitFieldProps {
  entityType: ArcaPadronEntity
  cuitValue: string
  onCuitChange: (formatted: string) => void
  onApplyPadron: (data: ArcaPadronResult) => void
  disabled?: boolean
  inputId?: string
  label?: string
  className?: string
}

export function ArcaPadronCuitField({
  entityType,
  cuitValue,
  onCuitChange,
  onApplyPadron,
  disabled = false,
  inputId = "arca-padron-cuit",
  label = "CUIL / CUIT",
  className,
}: ArcaPadronCuitFieldProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ArcaPadronResult | null>(null)
  const lastSearchedRef = useRef<string>("")
  const searchingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
  }

  const runSearch = useCallback(
    async (digits: string, source: "manual" | "debounce") => {
      if (digits.length !== 11 || searchingRef.current) return
      if (source === "debounce" && lastSearchedRef.current === digits) return

      searchingRef.current = true
      setLoading(true)
      setError(null)
      try {
        const fetcher = entityType === "client" ? getClientArcaPadron : getSupplierArcaPadron
        const data = await fetcher(digits)
        lastSearchedRef.current = digits
        setLastResult(data)
        onApplyPadron(data)
        onCuitChange(formatCuitDisplay(data.cuit || digits))
        const displayName = getArcaPadronDisplayName(data)
        if (source === "manual") {
          toast.success("Datos de ARCA aplicados", {
            description: displayName || `CUIT ${formatCuitDisplay(digits)}`,
          })
        }
      } catch (e) {
        lastSearchedRef.current = ""
        setLastResult(null)
        const msg = e instanceof Error ? e.message : "Error al consultar ARCA"
        setError(msg)
        if (source === "manual") toast.error(msg)
      } finally {
        searchingRef.current = false
        setLoading(false)
      }
    },
    [entityType, onApplyPadron, onCuitChange]
  )

  useEffect(() => {
    clearDebounce()
    const digits = normalizeCuitDigits(cuitValue)
    if (!isValidCuitDigits(cuitValue)) {
      if (digits.length < 11) setError(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      void runSearch(digits, "debounce")
    }, DEBOUNCE_MS)
    return clearDebounce
  }, [cuitValue, runSearch])

  useEffect(() => {
    if (!cuitValue.trim()) {
      setError(null)
      setLastResult(null)
      lastSearchedRef.current = ""
    }
  }, [cuitValue])

  const handleCuitInput = (raw: string) => {
    const digits = normalizeCuitDigits(raw)
    const formatted = digits.length <= 2 ? digits : formatCuitDisplay(raw)
    onCuitChange(formatted)
    if (error) setError(null)
  }

  const ivaHint = lastResult ? getArcaPadronIvaHint(lastResult) : null
  const canSearch = isValidCuitDigits(cuitValue) && !loading && !disabled

  return (
    <div className={className}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
        <Input
          id={inputId}
          value={cuitValue}
          onChange={(e) => handleCuitInput(e.target.value)}
          placeholder="11 dígitos (ej. 20-12345678-9)"
          disabled={disabled || loading}
          maxLength={13}
          className="flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0 gap-1.5"
          disabled={!canSearch}
          onClick={() => void runSearch(normalizeCuitDigits(cuitValue), "manual")}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Buscar en ARCA
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        Con 11 dígitos se consulta ARCA automáticamente (esperá medio segundo) o usá el botón.
      </p>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {lastResult && !error && (
        <Alert className="mt-3 border-primary/30 bg-primary/5">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription className="space-y-1">
            <p>
              <span className="font-medium">ARCA:</span>{" "}
              {getArcaPadronDisplayName(lastResult) || "—"}
            </p>
            {ivaHint && (
              <p className="text-muted-foreground">
                Condición IVA sugerida (orientativa): <span className="text-foreground">{ivaHint}</span>
              </p>
            )}
            {lastResult.padronParcial && (
              <p className="text-amber-700 dark:text-amber-400 font-medium">
                Padrón parcial: revisá y completá los datos antes de guardar.
              </p>
            )}
            {lastResult.advertencias?.map((w) => (
              <p key={w} className="text-amber-700 dark:text-amber-400">
                {w}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
