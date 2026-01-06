import { getApiUrl } from '@/config/api'

/**
 * Helper para realizar fetch autenticado con JWT
 * Agrega automáticamente el header Authorization: Bearer <token>
 * Maneja errores 401, 403, 400 según el backend
 */

/**
 * Realiza un fetch autenticado con el token JWT del localStorage
 * @param path Ruta relativa a la API (ej: '/auth/login', '/products')
 * @param init Opciones de fetch (method, headers, body, etc.)
 * @returns Promise<Response>
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  // Obtener el token del localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
  
  // Configurar headers
  const headers = new Headers(init?.headers || {})
  
  // Agregar token si existe
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  
  // Agregar Content-Type por defecto si no está especificado
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }
  
  // Construir URL completa usando getApiUrl que normaliza la URL
  const apiUrl = getApiUrl()
  // Asegurar que path empiece con '/' para concatenación correcta
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const fullUrl = `${apiUrl}${cleanPath}`
  
  console.log('🌐 [API_FETCH] Enviando request:', {
    url: fullUrl,
    method: init?.method || 'GET',
    hasToken: !!token
  })
  
  try {
    const response = await fetch(fullUrl, {
      ...init,
      headers
    })
    
    console.log('📥 [API_FETCH] Respuesta recibida:', {
      url: fullUrl,
      status: response.status,
      ok: response.ok
    })
    
    // Manejar errores específicos según el backend
    if (!response.ok) {
      await handleApiError(response, fullUrl)
    }
    
    return response
  } catch (error) {
    console.error('💥 [API_FETCH] Error en fetch:', {
      url: fullUrl,
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
    throw error
  }
}

/**
 * Maneja errores de la API según los códigos de estado del backend
 * @param response Respuesta de fetch
 * @param url URL de la petición para logging
 */
async function handleApiError(response: Response, url: string): Promise<never> {
  let errorMessage = 'Error en la petición'
  
  try {
    const errorData = await response.json()
    errorMessage = errorData.message || errorData.error || errorMessage
    
    console.error('❌ [API_FETCH] Error del backend:', {
      url,
      status: response.status,
      message: errorMessage,
      data: errorData
    })
  } catch {
    // Si no se puede parsear el JSON, usar el mensaje por defecto
    console.error('❌ [API_FETCH] Error sin JSON:', {
      url,
      status: response.status,
      statusText: response.statusText
    })
  }
  
  // Manejar errores específicos según el backend
  switch (response.status) {
    case 401:
      // Token inválido o expirado - limpiar sesión
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        
        // Redirigir al login si no estamos ya ahí
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
      
    case 403:
      // Rol insuficiente
      throw new Error('No tienes permisos para realizar esta acción.')
      
    case 400:
      // Error de validación
      throw new Error(errorMessage || 'Error de validación en los datos enviados.')
      
    case 404:
      // Recurso no encontrado
      throw new Error('El recurso solicitado no fue encontrado.')
      
    case 500:
      // Error del servidor
      throw new Error('Error interno del servidor. Por favor, intenta nuevamente.')
      
    default:
      // Otros errores
      throw new Error(errorMessage || `Error ${response.status}: ${response.statusText}`)
  }
}

/**
 * Helper para realizar GET autenticado
 * @param path Ruta de la API
 * @returns Promise<Response>
 */
export async function apiGet(path: string): Promise<Response> {
  return apiFetch(path, { method: 'GET' })
}

/**
 * Helper para realizar POST autenticado
 * @param path Ruta de la API
 * @param body Datos a enviar (se serializa automáticamente a JSON)
 * @returns Promise<Response>
 */
export async function apiPost(path: string, body?: any): Promise<Response> {
  return apiFetch(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  })
}

/**
 * Helper para realizar PUT autenticado
 * @param path Ruta de la API
 * @param body Datos a enviar (se serializa automáticamente a JSON)
 * @returns Promise<Response>
 */
export async function apiPut(path: string, body?: any): Promise<Response> {
  return apiFetch(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined
  })
}

/**
 * Helper para realizar DELETE autenticado
 * @param path Ruta de la API
 * @returns Promise<Response>
 */
export async function apiDelete(path: string): Promise<Response> {
  return apiFetch(path, { method: 'DELETE' })
}

