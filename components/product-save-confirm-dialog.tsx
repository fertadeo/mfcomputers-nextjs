"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Package } from "lucide-react"
import type { ProductListTabKey } from "@/lib/product-list-destination"
import { destinationTabLabel } from "@/lib/product-list-destination"

export interface ProductSaveConfirmDialogProps {
  open: boolean
  productName: string
  destination: ProductListTabKey
  explanationLines: string[]
  onConfirm: () => void
  onCancel: () => void
}

export function ProductSaveConfirmDialog({
  open,
  productName,
  destination,
  explanationLines,
  onConfirm,
  onCancel,
}: ProductSaveConfirmDialogProps) {
  const tab = destinationTabLabel(destination)

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel()
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg z-[100]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 shrink-0" />
            Confirmar guardado
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-foreground">
              <p>
                Tu producto{" "}
                <span className="font-semibold">
                  {productName.trim() || "sin nombre"}
                </span>{" "}
                se guardará y lo verás en la pestaña{" "}
                <span className="font-semibold">«{tab}»</span>
                {destination === "published"
                  ? " (producto publicado / activo en el listado de publicados)"
                  : destination === "draft"
                    ? " (borrador: activo pero sin stock vendible sin encargo)"
                    : " (eliminados: producto inactivo)"}
                .
              </p>
              <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                {explanationLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <p className="font-medium text-foreground">¿Deseas continuar?</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0 flex-col-reverse sm:flex-row">
          <Button type="button" variant="outline" onClick={onCancel}>
            No, volver atrás
          </Button>
          <Button type="button" onClick={onConfirm}>
            Sí, continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
