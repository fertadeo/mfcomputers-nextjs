"use client"

import Link from "next/link"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { CategoryAdjustmentPanel } from "@/components/product-pricing/category-adjustment-panel"
import { DollarAdjustmentPanel } from "@/components/product-pricing/dollar-adjustment-panel"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Percent, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

export default function ActualizacionPreciosPage() {
  const router = useRouter()

  const handleApplied = () => {
    router.refresh()
  }

  return (
    <Protected requiredRoles={["gerencia"]}>
      <ERPLayout activeItem="actualizacion-precios">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
                <Link href="/productos">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a productos
                </Link>
              </Button>
              <h1 className="text-3xl font-bold">Actualización de precios</h1>
              <p className="text-muted-foreground max-w-2xl">
                Ajuste masivo por porcentaje según categorías o por variación del dólar oficial (ARS).
                Solo productos activos. Confirmá cada operación antes de aplicar.
              </p>
            </div>
          </div>

          <Tabs defaultValue="categoria" className="w-full">
            <TabsList>
              <TabsTrigger value="categoria" className="gap-2">
                <Percent className="h-4 w-4" />
                Por categoría
              </TabsTrigger>
              <TabsTrigger value="dolar" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Por dólar
              </TabsTrigger>
            </TabsList>
            <TabsContent value="categoria" className="mt-6">
              <CategoryAdjustmentPanel onApplied={handleApplied} />
            </TabsContent>
            <TabsContent value="dolar" className="mt-6">
              <DollarAdjustmentPanel onApplied={handleApplied} />
            </TabsContent>
          </Tabs>
        </div>
      </ERPLayout>
    </Protected>
  )
}
