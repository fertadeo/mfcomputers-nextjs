"use client"

import { Alert } from "@/components/ui/alert"
import { labelCondicionIvaReceptor } from "@/lib/facturacion-cliente-fiscal"
import type { FacturacionErrorInfo } from "@/lib/facturacion-errors"
import { formatFacturacionErrorForUi } from "@/lib/facturacion-errors"

export interface FacturacionErrorAlertProps {
  info: FacturacionErrorInfo
  title?: string | null
  requestId?: string | null
  className?: string
}

function formatDocTipo(docTipo?: number): string {
  if (docTipo === 80) return "80 (CUIT/CUIL)"
  if (docTipo === 99) return "99 (sin documento / CF)"
  if (docTipo == null) return "—"
  return String(docTipo)
}

export function FacturacionErrorAlert({
  info,
  title,
  requestId,
  className,
}: FacturacionErrorAlertProps) {
  const summary = formatFacturacionErrorForUi(info, requestId)
  const ctx = info.receptorContext

  return (
    <Alert
      variant={info.severity === "warning" ? "warning" : "error"}
      title={title ?? info.title ?? "No se pudo completar la facturación"}
      className={className}
      description={
        <div className="space-y-3 text-sm">
          <p className="leading-relaxed">{summary}</p>

          {info.diagnosis ? (
            <div className="rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                Causa probable
              </p>
              <p className="mt-1 text-amber-950 dark:text-amber-100">{info.diagnosis}</p>
            </div>
          ) : null}

          {ctx &&
          (ctx.docTipo != null ||
            ctx.docNro != null ||
            ctx.condicionIvaReceptor != null ||
            ctx.tipoComprobante != null) ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
              <p className="mb-1 font-sans text-xs font-semibold">Receptor enviado al facturador</p>
              <ul className="space-y-0.5">
                {ctx.docTipo != null ? (
                  <li>
                    docTipo: {formatDocTipo(ctx.docTipo)}
                    {ctx.docNro != null && ctx.docNro !== 0 ? ` · docNro: ${ctx.docNro}` : ""}
                  </li>
                ) : null}
                {ctx.condicionIvaReceptor != null ? (
                  <li>
                    condición IVA: {ctx.condicionIvaReceptor} (
                    {ctx.condicionLabel ?? labelCondicionIvaReceptor(ctx.condicionIvaReceptor)})
                  </li>
                ) : null}
                {ctx.tipoComprobante != null ? <li>tipo comprobante: {ctx.tipoComprobante}</li> : null}
              </ul>
            </div>
          ) : null}

          {info.remoteDetail ? (
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground">Detalle ARCA / facturador</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-xs">{info.remoteDetail}</p>
            </div>
          ) : null}

          {info.issues && info.issues.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4 text-xs">
              {info.issues.map((issue, i) => (
                <li key={`${issue.code ?? "issue"}-${i}`}>{issue.message}</li>
              ))}
            </ul>
          ) : null}

          {info.suggestions && info.suggestions.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Qué podés hacer</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                {info.suggestions.map((s, i) => (
                  <li key={`sug-${i}`}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {info.code ? (
            <p className="text-muted-foreground text-xs font-mono">Código: {info.code}</p>
          ) : null}

          {info.blockBlindReemit ? (
            <p className="text-xs font-medium">
              No reemitas con un número nuevo hasta reconciliar con soporte o MultiCUIT.
            </p>
          ) : null}
        </div>
      }
    />
  )
}
