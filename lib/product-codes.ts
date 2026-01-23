/**
 * Utilidades para generar códigos de barras y QR para productos
 */

/**
 * Genera un código de barras basado en el SKU del producto
 * Usa Code128 que es compatible con la mayoría de lectoras
 * @param sku - El código SKU del producto
 * @returns El código de barras (mismo que el SKU, formateado para Code128)
 */
export function generateBarcode(sku: string): string {
  // El código de barras será el mismo SKU, pero lo normalizamos
  // eliminando caracteres especiales que no son compatibles con Code128
  // Code128 puede manejar letras, números y algunos caracteres especiales
  return sku.toUpperCase().replace(/[^A-Z0-9\-_]/g, '')
}

/**
 * Genera la URL del código QR para consulta pública del producto
 * Prioriza la URL de WooCommerce si está disponible
 * @param code - El código SKU del producto
 * @param woocommerceId - ID del producto en WooCommerce (opcional)
 * @param woocommerceSlug - Slug del producto en WooCommerce (opcional)
 * @returns URL completa para el código QR
 */
export function generateQRCodeUrl(
  code: string, 
  woocommerceId?: number | null, 
  woocommerceSlug?: string | null
): string {
  // Obtener la URL base de WooCommerce
  const woocommerceBaseUrl = process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || ''
  
  // Si hay información de WooCommerce, construir URL de WooCommerce
  if (woocommerceBaseUrl) {
    // Priorizar slug si está disponible (URL más amigable)
    if (woocommerceSlug) {
      return `${woocommerceBaseUrl}/producto/${woocommerceSlug}`
    }
    // Si hay ID pero no slug, usar ID
    if (woocommerceId) {
      return `${woocommerceBaseUrl}/?p=${woocommerceId}`
    }
  }
  
  // Fallback: URL del sistema propio (si no hay WooCommerce)
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  
  return `${baseUrl}/productos/${encodeURIComponent(code)}`
}

/**
 * Genera tanto el código de barras como la URL del QR para un producto
 * @param sku - El código SKU del producto
 * @param woocommerceId - ID del producto en WooCommerce (opcional)
 * @param woocommerceSlug - Slug del producto en WooCommerce (opcional)
 * @returns Objeto con barcode y qr_code
 */
export function generateProductCodes(
  sku: string, 
  woocommerceId?: number | null, 
  woocommerceSlug?: string | null
): { barcode: string; qr_code: string } {
  return {
    barcode: generateBarcode(sku),
    qr_code: generateQRCodeUrl(sku, woocommerceId, woocommerceSlug)
  }
}
