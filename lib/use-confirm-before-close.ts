"use client"

/**
 * Hook para modales: al intentar cerrar (clic fuera, Escape o X) muestra
 * "¿Quieres cerrar esta ventana?" y solo cierra si el usuario confirma.
 * Evita perder datos que se estaban cargando por cierre accidental.
 */
export function useConfirmBeforeClose(
  onOpenChange: (open: boolean) => void,
  message = "¿Quieres cerrar esta ventana?"
): (open: boolean) => void {
  return (open: boolean) => {
    if (open === false) {
      if (!window.confirm(message)) return
    }
    onOpenChange(open)
  }
}
