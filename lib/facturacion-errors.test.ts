import { describe, expect, it } from "vitest"
import { buildFacturacionErrorDiagnosis, resolveFacturacionErrorFromExtracted } from "@/lib/facturacion-errors"

describe("facturacion-errors diagnosis", () => {
  it("diagnostica CUIT + consumidor final", () => {
    const diagnosis = buildFacturacionErrorDiagnosis({
      code: "RECEPTOR_CUIT_CONDICION_INVALIDA",
      receptorContext: { docTipo: 80, docNro: 20355026656, condicionIvaReceptor: 5 },
    })
    expect(diagnosis).toMatch(/docTipo 80/)
  })

  it("resuelve error ARCA 10056 con mensaje de condición IVA", () => {
    const info = resolveFacturacionErrorFromExtracted({
      code: "10056",
      message: "Condicion IVA receptor invalida",
      remoteDetail: "Observacion 10056",
    })
    expect(info.title).toMatch(/Condición IVA/)
    expect(info.diagnosis).toMatch(/condición IVA/i)
    expect(info.remoteDetail).toBe("Observacion 10056")
  })

  it("extrae issues de validación desde data", () => {
    const info = resolveFacturacionErrorFromExtracted({
      code: "RECEPTOR_CUIT_CONDICION_INVALIDA",
      message: "Con CUIT/CUIL del receptor",
      issues: [{ code: "RECEPTOR_CUIT_CONDICION_INVALIDA", message: "Detalle issue" }],
      sugerencias: ["Consultá padrón ARCA"],
    })
    expect(info.issues?.[0]?.message).toBe("Detalle issue")
    expect(info.suggestions).toContain("Consultá padrón ARCA")
  })
})
