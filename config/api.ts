// Configuración de la API
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8086/api/',
} as const;

// Función para obtener la URL base de la API
export function getApiUrl(): string {
  let url = API_CONFIG.BASE_URL;
  // Asegurar que la URL siempre termine con '/' para evitar problemas de concatenación
  if (!url.endsWith('/')) {
    url = url + '/';
  }
  console.log('🔧 [CONFIG] Obteniendo URL de la API:', {
    envVar: process.env.NEXT_PUBLIC_API_URL,
    finalUrl: url,
    hasEnvVar: !!process.env.NEXT_PUBLIC_API_URL
  });
  return url;
}
