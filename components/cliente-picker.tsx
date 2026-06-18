"use client"

import { Building2, Hash, Mail, Phone, Search, User, X } from "lucide-react"
import type { Cliente } from "@/lib/api"
import {
  formatClienteCuitDisplay,
  getClienteDisplayDetails,
  getClienteDisplayName,
  getClienteDistinguishingSubtitle,
  getClienteInitials,
  getClienteUbicacionParts,
} from "@/lib/cliente-display"
import { ClienteUbicacion } from "@/components/cliente-ubicacion"
import { formatTaxConditionLabel } from "@/lib/client-tax-condition"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function ClienteOptionRow({
  cliente,
  onSelect,
  highlighted,
}: {
  cliente: Cliente
  onSelect: (cliente: Cliente) => void
  highlighted?: boolean
}) {
  const cuit = formatClienteCuitDisplay(cliente)
  const ubicacionParts = getClienteUbicacionParts(cliente)
  const hasUbicacion = Boolean(ubicacionParts.address || ubicacionParts.city)

  return (
    <button
      type="button"
      className={cn(
        "w-full px-3 py-3 text-left transition-colors border-b last:border-b-0",
        highlighted ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/80"
      )}
      onClick={() => onSelect(cliente)}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {getClienteInitials(cliente.name)}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm leading-tight">{getClienteDisplayName(cliente)}</span>
            {cliente.code?.trim() ? (
              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                {cliente.code.trim()}
              </Badge>
            ) : null}
            {cliente.tax_condition ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {formatTaxConditionLabel(cliente.tax_condition)}
              </Badge>
            ) : null}
          </div>
          {hasUbicacion ? (
            <ClienteUbicacion cliente={cliente} variant="compact" className="mt-0.5" />
          ) : null}
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {cuit ? (
              <span className="inline-flex items-center gap-1 font-mono">
                <Hash className="h-3 w-3" />
                {cuit}
              </span>
            ) : null}
            {cliente.phone?.trim() ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {cliente.phone.trim()}
              </span>
            ) : null}
            {cliente.email?.trim() ? (
              <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                <Mail className="h-3 w-3 shrink-0" />
                {cliente.email.trim()}
              </span>
            ) : null}
          </div>
          {!hasUbicacion ? (
            <p className="text-[11px] text-muted-foreground/80">{getClienteDistinguishingSubtitle(cliente)}</p>
          ) : null}
        </div>
      </div>
    </button>
  )
}

export interface ClientePickerProps {
  searchValue: string
  onSearchChange: (value: string) => void
  results: Cliente[]
  selectedCliente: Cliente | null
  onSelect: (cliente: Cliente) => void
  onClear?: () => void
  placeholder?: string
  clearLabel?: string
  className?: string
  showSelectedCard?: boolean
  emptyResultsMessage?: string
}

export function ClientePicker({
  searchValue,
  onSearchChange,
  results,
  selectedCliente,
  onSelect,
  onClear,
  placeholder = "Buscar por nombre, CUIT, código o dirección…",
  clearLabel = "Usar consumidor final",
  className,
  showSelectedCard = true,
  emptyResultsMessage = "No se encontraron clientes activos",
}: ClientePickerProps) {
  const showDropdown = searchValue.trim().length >= 2 && (results.length > 0 || !selectedCliente)
  const showEmpty = searchValue.trim().length >= 2 && results.length === 0

  const handleSelect = (cliente: Cliente) => {
    onSelect(cliente)
    onSearchChange(getClienteDisplayName(cliente))
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => {
            onSearchChange(e.target.value)
          }}
          className="pl-9 pr-9"
        />
        {searchValue ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => {
              onSearchChange("")
              onClear?.()
            }}
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div className="overflow-hidden rounded-lg border bg-popover shadow-md">
          {results.length > 0 ? (
            <ul className="max-h-56 overflow-y-auto">
              {results.map((cliente) => (
                <li key={cliente.id}>
                  <ClienteOptionRow
                    cliente={cliente}
                    onSelect={handleSelect}
                    highlighted={selectedCliente?.id === cliente.id}
                  />
                </li>
              ))}
            </ul>
          ) : showEmpty ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">{emptyResultsMessage}</p>
          ) : null}
        </div>
      ) : null}

      {showSelectedCard && selectedCliente ? (
        <ClienteInfoCard cliente={selectedCliente} onClear={onClear} clearLabel={clearLabel} />
      ) : null}

      {showSelectedCard && !selectedCliente ? (
        <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Consumidor final</p>
          <p className="text-xs text-muted-foreground mt-1">
            Buscá un cliente para ver sus datos y facturar con su condición fiscal.
          </p>
        </div>
      ) : null}
    </div>
  )
}

export interface ClienteInfoCardProps {
  cliente: Cliente
  onClear?: () => void
  clearLabel?: string
  compact?: boolean
  className?: string
}

export function ClienteInfoCard({
  cliente,
  onClear,
  clearLabel = "Cambiar cliente",
  compact = false,
  className,
}: ClienteInfoCardProps) {
  const details = getClienteDisplayDetails(cliente)
  const cuit = formatClienteCuitDisplay(cliente)
  const ubicacionParts = getClienteUbicacionParts(cliente)
  const hasUbicacion = Boolean(ubicacionParts.address || ubicacionParts.city)

  return (
    <div
      className={cn(
        "rounded-lg border bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden",
        className
      )}
    >
      <div className={cn("flex items-start gap-3", compact ? "p-3" : "p-4")}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm">
          {getClienteInitials(cliente.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-snug">{getClienteDisplayName(cliente)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {cliente.code?.trim() ? (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {cliente.code.trim()}
                  </Badge>
                ) : null}
                {cliente.tax_condition ? (
                  <Badge variant="secondary" className="text-[10px]">
                    {formatTaxConditionLabel(cliente.tax_condition)}
                  </Badge>
                ) : null}
                {cliente.client_type ? (
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {cliente.client_type}
                  </Badge>
                ) : null}
              </div>
            </div>
            {onClear ? (
              <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={onClear}>
                {clearLabel}
              </Button>
            ) : null}
          </div>

          {hasUbicacion ? (
            <ClienteUbicacion cliente={cliente} variant="default" className="mt-2.5" />
          ) : null}

          {!compact && details.length > 0 ? (
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {details
                .filter((detail) => detail.label !== "Ubicación")
                .map((detail) => (
                  <div key={detail.label} className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{detail.label}</dt>
                    <dd
                      className={cn(
                        "text-xs font-medium truncate",
                        detail.mono && "font-mono"
                      )}
                      title={detail.value}
                    >
                      {detail.value}
                    </dd>
                  </div>
                ))}
            </dl>
          ) : compact ? (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {cuit ? <span className="font-mono">{cuit}</span> : null}
              {cliente.phone?.trim() ? (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {cliente.phone.trim()}
                </span>
              ) : null}
              {cliente.email?.trim() ? (
                <span className="inline-flex items-center gap-1 truncate max-w-[200px]">
                  <Mail className="h-3 w-3 shrink-0" />
                  {cliente.email.trim()}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {!compact && cliente.personeria === "persona_juridica" ? (
        <div className="border-t bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          Persona jurídica — verificá CUIT y condición fiscal antes de emitir.
        </div>
      ) : null}
    </div>
  )
}
