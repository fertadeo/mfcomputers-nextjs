import { describe, expect, it } from "vitest"
import { renderRepairOrderTechnicalReportPdf } from "@/lib/generate-repair-order-technical-report-pdf"

describe("renderRepairOrderTechnicalReportPdf", () => {
  it("arma un informe sin tabla de precios y con el texto del técnico", () => {
    const report = "No conviene reparar el equipo. Recomendamos comprar uno nuevo por falta de insumos."
    const doc = renderRepairOrderTechnicalReportPdf({
      repair_number: "REP-202611-0007",
      emission_date: "2026-11-20",
      reception_date: "2026-11-18",
      clientName: "Ana Perez",
      clientPhone: "2954000000",
      equipment_description: "Marca y modelo: Lenovo IdeaPad\nTipo de equipo: Notebook\nN.º de serie: ABC123",
      customer_declared_fault: "No enciende",
      technical_report: report,
    })

    const raw = Buffer.from(doc.output("arraybuffer")).toString("latin1")
    expect(doc.getNumberOfPages()).toBeGreaterThan(0)
    expect(raw).toContain("INFORME")
    expect(raw).toContain("Sin cargo")
    expect(raw).toContain("Recomendamos comprar uno nuevo")
    expect(raw).toContain("20-33998594-5")
    expect(raw).toContain("2954598391")
    expect(raw).not.toContain("TOTAL ESTIMADO")
    expect(raw).not.toContain("P. unit.")
  })

  it("continúa en otra hoja cuando el informe es largo", () => {
    const paragraph = "El equipo presenta un daño que no justifica el costo de la reparacion. "
    const doc = renderRepairOrderTechnicalReportPdf({
      repair_number: "REP-202611-0008",
      emission_date: "2026-11-20",
      reception_date: "2026-11-18",
      clientName: "Cliente largo",
      equipment_description: "Equipo legacy sin formato",
      technical_report: paragraph.repeat(80),
    })

    expect(doc.getNumberOfPages()).toBeGreaterThan(1)
  })
})
