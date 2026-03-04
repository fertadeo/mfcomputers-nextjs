import { getApiUrl } from '@/config/api';

// Función helper para obtener el token de autenticación
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

// Función helper para obtener headers de autenticación
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Tipos para autenticación
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string; // Solo si NO se usan cookies
  user: {
    id: number;
    username: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export interface AuthApiResponse {
  success: boolean;
  message: string;
  data: LoginResponse;
  error?: string;
  timestamp: string;
}

// Tipos para los datos de la API
export interface Cliente {
  id: number;
  code: string;
  client_type: "minorista" | "mayorista" | "personalizado";
  sales_channel: "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_mf" | "manual" | "otro";
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  is_active: number; // 1 = activo, 0 = inactivo
  created_at: string;
  updated_at: string;
  primary_tax_id?: string;
  secondary_tax_id?: string;
  /** personeria: persona_fisica | persona_juridica | consumidor_final (API nueva) */
  personeria?: "persona_fisica" | "persona_juridica" | "consumidor_final";
  /** CUIL o CUIT 11 dígitos (API nueva) */
  cuil_cuit?: string | null;
  person_type?: "persona_fisica" | "persona_juridica";
  tax_condition?: "inscripto" | "consumidor_final" | "monotributo" | "responsable_inscripto" | "exento";
}

export interface ClientesResponse {
  clients: Cliente[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClienteStats {
  total_clients: number;
  active_clients: string;
  inactive_clients: string;
  cities_count: number;
  countries_count: number;
  /** Clientes creados en el último mes (opcional, si el backend lo expone) */
  created_last_month?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// Función para obtener todos los clientes con filtros opcionales
export async function getClientes(
  page: number = 1, 
  limit: number = 10,
  search?: string,
  status?: 'active' | 'inactive',
  city?: string
): Promise<ClientesResponse> {
  const apiUrl = getApiUrl();
  
  // Construir query params
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  
  if (search && search.trim()) {
    params.append('search', search.trim());
  }
  
  if (status) {
    params.append('status', status);
  }
  
  if (city && city.trim()) {
    params.append('city', city.trim());
  }
  
  const fullUrl = `${apiUrl}clients?${params.toString()}`;
  
  console.log('🔍 [API] Iniciando llamada a getClientes()');
  console.log('🌐 [API] URL completa:', fullUrl);
  console.log('⚙️ [API] Configuración:', { apiUrl, fullUrl, filters: { search, status, city } });

  try {
    console.log('📡 [API] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('📥 [API] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al obtener clientes: ${response.status} ${response.statusText}`);
    }

    const responseData: ApiResponse<ClientesResponse> = await response.json();
    console.log('✅ [API] Datos de clientes recibidos:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      fullResponse: responseData,
      clients: responseData.data?.clients,
      pagination: responseData.data?.pagination
    });
    
    // Devolver la respuesta completa con paginación
    return responseData.data || { clients: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  } catch (error) {
    console.error('💥 [API] Error al obtener clientes:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para obtener estadísticas de clientes
export async function getClienteStats(): Promise<ClienteStats> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}clients/stats`;
  
  console.log('📊 [API] Iniciando llamada a getClienteStats()');
  console.log('🌐 [API] URL completa:', fullUrl);
  console.log('⚙️ [API] Configuración:', { apiUrl, fullUrl });

  try {
    console.log('📡 [API] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    console.log('📥 [API] Respuesta de estadísticas recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta de estadísticas:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al obtener estadísticas: ${response.status} ${response.statusText}`);
    }

    const responseData: ApiResponse<ClienteStats> = await response.json();
    console.log('✅ [API] Datos de estadísticas recibidos:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      fullResponse: responseData,
      data: responseData.data
    });
    
    // Extraer solo los datos del campo 'data'
    return responseData.data;
  } catch (error) {
    console.error('💥 [API] Error al obtener estadísticas:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Extrae mensaje de error de respuesta API (400, 422, etc.)
async function getApiErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const json = JSON.parse(text) as { message?: string; error?: string; errors?: Record<string, string> };
    if (typeof json.message === 'string') return json.message;
    if (typeof json.error === 'string') return json.error;
    if (json.errors && typeof json.errors === 'object') {
      const first = Object.values(json.errors)[0];
      if (typeof first === 'string') return first;
    }
  } catch {
    // no JSON
  }
  return text || `Error ${response.status} ${response.statusText}`;
}

// Función para crear un nuevo cliente
export async function createCliente(clienteData: {
  client_type: "minorista" | "mayorista" | "personalizado";
  sales_channel: "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_mf" | "manual" | "otro";
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  personeria?: "persona_fisica" | "persona_juridica" | "consumidor_final";
  cuil_cuit?: string | null;
}): Promise<any> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}clients`;
  
  console.log('🆕 [API] Iniciando llamada a createCliente()');
  console.log('🌐 [API] URL completa:', fullUrl);
  console.log('📋 [API] Datos del cliente:', clienteData);

  try {
    console.log('📡 [API] Enviando request POST a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(clienteData)
    });

    console.log('📥 [API] Respuesta de creación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const msg = await getApiErrorMessage(response);
      console.error('❌ [API] Error en respuesta de creación:', { status: response.status, msg });
      throw new Error(msg);
    }

    const data = await response.json();
    console.log('✅ [API] Cliente creado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('💥 [API] Error al crear cliente:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para eliminar un cliente (soft/hard delete automático)
export async function deleteCliente(id: number): Promise<any> {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}clients/${id}`;
    
    console.log('🗑️ [API] Eliminando cliente:', {
      url: url,
      id: id,
      method: 'DELETE'
    });

    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    console.log('📡 [API] Respuesta de eliminación:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      throw new Error(`Error al eliminar cliente: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [API] Cliente eliminado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('💥 [API] Error al eliminar cliente:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para actualizar un cliente existente
export async function updateCliente(id: number, clienteData: {
  client_type: "minorista" | "mayorista" | "personalizado";
  sales_channel: "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_mf" | "manual" | "otro";
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  personeria?: "persona_fisica" | "persona_juridica" | "consumidor_final";
  cuil_cuit?: string | null;
}): Promise<any> {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}clients/${id}`;
    // Enviar nombres nuevos (personeria, cuil_cuit) y legacy (person_type, primary_tax_id) por si el backend solo acepta uno u otro
    const body: Record<string, unknown> = {
      client_type: clienteData.client_type,
      sales_channel: clienteData.sales_channel,
      name: clienteData.name,
      email: clienteData.email,
      phone: clienteData.phone,
      address: clienteData.address,
      city: clienteData.city,
      country: clienteData.country,
      personeria: clienteData.personeria,
      cuil_cuit: clienteData.cuil_cuit ?? null
    }
    if (clienteData.personeria != null && clienteData.personeria !== "consumidor_final") {
      body.person_type = clienteData.personeria
    }
    if (clienteData.cuil_cuit != null && clienteData.cuil_cuit !== "") {
      body.primary_tax_id = clienteData.cuil_cuit
    }
    
    console.log('🔄 [API] Actualizando cliente:', {
      url: url,
      id: id,
      body: body,
      method: 'PUT'
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body)
    });

    console.log('📡 [API] Respuesta de actualización:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const msg = await getApiErrorMessage(response);
      console.error('❌ [API] Error en respuesta:', { status: response.status, msg });
      throw new Error(msg);
    }

    const data = await response.json();
    console.log('✅ [API] Cliente actualizado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('💥 [API] Error al actualizar cliente:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Interfaces para estadísticas de productos
export interface ProductStats {
  total_products: number;
  active_products: string;
  total_stock_quantity: number;   // SUM(stock) — total de unidades en stock
  total_stock_value: string;      // SUM(stock * price) — valor total del inventario
  average_price: string;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface ProductStatsResponse {
  success: boolean;
  message: string;
  data: ProductStats;
  timestamp: string;
}

// Interfaces para productos
export interface Product {
  id: number
  code: string
  name: string
  description?: string
  category_id?: number
  category_name?: string
  price: number
  stock: number
  min_stock: number
  max_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
  image_url?: string  // URL de imagen desde la API
  woocommerce_image_url?: string  // URL específica de WooCommerce
  woocommerce_id?: number  // ID del producto en WooCommerce (si existe)
  woocommerce_slug?: string | null  // Slug del producto en WooCommerce (para URL amigable)
  images?: string[]  // Array de URLs de imágenes del producto
  woocommerce_image_ids?: number[]  // IDs de medios en WordPress para sincronizar con WooCommerce
  barcode?: string  // Código de barras del producto (para lectoras)
  qr_code?: string  // URL del código QR para consulta pública
  deleted_at?: string | null  // Soft delete: si existe, el producto está en papelera
}

export interface CreateProductData {
  code: string
  name: string
  description?: string | null
  category_id?: number | null
  price: number
  stock?: number
  min_stock?: number
  max_stock?: number
  is_active?: boolean
  images?: string[] | null
  woocommerce_image_ids?: number[] | null  // IDs de medios en WordPress (mismo orden que images)
  barcode?: string | null  // Código de barras del producto
  qr_code?: string | null  // URL del código QR para consulta pública
  sync_to_woocommerce?: boolean  // Sincronizar con WooCommerce al crear
}

export interface UpdateProductData {
  code?: string
  name?: string
  description?: string | null
  category_id?: number | null
  price?: number
  stock?: number
  min_stock?: number
  max_stock?: number
  is_active?: boolean
  images?: string[] | null
  woocommerce_image_ids?: number[] | null  // IDs de medios en WordPress (mismo orden que images)
  barcode?: string | null
  qr_code?: string | null
  sync_to_woocommerce?: boolean  // Sincronizar con WooCommerce al actualizar
}

export interface UpdateStockData {
  stock: number
  operation?: 'set' | 'add' | 'subtract'
}

export interface ProductsResponse {
  success: boolean
  message: string
  data: Product[] | {
    products: Product[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
  timestamp: string
}

export interface ProductsPaginatedResponse {
  success: boolean
  message: string
  data: {
    products: Product[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
  error?: string
  timestamp: string
}

export interface ProductResponse {
  success: boolean
  message: string
  data: Product
  error?: string
  timestamp: string
}

// --- Ventas en local (Punto de venta) - POST /api/sales con x-api-key ---
export type SalePaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'

export interface CreateSaleItem {
  product_id: number
  quantity: number
  unit_price: number
}

export interface CreateSalePaymentDetails {
  efectivo?: number
  tarjeta?: number
  transferencia?: number
}

export interface CreateSaleRequest {
  items: CreateSaleItem[]
  payment_method: SalePaymentMethod
  client_id?: number
  payment_details?: CreateSalePaymentDetails
  notes?: string
  sync_to_woocommerce?: boolean
}

export interface SaleItemResponse {
  product_id: number
  quantity: number
  unit_price: number
  subtotal?: number
}

export interface SaleResponseData {
  id: number
  sale_number: string
  client_id: number | null
  total_amount: number
  payment_method: SalePaymentMethod
  sale_date: string
  sync_status?: string
  items: SaleItemResponse[]
  created_at: string
  updated_at: string
}

export interface CreateSaleResponse {
  success: boolean
  message: string
  data: SaleResponseData
  timestamp: string
}

/** API Key para punto de venta (localStorage 'posApiKey' o 'apiKey', o NEXT_PUBLIC_POS_API_KEY). Requerida para POST /api/sales. */
export function getPosApiKey(): string | null {
  if (typeof window === 'undefined') return null
  const fromStorage = localStorage.getItem('posApiKey') || localStorage.getItem('apiKey')
  if (fromStorage) return fromStorage
  const fromEnv = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_POS_API_KEY
  return fromEnv ? (process.env.NEXT_PUBLIC_POS_API_KEY ?? null) : null
}

/**
 * Crea una venta en local físico (POST /api/sales).
 * Autenticación: JWT (Authorization: Bearer) o API Key (x-api-key). Al menos uno requerido.
 * El backend descuenta stock en el ERP y, si aplica, sincroniza con WooCommerce.
 */
export async function createSale(body: CreateSaleRequest): Promise<SaleResponseData> {
  const apiUrl = getApiUrl()
  const fullUrl = `${apiUrl}sales`
  const token = getAccessToken()
  const apiKey = getPosApiKey()

  if (!token && !apiKey) {
    throw new Error(
      'Autenticación requerida: iniciá sesión o configurá la API Key para punto de venta en Configuración.'
    )
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        'No autorizado. Verificá que estés logueado (JWT) o que el header x-api-key sea correcto.'
      )
    }
    if (response.status === 404) {
      throw new Error(
        'No se encontró POST /api/sales. Revisá que la URL base del frontend apunte al mismo host/puerto de la API.'
      )
    }
    const msg = data?.message || data?.error || `Error ${response.status}`
    throw new Error(msg)
  }

  if (!data?.success || !data?.data) {
    throw new Error(data?.message || 'Error al crear la venta')
  }

  return data.data
}

// Función para crear un nuevo producto
export async function createProduct(productData: CreateProductData): Promise<any> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products`
    
    console.log('🆕 [API] Iniciando llamada a createProduct()')
    console.log('🌐 [API] URL completa:', fullUrl)
    console.log('📋 [API] Datos del producto:', productData)

    // Crear FormData para enviar archivos
    const formData = new FormData()
    
    // Agregar datos del formulario
    formData.append('code', productData.code)
    formData.append('name', productData.name)
    if (productData.description) {
      formData.append('description', productData.description)
    }
    if (productData.category_id) {
      formData.append('category_id', productData.category_id.toString())
    }
    formData.append('price', productData.price.toString())
    formData.append('stock', (productData.stock ?? 0).toString())
    formData.append('min_stock', (productData.min_stock ?? 0).toString())
    formData.append('max_stock', (productData.max_stock ?? 0).toString())
    formData.append('is_active', (productData.is_active ?? true).toString())

    // Agregar código de barras si existe
    if (productData.barcode) {
      formData.append('barcode', productData.barcode)
    }

    // Agregar código QR si existe
    if (productData.qr_code) {
      formData.append('qr_code', productData.qr_code)
    }

    // Agregar imágenes si existen
    if (productData.images && productData.images.length > 0) {
      productData.images.forEach((image, index) => {
        formData.append(`images[]`, image)
      })
    }

    console.log('📡 [API] Enviando request POST a:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      body: formData
    })

    console.log('📥 [API] Respuesta de creación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error en respuesta de creación:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`Error al crear producto: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✅ [API] Producto creado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    })
    
    return data
  } catch (error) {
    console.error('💥 [API] Error al crear producto:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

// Función para obtener categorías de productos
export async function getCategories(): Promise<Category[]> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}categories`
    
    console.log('📂 [API] Iniciando llamada a getCategories()')
    console.log('🌐 [API] URL completa:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getCategoryHeaders(),
    })

    console.log('📥 [API] Respuesta de categorías recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error en respuesta de categorías:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`Error al obtener categorías: ${response.status} ${response.statusText}`)
    }

    const responseData: ApiResponse<{ categories: Category[] }> = await response.json()
    console.log('✅ [API] Categorías recibidas:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      data: responseData.data
    })
    
    return responseData.data?.categories || []
  } catch (error) {
    console.error('💥 [API] Error al obtener categorías:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

export interface Category {
  id: number
  name: string
  description?: string
  parent_id?: number | null
  is_active?: boolean
  woocommerce_id?: number | null
  woocommerce_slug?: string | null
  created_at: string
  updated_at: string
}

// Función helper para obtener headers con API Key (categorías y endpoints que requieren X-API-Key)
function getCategoryHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const apiKey =
    (typeof window !== 'undefined' && localStorage.getItem('apiKey')) ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_KEY);

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Interfaz para crear categoría
export interface CreateCategoryData {
  name: string
  description?: string
  parent_id?: number | null
  woocommerce_id?: number | null
  woocommerce_slug?: string | null
}

// Interfaz para actualizar categoría
export interface UpdateCategoryData {
  name?: string
  description?: string
  parent_id?: number | null
  is_active?: boolean
  woocommerce_id?: number | null
  woocommerce_slug?: string | null
}

// Función para crear una categoría
export async function createCategory(categoryData: CreateCategoryData): Promise<Category> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}categories`
    
    console.log('📂 [API] Creando categoría:', categoryData)
    console.log('🌐 [API] URL completa:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getCategoryHeaders(),
      body: JSON.stringify(categoryData)
    })

    console.log('📥 [API] Respuesta de creación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error al crear categoría:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      
      let errorMessage = `Error al crear categoría: ${response.status} ${response.statusText}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch {
        // Si no se puede parsear, usar el mensaje por defecto
      }
      
      throw new Error(errorMessage)
    }

    const responseData: ApiResponse<{ category: Category }> = await response.json()
    console.log('✅ [API] Categoría creada exitosamente:', responseData.data?.category)
    
    return responseData.data?.category!
  } catch (error) {
    console.error('💥 [API] Error al crear categoría:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
    throw error
  }
}

// Función para actualizar una categoría
export async function updateCategory(id: number, categoryData: UpdateCategoryData): Promise<Category> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}categories/${id}`
    
    console.log('📂 [API] Actualizando categoría:', { id, data: categoryData })
    console.log('🌐 [API] URL completa:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: getCategoryHeaders(),
      body: JSON.stringify(categoryData)
    })

    console.log('📥 [API] Respuesta de actualización recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error al actualizar categoría:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      
      let errorMessage = `Error al actualizar categoría: ${response.status} ${response.statusText}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch {
        // Si no se puede parsear, usar el mensaje por defecto
      }
      
      throw new Error(errorMessage)
    }

    const responseData: ApiResponse<{ category: Category }> = await response.json()
    console.log('✅ [API] Categoría actualizada exitosamente:', responseData.data?.category)
    
    return responseData.data?.category!
  } catch (error) {
    console.error('💥 [API] Error al actualizar categoría:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
    throw error
  }
}

// Función para eliminar una categoría (soft delete)
export async function deleteCategory(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}categories/${id}`
    
    console.log('📂 [API] Eliminando categoría:', id)
    console.log('🌐 [API] URL completa:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getCategoryHeaders()
    })

    console.log('📥 [API] Respuesta de eliminación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [API] Error al eliminar categoría:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      
      let errorMessage = `Error al eliminar categoría: ${response.status} ${response.statusText}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch {
        // Si no se puede parsear, usar el mensaje por defecto
      }
      
      throw new Error(errorMessage)
    }

    const responseData: ApiResponse<{ id: number; name: string; woocommerce_id: number | null }> = await response.json()
    console.log('✅ [API] Categoría eliminada exitosamente:', responseData.data)
  } catch (error) {
    console.error('💥 [API] Error al eliminar categoría:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido'
    })
    throw error
  }
}

// Función para obtener estadísticas de productos
export async function getProductStats(): Promise<ProductStats | null> {
  try {
    const apiUrl = getApiUrl();
    console.log('📊 [PRODUCT_STATS] Iniciando llamada a la API:', {
      url: `${apiUrl}products/stats`,
      timestamp: new Date().toISOString()
    });

    const token = getAccessToken()
    
    const response = await fetch(`${apiUrl}products/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    console.log('📊 [PRODUCT_STATS] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      url: response.url
    });

    if (!response.ok) {
      console.error('❌ [PRODUCT_STATS] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      })
      
      if (response.status === 401) {
        throw new Error('Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error('No tienes permisos para ver estadísticas de productos')
      }
      
      throw new Error(`Error al obtener estadísticas: ${response.status} ${response.statusText}`)
    }

    const responseData: ProductStatsResponse = await response.json();
    
    console.log('📊 [PRODUCT_STATS] Datos parseados:', {
      success: responseData.success,
      message: responseData.message,
      data: responseData.data,
      timestamp: responseData.timestamp
    });

    if (responseData.success && responseData.data) {
      console.log('📊 [PRODUCT_STATS] Estadísticas extraídas:', {
        totalProducts: responseData.data.total_products,
        activeProducts: responseData.data.active_products,
        totalStockQuantity: responseData.data.total_stock_quantity,
        totalStockValue: responseData.data.total_stock_value,
        averagePrice: responseData.data.average_price,
        lowStockCount: responseData.data.low_stock_count,
        outOfStockCount: responseData.data.out_of_stock_count
      });
      
      return responseData.data;
    } else {
      console.warn('📊 [PRODUCT_STATS] Respuesta no exitosa:', responseData);
      return null;
    }
  } catch (error) {
    console.error('📊 [PRODUCT_STATS] Error en la llamada:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Interfaces para proveedores
export interface Proveedor {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  contact_person?: string;
  tax_id?: string;
  is_active: number; // 1 = activo, 0 = inactivo
  created_at: string;
  updated_at: string;
}

export interface ProveedoresResponse {
  suppliers: Proveedor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProveedorStats {
  total_suppliers: number;
  active_suppliers: string;
  inactive_suppliers: string;
  cities_count: number;
  countries_count: number;
}

// Función para obtener todos los proveedores
export async function getProveedores(page: number = 1, limit: number = 10): Promise<ProveedoresResponse> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}suppliers?page=${page}&limit=${limit}`;
  
  console.log('🔍 [API] Iniciando llamada a getProveedores()');
  console.log('🌐 [API] URL completa:', fullUrl);

  try {
    console.log('📡 [API] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 [API] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al obtener proveedores: ${response.status} ${response.statusText}`);
    }

    const responseData: ApiResponse<ProveedoresResponse> = await response.json();
    console.log('✅ [API] Datos de proveedores recibidos:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      fullResponse: responseData,
      suppliers: responseData.data?.suppliers,
      pagination: responseData.data?.pagination
    });
    
    // Devolver la respuesta completa con paginación
    return responseData.data || { suppliers: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
  } catch (error) {
    console.error('💥 [API] Error al obtener proveedores:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para obtener estadísticas de proveedores
export async function getProveedorStats(): Promise<ProveedorStats> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}suppliers/stats`;
  
  console.log('📊 [API] Iniciando llamada a getProveedorStats()');
  console.log('🌐 [API] URL completa:', fullUrl);

  try {
    console.log('📡 [API] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 [API] Respuesta de estadísticas recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta de estadísticas:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al obtener estadísticas: ${response.status} ${response.statusText}`);
    }

    const responseData: ApiResponse<ProveedorStats> = await response.json();
    console.log('✅ [API] Datos de estadísticas recibidos:', {
      type: typeof responseData,
      isObject: typeof responseData === 'object' && responseData !== null,
      keys: typeof responseData === 'object' && responseData !== null ? Object.keys(responseData) : 'N/A',
      fullResponse: responseData,
      data: responseData.data
    });
    
    // Extraer solo los datos del campo 'data'
    return responseData.data;
  } catch (error) {
    console.error('💥 [API] Error al obtener estadísticas:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para crear un nuevo proveedor
export async function createProveedor(proveedorData: {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  contact_person?: string;
  tax_id?: string;
}): Promise<any> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}suppliers`;
  
  console.log('🆕 [API] Iniciando llamada a createProveedor()');
  console.log('🌐 [API] URL completa:', fullUrl);
  console.log('📋 [API] Datos del proveedor:', proveedorData);

  try {
    console.log('📡 [API] Enviando request POST a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proveedorData)
    });

    console.log('📥 [API] Respuesta de creación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta de creación:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error al crear proveedor: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [API] Proveedor creado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('💥 [API] Error al crear proveedor:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para actualizar un proveedor existente
export async function updateProveedor(id: number, proveedorData: {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  country: string;
  contact_person?: string;
  tax_id?: string;
}): Promise<any> {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}suppliers/${id}`;
    
    console.log('🔄 [API] Actualizando proveedor:', {
      url: url,
      id: id,
      proveedorData: proveedorData,
      method: 'PUT'
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proveedorData)
    });

    console.log('📡 [API] Respuesta de actualización:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      throw new Error(`Error al actualizar proveedor: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ [API] Proveedor actualizado exitosamente:', {
      type: typeof data,
      isObject: typeof data === 'object' && data !== null,
      keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('💥 [API] Error al actualizar proveedor:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para realizar login
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}auth/login`;
  
  console.log('🔐 [AUTH] Iniciando proceso de login');
  console.log('🌐 [AUTH] URL completa:', fullUrl);
  console.log('👤 [AUTH] Credenciales:', { username: credentials.username });

  try {
    console.log('📡 [AUTH] Enviando request POST a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    console.log('📥 [AUTH] Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    const text = await response.text();
    let responseData: { success?: boolean; message?: string; data?: { accessToken?: string; refreshToken?: string; user?: LoginResponse['user'] } };
    try {
      responseData = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error('❌ [AUTH] Respuesta no es JSON válido:', text?.slice(0, 300));
      throw new Error(
        response.ok
          ? 'Error inesperado del servidor. Intente de nuevo.'
          : `Error de conexión (${response.status}). Verifique que el servidor esté disponible e intente de nuevo.`
      );
    }

    if (!response.ok) {
      console.error('❌ [AUTH] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        responseData
      });
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Credenciales inválidas');
      }
      if (response.status === 404 || response.status >= 500) {
        throw new Error(responseData.message || `Error del servidor (${response.status}). Intente de nuevo más tarde.`);
      }
      throw new Error(responseData.message || `Error de autenticación: ${response.status} ${response.statusText}`);
    }

    const data = responseData.data ?? responseData as unknown as LoginResponse;
    const accessToken = data.accessToken ?? (responseData as { accessToken?: string }).accessToken;
    const refreshToken = data.refreshToken ?? (responseData as { refreshToken?: string }).refreshToken;
    const user = data.user ?? (responseData as { user?: LoginResponse['user'] }).user;

    if (!accessToken || !user) {
      throw new Error('La respuesta del servidor no contiene los datos esperados. Intente de nuevo.');
    }

    console.log('✅ [AUTH] Login exitoso:', {
      success: responseData.success,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      user
    });
    
    // Almacenar tokens en localStorage
    localStorage.setItem('accessToken', accessToken);
    console.log('💾 [AUTH] Access token almacenado en localStorage');
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
      console.log('💾 [AUTH] Refresh token almacenado en localStorage');
    }

    // Almacenar información del usuario
    localStorage.setItem('user', JSON.stringify(user));
    console.log('💾 [AUTH] Información del usuario almacenada');
    
    return { accessToken, refreshToken, user };
  } catch (error) {
    console.error('💥 [AUTH] Error en el login:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Función para obtener el token de acceso almacenado
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

// Función para obtener la información del usuario almacenada
export function getStoredUser(): LoginResponse['user'] | null {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error al parsear usuario almacenado:', error);
      return null;
    }
  }
  return null;
}

// Función para verificar si el usuario está autenticado
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  return !!token;
}

// Función optimizada para desarrollo que verifica autenticación sin llamadas al servidor
export function isAuthenticatedInDevelopment(): boolean {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment) {
    return isAuthenticated();
  }
  
  const token = getAccessToken();
  const user = getStoredUser();
  
  // En desarrollo, si tenemos token y usuario en localStorage, consideramos autenticado
  return !!(token && user);
}

// Función para cerrar sesión
export function logout(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  console.log('🚪 [AUTH] Sesión cerrada, tokens eliminados');
}

// Función para hidratar la sesión (obtener datos del usuario actual)
export async function getMe(): Promise<LoginResponse['user'] | null> {
  const token = getAccessToken();
  
  if (!token) {
    console.log('🔍 [AUTH] No hay token disponible para hidratación');
    return null;
  }

  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}auth/me`;
  
  console.log('🔄 [AUTH] Hidratando sesión...');
  console.log('🌐 [AUTH] URL completa:', fullUrl);

  try {
    console.log('📡 [AUTH] Enviando request GET a:', fullUrl);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📥 [AUTH] Respuesta de hidratación recibida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log('❌ [AUTH] Token inválido o expirado, limpiando sesión');
        logout();
        return null; // Retornar null en lugar de lanzar error
      }
      throw new Error(`Error al hidratar sesión: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    let responseData: { success?: boolean; message?: string; data?: { user?: LoginResponse['user'] } };
    try {
      responseData = text ? JSON.parse(text) : {};
    } catch (parseError) {
      console.error('❌ [AUTH] Respuesta de /auth/me no es JSON válido:', text?.slice(0, 300));
      logout();
      return null;
    }
    console.log('✅ [AUTH] Respuesta completa del servidor:', responseData);
    
    // Verificar que la respuesta sea exitosa
    if (!responseData.success) {
      throw new Error(responseData.message || 'Error al obtener datos del usuario');
    }
    
    // El endpoint /auth/me devuelve { success: true, data: { user: {...} } }
    const userData = responseData.data?.user;
    if (!userData) {
      throw new Error('No se encontraron datos del usuario en la respuesta');
    }
    
    console.log('✅ [AUTH] Sesión hidratada exitosamente:', {
      user: userData
    });
    
    // Actualizar la información del usuario en localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('💾 [AUTH] Información del usuario actualizada');
    
    return userData;
  } catch (error) {
    console.error('💥 [AUTH] Error al hidratar sesión:', {
      error: error,
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// ===== FUNCIONES PARA PRODUCTOS =====

/**
 * Obtiene la lista de productos
 * Roles permitidos: gerencia, ventas, logistica, finanzas
 * @param page - Número de página (opcional, por defecto 1)
 * @param limit - Cantidad de productos por página (opcional, por defecto todos)
 * @returns Productos con información de paginación si se especifican parámetros
 */
/**
 * @param activeOnly - Si false, la API devuelve activos e inactivos (GET ?active_only=false). Si true u omitido, solo activos.
 */
export async function getProducts(page?: number, limit?: number, activeOnly?: boolean): Promise<Product[] | { products: Product[], pagination: { page: number, limit: number, total: number, totalPages: number } }> {
  try {
    const apiUrl = getApiUrl()
    let fullUrl = `${apiUrl}products`
    
    const params = new URLSearchParams()
    if (page !== undefined) params.append('page', page.toString())
    if (limit !== undefined) params.append('limit', limit.toString())
    // active_only=false para listar todos (activos + inactivos/borrados) en admin
    if (activeOnly === false) params.append('active_only', 'false')
    if (params.toString()) {
      fullUrl += `?${params.toString()}`
    }
    
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Obteniendo lista de productos:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: ProductsResponse | ProductsPaginatedResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al obtener productos:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver productos')
      }
      
      throw new Error(responseData.message || `Error al obtener productos: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Respuesta completa recibida:', responseData)
    
    // Si se solicita paginación, devolver estructura con paginación
    if (page !== undefined || limit !== undefined) {
      // Intentar obtener estructura paginada
      if (responseData.data && typeof responseData.data === 'object' && 'products' in responseData.data && 'pagination' in responseData.data) {
        return {
          products: (responseData.data as any).products || [],
          pagination: (responseData.data as any).pagination || { page: 1, limit: limit || 50, total: 0, totalPages: 0 }
        }
      }
      // Si la respuesta no tiene estructura paginada pero tiene array, crear estructura
      let products: Product[] = []
      if (Array.isArray(responseData.data)) {
        products = responseData.data
      } else if (responseData.data && typeof responseData.data === 'object' && 'products' in responseData.data) {
        products = (responseData.data as any).products || []
      }
      
      return {
        products,
        pagination: {
          page: page || 1,
          limit: limit || 50,
          total: products.length,
          totalPages: Math.ceil(products.length / (limit || 50))
        }
      }
    }
    
    // Sin paginación, devolver solo array de productos (comportamiento anterior)
    let products: Product[] = []
    
    if (Array.isArray(responseData.data)) {
      // Si data es directamente un array
      products = responseData.data
    } else if (responseData.data && typeof responseData.data === 'object' && 'products' in responseData.data && Array.isArray((responseData.data as any).products)) {
      // Si data tiene una propiedad products que es un array
      products = (responseData.data as any).products
    } else if (responseData.data && typeof responseData.data === 'object' && 'data' in responseData.data && Array.isArray((responseData.data as any).data)) {
      // Si data tiene una propiedad data que es un array (estructura anidada)
      products = (responseData.data as any).data
    } else {
      console.warn('⚠️ [PRODUCTS] Estructura de respuesta inesperada:', responseData.data)
      products = []
    }
    
    console.log('✅ [PRODUCTS] Productos extraídos:', products)
    return products
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al obtener productos:', error)
    throw error
  }
}

/**
 * Obtiene un producto por ID
 * Roles permitidos: gerencia, ventas, logistica, finanzas
 */
export async function getProductById(id: number): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Obteniendo producto por ID:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al obtener producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver este producto')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al obtener producto: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto obtenido exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al obtener producto:', error)
    throw error
  }
}

/**
 * Crea un nuevo producto
 * Roles permitidos: solo gerencia
 */
export async function createProductNew(productData: CreateProductData): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Creando nuevo producto:', fullUrl, productData)
    
    const body: Record<string, unknown> = { ...productData }
    if (productData.sync_to_woocommerce === true) {
      body.sync_to_woocommerce = true
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al crear producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.error || responseData.message || 'Error de validación en los datos del producto')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'No autorizado - Token de autenticación inválido o faltante')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'Sin permisos - Se requiere rol de gerencia para crear productos')
      }
      if (response.status === 409) {
        throw new Error(responseData.message || 'El código de producto ya existe')
      }
      
      throw new Error(responseData.message || `Error al crear producto: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto creado exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al crear producto:', error)
    throw error
  }
}

/**
 * Actualiza un producto existente
 * Roles permitidos: solo gerencia
 */
export async function updateProduct(id: number, productData: UpdateProductData): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}`
    const token = getAccessToken()
    
    const body: Record<string, unknown> = { ...productData }
    if (productData.sync_to_woocommerce === true) {
      body.sync_to_woocommerce = true
    }

    console.log('📦 [PRODUCTS] Actualizando producto:', fullUrl, body)
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al actualizar producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.error || responseData.message || 'Error de validación en los datos del producto')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para actualizar productos')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al actualizar producto: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto actualizado exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al actualizar producto:', error)
    throw error
  }
}

/**
 * Obtiene un producto por código (público, sin autenticación)
 * Usado para consulta pública desde códigos QR
 */
export async function getProductByCode(code: string): Promise<Product | null> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/code/${encodeURIComponent(code)}`
    
    console.log('📦 [PRODUCTS] Obteniendo producto por código (público):', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`Error al obtener producto: ${response.status}`)
    }

    const responseData: ProductResponse = await response.json()
    return responseData.data || null
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al obtener producto por código:', error)
    return null
  }
}

/**
 * Elimina un producto (soft delete en ERP).
 * Backend: pone is_active = false y, si tiene woocommerce_id, envía el producto a la papelera
 * de WooCommerce. No hace falta llamar a ningún endpoint de sync después de borrar.
 */
export async function deleteProduct(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Eliminando producto:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al eliminar producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para eliminar productos')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al eliminar producto: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto eliminado exitosamente (soft delete)')
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al eliminar producto:', error)
    throw error
  }
}

/**
 * Sincroniza un producto del ERP con WooCommerce.
 * Si el producto no tiene woocommerce_id, lo crea en WC. Si ya tiene, lo actualiza.
 * Roles permitidos: gerencia (según documentación backend).
 */
export interface SyncToWooCommerceResponse {
  success: boolean
  data: {
    woocommerce_id: number
    created: boolean
  }
}

export async function syncProductToWooCommerce(id: number): Promise<SyncToWooCommerceResponse['data']> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}/sync-to-woocommerce`
    const token = getAccessToken()

    console.log('📦 [PRODUCTS] Sincronizando producto con WooCommerce:', fullUrl)

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al sincronizar con WooCommerce:', {
        status: response.status,
        responseData
      })
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para sincronizar con WooCommerce')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      throw new Error(responseData.message || `Error al sincronizar: ${response.status}`)
    }

    const data = responseData.data ?? responseData
    console.log('✅ [PRODUCTS] Sincronización WooCommerce exitosa:', data)
    return {
      woocommerce_id: data.woocommerce_id ?? id,
      created: Boolean(data.created)
    }
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al sincronizar con WooCommerce:', error)
    throw error
  }
}

export interface LinkWooCommerceIdsSummary {
  linked: number
  already_linked: number
  not_found_in_erp: number
  total_processed: number
  errors: string[]
}

interface LinkWooCommerceIdsApiResponse {
  success: boolean
  message: string
  data?: LinkWooCommerceIdsSummary
  error?: string
  timestamp?: string
}

export async function linkWooCommerceIds(): Promise<LinkWooCommerceIdsSummary> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/link-woocommerce-ids`
    const token = getAccessToken()

    if (!token) {
      console.error('❌ [PRODUCTS] linkWooCommerceIds sin token disponible')
      throw new Error('Sesión no válida. Iniciá sesión nuevamente para vincular productos.')
    }

    console.log('🔗 [PRODUCTS] Iniciando vinculación masiva con WooCommerce')

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: LinkWooCommerceIdsApiResponse = await response.json()

    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error HTTP al vincular con WooCommerce:', {
        status: response.status,
        responseData
      })

      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }

      if (response.status === 403) {
        throw new Error(responseData.message || 'No tenés permisos para vincular productos con WooCommerce')
      }

      throw new Error(responseData.message || responseData.error || `Error al vincular productos: ${response.status}`)
    }

    if (!responseData.success || !responseData.data) {
      console.error('❌ [PRODUCTS] Respuesta inesperada al vincular con WooCommerce:', responseData)
      throw new Error(responseData.message || 'No se pudo completar la vinculación con WooCommerce')
    }

    console.log('✅ [PRODUCTS] Vinculación con WooCommerce completada:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al vincular productos con WooCommerce:', error)
    throw error instanceof Error ? error : new Error('Error desconocido al vincular productos con WooCommerce')
  }
}

/**
 * Actualiza el stock de un producto
 * Roles permitidos: gerencia, logistica
 */
export async function updateProductStock(id: number, stockData: UpdateStockData): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}/stock`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Actualizando stock:', fullUrl, stockData)
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(stockData)
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al actualizar stock:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.error || responseData.message || 'Error de validación en los datos del stock')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para actualizar stock')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al actualizar stock: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Stock actualizado exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al actualizar stock:', error)
    throw error
  }
}

/**
 * Elimina permanentemente un producto (borrado físico en ERP).
 * Backend: si tiene woocommerce_id, lo borra en WooCommerce (force = true) y luego en la base del ERP.
 */
export async function deleteProductPermanent(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/${id}/permanent`
    const token = getAccessToken()
    
    console.log('📦 [PRODUCTS] Eliminando producto permanentemente:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData = await response.json()
    
    if (!response.ok) {
      console.error('❌ [PRODUCTS] Error al eliminar producto permanentemente:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para eliminar productos permanentemente')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'Producto no encontrado')
      }
      
      throw new Error(responseData.message || `Error al eliminar producto permanentemente: ${response.status}`)
    }

    console.log('✅ [PRODUCTS] Producto eliminado permanentemente')
  } catch (error) {
    console.error('💥 [PRODUCTS] Error al eliminar producto permanentemente:', error)
    throw error
  }
}

// ===== FUNCIONES PARA BÚSQUEDA POR CÓDIGO DE BARRAS =====

/**
 * Tipos para búsqueda por código de barras
 */
export interface BarcodeLookupData {
  title: string
  description?: string
  brand?: string
  images?: string[]
  source: string
  source_site?: string
  suggested_price?: number
  category_suggestion?: string
  exists_as_product: boolean
  product_id?: number
  preview_message?: string
  available_actions: {
    accept: boolean
    modify: boolean
    ignore: boolean
  }
  provider_response_time?: number
  cached_at?: string
}

export interface BarcodeLookupResponse {
  success: boolean
  message: string
  data?: BarcodeLookupData
  error?: string
  timestamp: string
}

export interface AcceptBarcodeRequest {
  category_id?: number
  price?: number
  stock?: number
  code?: string
}

export interface CreateProductFromBarcodeRequest {
  code: string
  name: string
  description?: string
  price: number
  stock?: number
  category_id?: number
  barcode?: string
  images?: string[]
}

export interface SearchProductByBarcodeOptions {
  /** Priorizar/restringir resultados a un sitio (ej. "mercadolibre", "fravega", "garbarino"). */
  prefer_site?: string
}

/**
 * Busca datos de producto por código de barras
 * Roles permitidos: gerencia, ventas, logistica, finanzas
 * @param options.prefer_site - Si se indica, la API restringe la búsqueda a ese sitio (ej. prefer_site=mercadolibre).
 */
export async function searchProductByBarcode(
  barcode: string,
  options?: SearchProductByBarcodeOptions
): Promise<BarcodeLookupData> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams()
    if (options?.prefer_site) params.set("prefer_site", options.prefer_site)
    const query = params.toString()
    const fullUrl = `${apiUrl}products/barcode/${encodeURIComponent(barcode)}${query ? `?${query}` : ""}`
    const token = getAccessToken()

    console.log("🔍 [BARCODE] Buscando producto por código de barras:", fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: BarcodeLookupResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [BARCODE] Error al buscar producto:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.message || 'Formato de código de barras inválido')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para buscar productos por código de barras')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'No se encontraron datos para este código de barras')
      }
      if (response.status === 429) {
        throw new Error(responseData.message || 'Has realizado muchas consultas. Espera unos minutos.')
      }
      
      throw new Error(responseData.message || `Error al buscar producto: ${response.status}`)
    }

    if (!responseData.data) {
      throw new Error('La respuesta no contiene datos del producto')
    }

    console.log('✅ [BARCODE] Datos encontrados:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [BARCODE] Error al buscar producto por código de barras:', error)
    throw error
  }
}

/**
 * Acepta los datos encontrados y crea el producto
 * Roles permitidos: gerencia
 */
export async function acceptBarcodeProduct(
  barcode: string,
  additionalData?: AcceptBarcodeRequest
): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/barcode/${encodeURIComponent(barcode)}/accept`
    const token = getAccessToken()
    
    console.log('✅ [BARCODE] Aceptando datos y creando producto:', fullUrl, additionalData)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(additionalData || {})
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [BARCODE] Error al aceptar datos:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.message || 'Datos inválidos o código interno ya existe')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para crear productos')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'No se encontraron datos para este código de barras')
      }
      
      throw new Error(responseData.message || `Error al crear producto: ${response.status}`)
    }

    console.log('✅ [BARCODE] Producto creado exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [BARCODE] Error al aceptar datos y crear producto:', error)
    throw error
  }
}

/**
 * Crea producto con datos modificados por el usuario
 * Roles permitidos: gerencia
 */
export async function createProductFromBarcode(
  barcode: string,
  productData: CreateProductFromBarcodeRequest
): Promise<Product> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/barcode/${encodeURIComponent(barcode)}/create`
    const token = getAccessToken()
    
    console.log('✏️ [BARCODE] Creando producto con datos modificados:', fullUrl, productData)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...productData,
        barcode: barcode // Asegurar que coincida con el parámetro de la URL
      })
    })

    const responseData: ProductResponse = await response.json()
    
    if (!response.ok) {
      console.error('❌ [BARCODE] Error al crear producto con modificaciones:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 400) {
        throw new Error(responseData.message || 'Datos inválidos o código interno ya existe')
      }
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para crear productos')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'No se encontraron datos para este código de barras')
      }
      
      throw new Error(responseData.message || `Error al crear producto: ${response.status}`)
    }

    console.log('✅ [BARCODE] Producto creado con modificaciones exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [BARCODE] Error al crear producto con modificaciones:', error)
    throw error
  }
}

/**
 * Ignora los datos encontrados (marca como descartados)
 * Roles permitidos: gerencia, ventas, logistica, finanzas
 */
export async function ignoreBarcodeProduct(barcode: string, reason?: string): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}products/barcode/${encodeURIComponent(barcode)}/ignore`
    const token = getAccessToken()
    
    console.log('🚫 [BARCODE] Ignorando datos encontrados:', fullUrl, reason)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(reason ? { reason } : {})
    })

    const responseData: ApiResponse<{ success: boolean }> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [BARCODE] Error al ignorar datos:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para realizar esta acción')
      }
      if (response.status === 404) {
        throw new Error(responseData.message || 'No se encontraron datos para este código de barras')
      }
      
      throw new Error(responseData.message || `Error al ignorar datos: ${response.status}`)
    }

    console.log('✅ [BARCODE] Datos ignorados exitosamente')
  } catch (error) {
    console.error('💥 [BARCODE] Error al ignorar datos:', error)
    throw error
  }
}

/**
 * Valida el formato de un código de barras
 */
export function validateBarcode(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') {
    return false
  }
  
  // Remover espacios y guiones
  const cleaned = barcode.replace(/[\s-]/g, '')
  
  // Validar que sea numérico
  if (!/^\d+$/.test(cleaned)) {
    return false
  }
  
  // Validar longitud (EAN-8, UPC-A, EAN-13, GTIN-14)
  const length = cleaned.length
  return length === 8 || length === 12 || length === 13 || length === 14
}

// ===== FUNCIONES PARA MÓDULO DE CAJA =====

/**
 * Interfaces para el módulo de caja
 */
export interface DayCashSummary {
  date: string;
  incomes: number;
  expenses: number;
  balance: number;
}

export interface PeriodCashSummary {
  from: string;
  to: string;
  incomes: number;
  expenses: number;
  balance: number;
}

export interface MonthlyCashSummary {
  period: { year: number; month: number };
  current: { incomes: number; expenses: number; balance: number };
  previous: { incomes: number; expenses: number; balance: number };
  delta: { incomes: number; expenses: number; balance: number };
}

export interface CashMovement {
  id: number;
  type: "Ingreso" | "Egreso";
  concept: string;
  amount: number;
  date: string;
  method: string;
}

export interface CashApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * Obtiene el resumen del día
 * Roles permitidos: gerencia, manager, finanzas, admin
 */
export async function getDayCashSummary(date?: string): Promise<DayCashSummary> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams()
    
    if (date) {
      params.append('date', date)
    }
    
    const fullUrl = `${apiUrl}cash/day${params.toString() ? `?${params.toString()}` : ''}`
    const token = getAccessToken()
    
    console.log('💰 [CASH] Obteniendo resumen del día:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: CashApiResponse<DayCashSummary> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [CASH] Error al obtener resumen del día:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver el resumen de caja')
      }
      
      throw new Error(responseData.message || `Error al obtener resumen del día: ${response.status}`)
    }

    console.log('✅ [CASH] Resumen del día obtenido exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [CASH] Error al obtener resumen del día:', error)
    throw error
  }
}

/**
 * Obtiene el resumen por período
 * Roles permitidos: gerencia, manager, finanzas, admin
 */
export async function getPeriodCashSummary(from: string, to: string): Promise<PeriodCashSummary> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams({ from, to })
    const fullUrl = `${apiUrl}cash/period?${params.toString()}`
    const token = getAccessToken()
    
    console.log('💰 [CASH] Obteniendo resumen por período:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: CashApiResponse<PeriodCashSummary> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [CASH] Error al obtener resumen por período:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver el resumen de caja')
      }
      if (response.status === 400) {
        throw new Error(responseData.message || 'Parámetros de fecha inválidos')
      }
      
      throw new Error(responseData.message || `Error al obtener resumen por período: ${response.status}`)
    }

    console.log('✅ [CASH] Resumen por período obtenido exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [CASH] Error al obtener resumen por período:', error)
    throw error
  }
}

/**
 * Obtiene el resumen mensual con comparación
 * Roles permitidos: gerencia, manager, finanzas, admin
 */
export async function getMonthlyCashSummary(year?: number, month?: number): Promise<MonthlyCashSummary> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams()
    
    if (year) {
      params.append('year', year.toString())
    }
    if (month) {
      params.append('month', month.toString())
    }
    
    const fullUrl = `${apiUrl}cash/monthly${params.toString() ? `?${params.toString()}` : ''}`
    const token = getAccessToken()
    
    console.log('💰 [CASH] Obteniendo resumen mensual:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: CashApiResponse<MonthlyCashSummary> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [CASH] Error al obtener resumen mensual:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver el resumen de caja')
      }
      
      throw new Error(responseData.message || `Error al obtener resumen mensual: ${response.status}`)
    }

    console.log('✅ [CASH] Resumen mensual obtenido exitosamente:', responseData.data)
    return responseData.data
  } catch (error) {
    console.error('💥 [CASH] Error al obtener resumen mensual:', error)
    throw error
  }
}

/**
 * Obtiene los movimientos recientes
 * Roles permitidos: gerencia, manager, finanzas, admin
 */
export async function getCashMovements(limit?: number, from?: string, to?: string): Promise<CashMovement[]> {
  try {
    const apiUrl = getApiUrl()
    const params = new URLSearchParams()
    
    if (limit) {
      params.append('limit', limit.toString())
    }
    if (from) {
      params.append('from', from)
    }
    if (to) {
      params.append('to', to)
    }
    
    const fullUrl = `${apiUrl}cash/movements${params.toString() ? `?${params.toString()}` : ''}`
    const token = getAccessToken()
    
    console.log('💰 [CASH] Obteniendo movimientos recientes:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })

    const responseData: CashApiResponse<CashMovement[]> = await response.json()
    
    if (!response.ok) {
      console.error('❌ [CASH] Error al obtener movimientos:', {
        status: response.status,
        responseData
      })
      
      if (response.status === 401) {
        throw new Error(responseData.message || 'Token de autorización inválido')
      }
      if (response.status === 403) {
        throw new Error(responseData.message || 'No tienes permisos para ver los movimientos de caja')
      }
      
      throw new Error(responseData.message || `Error al obtener movimientos: ${response.status}`)
    }

    console.log('✅ [CASH] Movimientos obtenidos exitosamente:', responseData.data)
    return responseData.data || []
  } catch (error) {
    console.error('💥 [CASH] Error al obtener movimientos:', error)
    throw error
  }
}

// ==================== CUENTAS CORRIENTES API ====================

// Tipos para cuentas corrientes
export interface CuentaCorriente {
  id: number;
  client_id: number;
  client_name: string;
  client_code: string;
  balance: number;
  credit_limit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MovimientoCuentaCorriente {
  id: number;
  account_id: number;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  reference_type?: 'sale' | 'payment' | 'adjustment' | 'refund';
  reference_id?: number;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

export interface CreateCuentaCorrienteRequest {
  client_id: number;
  credit_limit: number;
  initial_balance?: number;
}

export interface UpdateCuentaCorrienteRequest {
  credit_limit?: number;
  is_active?: boolean;
}

export interface CreateMovimientoRequest {
  account_id: number;
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  reference_type?: 'sale' | 'payment' | 'adjustment' | 'refund';
  reference_id?: number;
}

export interface CuentaCorrienteStats {
  total_accounts: number;
  active_accounts: number;
  inactive_accounts: number;
  total_balance: number;
  total_credit_limit: number;
  accounts_with_balance: number;
  accounts_over_limit: number;
}

export interface CuentaCorrienteResponse {
  success: boolean;
  message: string;
  data: CuentaCorriente;
  timestamp: string;
}

export interface CuentasCorrientesResponse {
  success: boolean;
  message: string;
  data: {
    accounts: CuentaCorriente[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}

export interface MovimientosResponse {
  success: boolean;
  message: string;
  data: {
    movements: MovimientoCuentaCorriente[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}

// ==================== COMPRAS API ====================

// Tipos para compras
export interface Purchase {
  id: number;
  purchase_number: string;
  supplier_id: number;
  supplier_name: string;
  status: 'pending' | 'received' | 'cancelled';
  total_amount: number;
  purchase_date: string;
  received_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Campos de compromiso/deuda
  debt_type?: 'compromiso' | 'deuda_directa';
  commitment_amount?: number;
  debt_amount?: number;
  allows_partial_delivery?: boolean;
  confirmed_at?: string;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string; // default: "Argentina"
  is_active: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  // Campos adicionales (después de la migración)
  supplier_type?: 'productivo' | 'no_productivo' | 'otro_pasivo';
  legal_name?: string | null;
  trade_name?: string | null;
  purchase_frequency?: 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'ocasional';
  id_type?: 'CUIT' | 'CUIL' | 'CDI' | 'PASAPORTE' | 'OTRO';
  tax_id?: string | null;
  gross_income?: string | null;
  vat_condition?: string | null;
  account_description?: string | null;
  product_service?: string | null;
  integral_summary_account?: string | null;
  cost?: number | null;
  has_account?: boolean;
  payment_terms?: number | null;
}

export interface CreatePurchaseRequest {
  supplier_id: number;
  status: 'pending' | 'received' | 'cancelled';
  total_amount: number;
  purchase_date?: string;
  notes?: string;
}

export interface CreatePurchaseItemRequest {
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CreateSupplierRequest {
  code: string;
  name: string;
  supplier_type?: 'productivo' | 'no_productivo' | 'otro_pasivo';
  legal_name?: string;
  trade_name?: string;
  purchase_frequency?: 'diario' | 'semanal' | 'quincenal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual' | 'ocasional';
  id_type?: 'CUIT' | 'CUIL' | 'CDI' | 'PASAPORTE' | 'OTRO';
  tax_id?: string;
  gross_income?: string;
  vat_condition?: string;
  account_description?: string;
  product_service?: string;
  integral_summary_account?: string;
  cost?: number;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  has_account?: boolean;
  payment_terms?: number;
}

export interface PurchaseStats {
  total_purchases: number;
  pending_purchases: number;
  received_purchases: number;
  cancelled_purchases: number;
  total_amount: number;
  average_amount: number;
}

export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
}

// ==================== TIPOS PARA PEDIDOS/ÓRDENES ====================

export interface Order {
  id: number;
  order_number?: string;
  woocommerce_order_id?: number;
  canal_venta?: 'woocommerce' | 'local';
  json?: any; // JSON completo con todos los datos originales
  client_id: number;
  client_name?: string;
  client_email?: string;
  client_code?: string;
  order_date: string;
  delivery_date?: string;
  status: 'pendiente_preparacion' | 'listo_despacho' | 'pagado' | 'aprobado' | 'en_proceso' | 'completado' | 'cancelado' | 'pendiente' | 'atrasado' | 'cancelled';
  total_amount: number | string;
  items_count?: number;
  priority?: 'Normal' | 'Alta' | 'Crítica';
  currency?: string;
  quote?: number;
  price_list?: string;
  seller?: string;
  responsible?: string;
  invoice?: boolean;
  delivery_address?: string;
  delivery_city?: string;
  delivery_contact?: string;
  delivery_phone?: string;
  transport_company?: string;
  transport_cost?: string;
  payment_method?: string;
  payment_method_title?: string;
  observations?: string;
  shipping_company?: string;
  packages_count?: number;
  final_discount?: number;
  sales_channel?: "woocommerce_minorista" | "mercadolibre" | "sistema_mf" | "sistema_principal" | "manual" | "otro";
  remito_status?: 'sin_remito' | 'remito_generado' | 'remito_despachado' | 'remito_entregado';
  stock_reserved?: boolean;
  has_remito?: boolean;
  is_active?: boolean;
  items?: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number;
  product_name?: string;
  product_code?: string;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  vat?: number;
  recovery?: number;
  created_at: string;
}

export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  delayed_orders: number;
  total_amount: number;
  average_amount: number;
}

export interface CreateOrderRequest {
  client_id: number;
  order_date: string;
  delivery_date?: string;
  status?: 'pendiente' | 'en_proceso' | 'completado' | 'atrasado' | 'cancelado';
  currency?: string;
  quote?: number;
  price_list?: string;
  seller?: string;
  responsible?: string;
  invoice?: boolean;
  delivery_address?: string;
  observations?: string;
  shipping_company?: string;
  packages_count?: number;
  final_discount?: number;
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  product_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  vat?: number;
  recovery?: number;
}

// ==================== TIPOS PARA FACTURAS DE PROVEEDORES ====================

export interface SupplierInvoice {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name?: string;
  supplier_type?: 'productivo' | 'no_productivo' | 'otro_pasivo';
  purchase_id?: number | null;
  purchase_number?: string;
  invoice_date: string;
  due_date?: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'received' | 'partial_paid' | 'paid' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  paid_amount?: number;
  remaining_amount?: number;
  delivery_note_id?: number | null;
  notes?: string;
  file_url?: string;
  items?: SupplierInvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface SupplierInvoiceItem {
  id: number;
  invoice_id: number;
  material_code?: string | null;
  product_id?: number | null;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  unit_cost?: number;
  affects_production_cost: boolean;
  purchase_item_id?: number | null;
  created_at: string;
}

export interface CreateSupplierInvoiceRequest {
  invoice_number: string;
  supplier_id: number;
  purchase_id?: number | null;
  invoice_date: string;
  due_date?: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  items: CreateSupplierInvoiceItemRequest[];
}

export interface CreateSupplierInvoiceItemRequest {
  material_code?: string | null;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number;
  affects_production_cost?: boolean;
  purchase_item_id?: number | null;
}

// ==================== TIPOS PARA EGRESOS DEVENGADOS ====================

export interface AccruedExpense {
  id: number;
  expense_number: string;
  supplier_id?: number | null;
  supplier_name?: string;
  expense_type: 'compromise' | 'accrual';
  concept: string;
  category: 'seguro' | 'impuesto' | 'alquiler' | 'servicio' | 'otro';
  amount: number;
  accrual_date: string;
  due_date?: string | null;
  payment_date?: string | null;
  status: 'pending' | 'paid' | 'cancelled';
  has_invoice: boolean;
  invoice_id?: number | null;
  invoice_number?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccruedExpenseRequest {
  supplier_id?: number | null;
  expense_type: 'compromise' | 'accrual';
  concept: string;
  category: 'seguro' | 'impuesto' | 'alquiler' | 'servicio' | 'otro';
  amount: number;
  accrual_date: string;
  due_date?: string | null;
  notes?: string;
}

// ==================== TIPOS PARA PASIVOS DEVENGADOS ====================

export interface AccruedLiability {
  id: number;
  liability_number: string;
  liability_type: 'impuesto' | 'alquiler' | 'seguro' | 'servicio' | 'prestamo' | 'otro';
  description: string;
  amount: number;
  accrual_date: string;
  due_date: string;
  payment_date?: string | null;
  status: 'pending' | 'partial_paid' | 'paid' | 'overdue' | 'cancelled';
  paid_amount: number;
  remaining_amount: number;
  treasury_account_id?: number | null;
  payment_id?: number | null;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccruedLiabilityRequest {
  liability_type: 'impuesto' | 'alquiler' | 'seguro' | 'servicio' | 'prestamo' | 'otro';
  description: string;
  amount: number;
  accrual_date: string;
  due_date: string;
  treasury_account_id?: number | null;
  notes?: string;
}

// Función para obtener todas las compras
export async function getPurchases(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'received' | 'cancelled';
  supplier_id?: number;
  date_from?: string;
  date_to?: string;
  all?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    purchases: Purchase[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id.toString());
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);
    if (params?.all) queryParams.append('all', 'true');

    const url = `${getApiUrl()}/purchases${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al obtener compras:', error);
    throw error;
  }
}

// Función para obtener una compra específica
export async function getPurchase(id: number): Promise<{
  success: boolean;
  message: string;
  data: Purchase;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al obtener compra:', error);
    throw error;
  }
}

// Función para crear una nueva compra
export async function createPurchase(data: CreatePurchaseRequest): Promise<{
  success: boolean;
  message: string;
  data: Purchase;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al crear compra:', error);
    throw error;
  }
}

// Función para actualizar una compra
export async function updatePurchase(id: number, data: Partial<CreatePurchaseRequest>): Promise<{
  success: boolean;
  message: string;
  data: Purchase;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al actualizar compra:', error);
    throw error;
  }
}

// Función para eliminar una compra
export async function deletePurchase(id: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al eliminar compra:', error);
    throw error;
  }
}

// Función para obtener items de una compra
export async function getPurchaseItems(purchaseId: number): Promise<{
  success: boolean;
  message: string;
  data: PurchaseItem[];
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${purchaseId}/items`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al obtener items de compra:', error);
    throw error;
  }
}

// Función para agregar un item a una compra
export async function addPurchaseItem(purchaseId: number, data: CreatePurchaseItemRequest): Promise<{
  success: boolean;
  message: string;
  data: PurchaseItem;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${purchaseId}/items`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al agregar item a compra:', error);
    throw error;
  }
}

// Función para actualizar un item de compra
export async function updatePurchaseItem(purchaseId: number, itemId: number, data: Partial<CreatePurchaseItemRequest>): Promise<{
  success: boolean;
  message: string;
  data: PurchaseItem;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${purchaseId}/items/${itemId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al actualizar item de compra:', error);
    throw error;
  }
}

// Función para eliminar un item de compra
export async function deletePurchaseItem(purchaseId: number, itemId: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/${purchaseId}/items/${itemId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al eliminar item de compra:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA PEDIDOS/ÓRDENES ====================

// Función para obtener todas las órdenes/pedidos
export async function getOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pendiente_preparacion' | 'listo_despacho' | 'pagado' | 'aprobado' | 'en_proceso' | 'completado' | 'cancelado';
  client_id?: number;
  canal_venta?: 'woocommerce' | 'local';
  remito_status?: 'sin_remito' | 'remito_generado' | 'remito_despachado' | 'remito_entregado';
  date_from?: string; // ISO 8601 format
  date_to?: string; // ISO 8601 format
  stock_reserved?: boolean;
  has_remito?: boolean;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    orders: Order[];
    total?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    
    // Validar y agregar parámetros solo si tienen valores válidos
    if (params?.page && params.page > 0) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.limit && params.limit > 0) {
      // Limitar el máximo según la documentación
      const limit = Math.min(params.limit, 100);
      queryParams.append('limit', limit.toString());
    }
    if (params?.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }
    if (params?.status && params.status.trim()) {
      queryParams.append('status', params.status);
    }
    if (params?.client_id && params.client_id > 0) {
      queryParams.append('client_id', params.client_id.toString());
    }
    if (params?.canal_venta) {
      queryParams.append('canal_venta', params.canal_venta);
    }
    if (params?.remito_status) {
      queryParams.append('remito_status', params.remito_status);
    }
    if (params?.date_from && params.date_from.trim()) {
      queryParams.append('date_from', params.date_from);
    }
    if (params?.date_to && params.date_to.trim()) {
      queryParams.append('date_to', params.date_to);
    }
    if (params?.stock_reserved !== undefined) {
      queryParams.append('stock_reserved', params.stock_reserved.toString());
    }
    if (params?.has_remito !== undefined) {
      queryParams.append('has_remito', params.has_remito.toString());
    }

    const url = `${getApiUrl()}orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const token = getAuthToken();
    
    // Validar que el token existe antes de hacer la petición
    if (!token) {
      console.error('❌ [ORDERS] No hay token de autenticación disponible');
      throw new Error('No hay token de autenticación. Por favor, inicia sesión nuevamente.');
    }
    
    // Obtener headers con API Key si está disponible, sino usar Bearer token
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (typeof window !== 'undefined') {
      const apiKey = localStorage.getItem('apiKey');
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      } else {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    console.log('📡 [ORDERS] Obteniendo pedidos:', {
      url,
      params: params,
      queryString: queryParams.toString(),
      hasToken: !!token,
      tokenLength: token.length,
      hasApiKey: typeof window !== 'undefined' ? !!localStorage.getItem('apiKey') : false
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      // Intentar obtener el mensaje de error del backend
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        console.error('❌ [ORDERS] Error del backend:', {
          status: response.status,
          message: errorMessage,
          errorData
        });
      } catch {
        // Si no se puede parsear el JSON, usar el mensaje por defecto
        console.error('❌ [ORDERS] Error sin JSON:', {
          status: response.status,
          statusText: response.statusText
        });
      }
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    
    // Validar que la respuesta tenga la estructura esperada
    if (!responseData.success) {
      console.error('❌ [ORDERS] Respuesta no exitosa:', responseData);
      throw new Error(responseData.message || responseData.error || 'Error al obtener pedidos');
    }
    
    return responseData;
  } catch (error) {
    console.error('💥 [ORDERS] Error al obtener pedidos:', error);
    throw error;
  }
}

// Función para obtener pedidos desde WooCommerce
export async function getWooCommerceOrders(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    orders: Order[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const url = `https://api.sistema.mfcomputers.com.ar/api/integration/webhook/woocommerce/order${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [WOOCOMMERCE ORDERS] Error al obtener pedidos de WooCommerce:', error);
    throw error;
  }
}

// Función para obtener una orden específica
export async function getOrder(id: number): Promise<{
  success: boolean;
  message: string;
  data: Order;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}orders/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ORDERS] Error al obtener pedido:', error);
    throw error;
  }
}

// Función para obtener estadísticas de pedidos
export async function getOrderStats(): Promise<{
  success: boolean;
  message: string;
  data: OrderStats;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}orders/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ORDERS] Error al obtener estadísticas de pedidos:', error);
    throw error;
  }
}

// Función para crear una nueva orden
export async function createOrder(data: CreateOrderRequest): Promise<{
  success: boolean;
  message: string;
  data: Order;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ORDERS] Error al crear pedido:', error);
    throw error;
  }
}

// Función para actualizar una orden
export async function updateOrder(id: number, data: Partial<CreateOrderRequest>): Promise<{
  success: boolean;
  message: string;
  data: Order;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}orders/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ORDERS] Error al actualizar pedido:', error);
    throw error;
  }
}

// Función para eliminar una orden
export async function deleteOrder(id: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}orders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ORDERS] Error al eliminar pedido:', error);
    throw error;
  }
}

// Función para obtener todos los proveedores
export interface SupplierResponse {
  success: boolean;
  message: string;
  data: {
    suppliers: Supplier[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    total?: number;
    message?: string; // "All suppliers retrieved (no pagination applied)"
  };
  timestamp: string;
}

export async function getSuppliers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  supplier_type?: 'productivo' | 'no_productivo' | 'otro_pasivo';
  is_active?: boolean;
  all?: boolean;
}): Promise<SupplierResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.city) queryParams.append('city', params.city);
    if (params?.supplier_type) queryParams.append('supplier_type', params.supplier_type);
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.all) queryParams.append('all', 'true');

    const url = `${getApiUrl()}purchases/suppliers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const headers = getAuthHeaders();
    const token = getAuthToken();
    
    console.log('📋 [SUPPLIERS] Obteniendo proveedores:', {
      url,
      hasToken: !!token,
      queryParams: queryParams.toString() || 'none',
      method: 'GET'
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    console.log('📥 [SUPPLIERS] Respuesta de proveedores:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [SUPPLIERS] Error al obtener proveedores:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data: SupplierResponse = await response.json();
    console.log('✅ [SUPPLIERS] Proveedores obtenidos:', {
      count: data.data?.suppliers?.length || 0,
      total: data.data?.pagination?.total || data.data?.total || 0,
      hasPagination: !!data.data?.pagination,
      message: data.message
    });
    
    return data;
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al obtener proveedores:', error);
    throw error;
  }
}

// Función para obtener un proveedor específico
export async function getSupplier(id: number): Promise<{
  success: boolean;
  message: string;
  data: Supplier;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}purchases/suppliers/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al obtener proveedor:', error);
    throw error;
  }
}

// Función para crear un nuevo proveedor
export async function createSupplier(data: CreateSupplierRequest): Promise<{
  success: boolean;
  message: string;
  data: Supplier;
  timestamp: string;
}> {
  try {
    const url = `${getApiUrl()}purchases/suppliers`;
    const headers = getAuthHeaders();
    const token = getAuthToken();
    
    // Convert headers to a record for easier inspection
    const headersRecord: Record<string, string> = headers instanceof Headers 
      ? Object.fromEntries(headers.entries())
      : Array.isArray(headers)
      ? Object.fromEntries(headers as [string, string][])
      : (headers as Record<string, string>);
    
    console.log('🆕 [SUPPLIERS] Creando proveedor:', {
      url,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'no token',
      headers: Object.keys(headersRecord),
      authorizationHeader: headersRecord['Authorization'] ? 'present' : 'missing',
      dataKeys: Object.keys(data),
      dataPayload: JSON.stringify(data, null, 2)
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    console.log('📥 [SUPPLIERS] Respuesta de creación:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('❌ [SUPPLIERS] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });

      // Manejar error 401 (token expirado o inválido)
      if (response.status === 401) {
        // Limpiar tokens expirados
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          console.log('🔐 [SUPPLIERS] Tokens eliminados por expiración');
          
          // Redirigir al login si no estamos ya ahí
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login?expired=true';
          }
        }
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      }

      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al crear proveedor:', error);
    throw error;
  }
}

// Función para actualizar un proveedor
export async function updateSupplier(id: number, data: Partial<CreateSupplierRequest>): Promise<{
  success: boolean;
  message: string;
  data: Supplier;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}purchases/suppliers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al actualizar proveedor:', error);
    throw error;
  }
}

// Función para eliminar un proveedor
export async function deleteSupplier(id: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}purchases/suppliers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al eliminar proveedor:', error);
    throw error;
  }
}

// Función para obtener estadísticas de compras
export async function getPurchaseStats(): Promise<{
  success: boolean;
  message: string;
  data: PurchaseStats;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/purchases/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [PURCHASES] Error al obtener estadísticas:', error);
    throw error;
  }
}

// Función para obtener estadísticas de proveedores
export async function getSupplierStats(): Promise<{
  success: boolean;
  message: string;
  data: SupplierStats;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}purchases/suppliers/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [SUPPLIERS] Error al obtener estadísticas:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA FACTURAS DE PROVEEDORES ====================

export async function getSupplierInvoices(params?: {
  page?: number;
  limit?: number;
  search?: string;
  supplier_id?: number;
  purchase_id?: number;
  status?: 'draft' | 'received' | 'partial_paid' | 'paid' | 'cancelled';
  payment_status?: 'pending' | 'partial' | 'paid' | 'overdue';
  date_from?: string;
  date_to?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    invoices: SupplierInvoice[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id.toString());
    if (params?.purchase_id) queryParams.append('purchase_id', params.purchase_id.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.payment_status) queryParams.append('payment_status', params.payment_status);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `${getApiUrl()}/suppliers/invoices${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [INVOICES] Error al obtener facturas:', error);
    throw error;
  }
}

export async function getSupplierInvoice(id: number): Promise<{
  success: boolean;
  message: string;
  data: SupplierInvoice;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/invoices/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [INVOICES] Error al obtener factura:', error);
    throw error;
  }
}

export async function createSupplierInvoice(data: CreateSupplierInvoiceRequest): Promise<{
  success: boolean;
  message: string;
  data: SupplierInvoice;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/invoices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [INVOICES] Error al crear factura:', error);
    throw error;
  }
}

export async function updateSupplierInvoice(id: number, data: Partial<CreateSupplierInvoiceRequest>): Promise<{
  success: boolean;
  message: string;
  data: SupplierInvoice;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/invoices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [INVOICES] Error al actualizar factura:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA EGRESOS DEVENGADOS ====================

export async function getAccruedExpenses(params?: {
  page?: number;
  limit?: number;
  supplier_id?: number;
  expense_type?: 'compromise' | 'accrual';
  category?: 'seguro' | 'impuesto' | 'alquiler' | 'servicio' | 'otro';
  status?: 'pending' | 'paid' | 'cancelled';
  has_invoice?: boolean;
  date_from?: string;
  date_to?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    expenses: AccruedExpense[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.supplier_id) queryParams.append('supplier_id', params.supplier_id.toString());
    if (params?.expense_type) queryParams.append('expense_type', params.expense_type);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.has_invoice !== undefined) queryParams.append('has_invoice', params.has_invoice.toString());
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `${getApiUrl()}/suppliers/accrued-expenses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_EXPENSES] Error al obtener egresos:', error);
    throw error;
  }
}

export async function getAccruedExpense(id: number): Promise<{
  success: boolean;
  message: string;
  data: AccruedExpense;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-expenses/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_EXPENSES] Error al obtener egreso:', error);
    throw error;
  }
}

export async function createAccruedExpense(data: CreateAccruedExpenseRequest): Promise<{
  success: boolean;
  message: string;
  data: AccruedExpense;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-expenses`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_EXPENSES] Error al crear egreso:', error);
    throw error;
  }
}

export async function updateAccruedExpense(id: number, data: Partial<CreateAccruedExpenseRequest>): Promise<{
  success: boolean;
  message: string;
  data: AccruedExpense;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-expenses/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_EXPENSES] Error al actualizar egreso:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA PASIVOS DEVENGADOS ====================

export async function getAccruedLiabilities(params?: {
  page?: number;
  limit?: number;
  liability_type?: 'impuesto' | 'alquiler' | 'seguro' | 'servicio' | 'prestamo' | 'otro';
  status?: 'pending' | 'partial_paid' | 'paid' | 'overdue' | 'cancelled';
  overdue?: boolean;
  date_from?: string;
  date_to?: string;
}): Promise<{
  success: boolean;
  message: string;
  data: {
    liabilities: AccruedLiability[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  timestamp: string;
}> {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.liability_type) queryParams.append('liability_type', params.liability_type);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.overdue) queryParams.append('overdue', 'true');
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `${getApiUrl()}/suppliers/accrued-liabilities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_LIABILITIES] Error al obtener pasivos:', error);
    throw error;
  }
}

export async function getAccruedLiability(id: number): Promise<{
  success: boolean;
  message: string;
  data: AccruedLiability;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-liabilities/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_LIABILITIES] Error al obtener pasivo:', error);
    throw error;
  }
}

export async function createAccruedLiability(data: CreateAccruedLiabilityRequest): Promise<{
  success: boolean;
  message: string;
  data: AccruedLiability;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-liabilities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_LIABILITIES] Error al crear pasivo:', error);
    throw error;
  }
}

export async function updateAccruedLiability(id: number, data: Partial<CreateAccruedLiabilityRequest>): Promise<{
  success: boolean;
  message: string;
  data: AccruedLiability;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}/suppliers/accrued-liabilities/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCRUED_LIABILITIES] Error al actualizar pasivo:', error);
    throw error;
  }
}

// ==================== FUNCIONES PARA CUENTAS CORRIENTES ====================

/**
 * Obtiene todas las cuentas corrientes
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getCuentasCorrientes(params?: {
  page?: number;
  limit?: number;
  search?: string;
  client_id?: number;
  is_active?: boolean;
  balance_min?: number;
  balance_max?: number;
}): Promise<CuentasCorrientesResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.client_id) queryParams.append('client_id', params.client_id.toString());
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
    if (params?.balance_min) queryParams.append('balance_min', params.balance_min.toString());
    if (params?.balance_max) queryParams.append('balance_max', params.balance_max.toString());

    const url = `${getApiUrl()}accounts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener cuentas corrientes:', error);
    throw error;
  }
}

/**
 * Obtiene una cuenta corriente específica
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getCuentaCorriente(id: number): Promise<CuentaCorrienteResponse> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/${id}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener cuenta corriente:', error);
    throw error;
  }
}

/**
 * Crea una nueva cuenta corriente
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function createCuentaCorriente(data: CreateCuentaCorrienteRequest): Promise<CuentaCorrienteResponse> {
  try {
    const response = await fetch(`${getApiUrl()}accounts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al crear cuenta corriente:', error);
    throw error;
  }
}

/**
 * Actualiza una cuenta corriente
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function updateCuentaCorriente(id: number, data: UpdateCuentaCorrienteRequest): Promise<CuentaCorrienteResponse> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al actualizar cuenta corriente:', error);
    throw error;
  }
}

/**
 * Elimina una cuenta corriente
 * Roles permitidos: gerencia, admin
 */
export async function deleteCuentaCorriente(id: number): Promise<{
  success: boolean;
  message: string;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al eliminar cuenta corriente:', error);
    throw error;
  }
}

/**
 * Obtiene los movimientos de una cuenta corriente
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getMovimientosCuentaCorriente(accountId: number, params?: {
  page?: number;
  limit?: number;
  type?: 'debit' | 'credit';
  date_from?: string;
  date_to?: string;
}): Promise<MovimientosResponse> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `${getApiUrl()}accounts/${accountId}/movements${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener movimientos:', error);
    throw error;
  }
}

/**
 * Crea un nuevo movimiento en una cuenta corriente
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function createMovimientoCuentaCorriente(data: CreateMovimientoRequest): Promise<{
  success: boolean;
  message: string;
  data: MovimientoCuentaCorriente;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/${data.account_id}/movements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al crear movimiento:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de cuentas corrientes
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getCuentaCorrienteStats(): Promise<{
  success: boolean;
  message: string;
  data: CuentaCorrienteStats;
  timestamp: string;
}> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener estadísticas:', error);
    throw error;
  }
}

/**
 * Obtiene la cuenta corriente de un cliente específico
 * Roles permitidos: gerencia, finanzas, admin
 */
export async function getCuentaCorrienteByClient(clientId: number): Promise<CuentaCorrienteResponse> {
  try {
    const response = await fetch(`${getApiUrl()}accounts/client/${clientId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('💥 [ACCOUNTS] Error al obtener cuenta corriente del cliente:', error);
    throw error;
  }
}

// ============================================================================
// ROLES Y PERMISOS API
// ============================================================================

// Tipos para Roles y Permisos
export interface Permission {
  id: number
  name: string
  code: string
  module: string
  description: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface RolePermissions {
  [key: string]: Permission[]
}

export interface UserPermissionsData {
  user: {
    id: number
    username: string
    role: string
    firstName?: string
    lastName?: string
    email?: string
  }
  permissions: Permission[]
  rolePermissions: Permission[]
  directPermissions: (Permission & {
    expires_at?: string | null
    granted_by?: number
  })[]
}

export interface User {
  id: number
  username: string
  firstName?: string
  lastName?: string
  email?: string
  role: string
  is_active?: boolean
}

// ============================================================================
// PERMISOS API
// ============================================================================

/**
 * Obtener todos los permisos del sistema
 * Permisos requeridos: admin, gerencia
 */
export async function getPermissions(params?: {
  module?: string
  is_active?: boolean
}): Promise<Permission[]> {
  try {
    const apiUrl = getApiUrl()
    let fullUrl = `${apiUrl}roles/permissions`
    
    const queryParams = new URLSearchParams()
    if (params?.module) queryParams.append('module', params.module)
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
    
    if (queryParams.toString()) {
      fullUrl += `?${queryParams.toString()}`
    }
    
    console.log('🔐 [ROLES] Obteniendo permisos:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission[]> = await response.json()
    return responseData.data || []
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener permisos:', error)
    throw error
  }
}

/**
 * Obtener lista de módulos únicos
 * Permisos requeridos: admin, gerencia
 */
export async function getPermissionModules(): Promise<string[]> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions/modules`
    
    console.log('🔐 [ROLES] Obteniendo módulos:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<string[]> = await response.json()
    return responseData.data || []
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener módulos:', error)
    throw error
  }
}

/**
 * Obtener un permiso por ID
 * Permisos requeridos: admin, gerencia
 */
export async function getPermissionById(id: number): Promise<Permission> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions/${id}`
    
    console.log('🔐 [ROLES] Obteniendo permiso:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener permiso:', error)
    throw error
  }
}

/**
 * Crear un nuevo permiso
 * Permisos requeridos: admin
 */
export async function createPermission(permissionData: {
  name: string
  code: string
  module: string
  description?: string
  is_active?: boolean
}): Promise<Permission> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions`
    
    console.log('🔐 [ROLES] Creando permiso:', fullUrl, permissionData)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(permissionData),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [ROLES] Error al crear permiso:', error)
    throw error
  }
}

/**
 * Actualizar un permiso existente
 * Permisos requeridos: admin
 */
export async function updatePermission(
  id: number,
  permissionData: {
    name?: string
    code?: string
    module?: string
    description?: string
    is_active?: boolean
  }
): Promise<Permission> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions/${id}`
    
    console.log('🔐 [ROLES] Actualizando permiso:', fullUrl, permissionData)
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(permissionData),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [ROLES] Error al actualizar permiso:', error)
    throw error
  }
}

/**
 * Eliminar un permiso
 * Permisos requeridos: admin
 */
export async function deletePermission(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/permissions/${id}`
    
    console.log('🔐 [ROLES] Eliminando permiso:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [ROLES] Error al eliminar permiso:', error)
    throw error
  }
}

// ============================================================================
// ROLES API
// ============================================================================

/**
 * Obtener resumen de permisos por rol
 * Permisos requeridos: admin, gerencia
 */
export async function getRolesSummary(): Promise<RolePermissions> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/summary`
    
    console.log('🔐 [ROLES] Obteniendo resumen de roles:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<RolePermissions> = await response.json()
    return responseData.data || {}
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener resumen de roles:', error)
    throw error
  }
}

/**
 * Obtener permisos de un rol específico
 * Permisos requeridos: admin, gerencia
 */
export async function getRolePermissions(role: string): Promise<Permission[]> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/${role}/permissions`
    
    console.log('🔐 [ROLES] Obteniendo permisos del rol:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<Permission[]> = await response.json()
    return responseData.data || []
  } catch (error) {
    console.error('💥 [ROLES] Error al obtener permisos del rol:', error)
    throw error
  }
}

/**
 * Asignar un permiso a un rol
 * Permisos requeridos: admin
 */
export async function assignPermissionToRole(role: string, permissionId: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/${role}/permissions`
    
    console.log('🔐 [ROLES] Asignando permiso a rol:', fullUrl, { permission_id: permissionId })
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ permission_id: permissionId }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [ROLES] Error al asignar permiso a rol:', error)
    throw error
  }
}

/**
 * Remover un permiso de un rol
 * Permisos requeridos: admin
 */
export async function removePermissionFromRole(role: string, permissionId: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/${role}/permissions/${permissionId}`
    
    console.log('🔐 [ROLES] Removiendo permiso de rol:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [ROLES] Error al remover permiso de rol:', error)
    throw error
  }
}

// ============================================================================
// USUARIOS Y PERMISOS API
// ============================================================================

/**
 * Obtener todos los usuarios
 * Permisos requeridos: admin, gerencia
 */
export async function getUsers(): Promise<User[]> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}users`
    
    console.log('👥 [USERS] Obteniendo usuarios:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<User[]> = await response.json()
    return responseData.data || []
  } catch (error) {
    console.error('💥 [USERS] Error al obtener usuarios:', error)
    throw error
  }
}

/**
 * Obtener todos los permisos de un usuario (rol + directos)
 * Permisos requeridos: admin, gerencia
 */
export async function getUserPermissions(userId: number): Promise<UserPermissionsData> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/users/${userId}/permissions`
    
    console.log('👥 [USERS] Obteniendo permisos del usuario:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<UserPermissionsData> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [USERS] Error al obtener permisos del usuario:', error)
    throw error
  }
}

/**
 * Asignar un permiso a un usuario o rol
 * Permisos requeridos: admin
 */
export async function assignPermission(data: {
  permission_id: number
  role?: string
  user_id?: number
  expires_at?: string | null
}): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/assign`
    
    console.log('🔐 [ROLES] Asignando permiso:', fullUrl, data)
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [ROLES] Error al asignar permiso:', error)
    throw error
  }
}

/**
 * Remover un permiso directo de un usuario
 * Permisos requeridos: admin
 */
export async function removePermissionFromUser(userId: number, permissionId: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}roles/users/${userId}/permissions/${permissionId}`
    
    console.log('👥 [USERS] Removiendo permiso del usuario:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [USERS] Error al remover permiso del usuario:', error)
    throw error
  }
}

/**
 * Crear un nuevo usuario
 * Permisos requeridos: admin
 */
export async function createUser(userData: {
  username: string
  password: string
  firstName?: string
  lastName?: string
  email?: string
  role: string
  is_active?: boolean
}): Promise<User> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}users`
    
    console.log('👥 [USERS] Creando usuario:', fullUrl, { ...userData, password: '***' })
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        username: userData.username,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
        email: userData.email,
        role: userData.role,
        is_active: userData.is_active !== false,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<User> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [USERS] Error al crear usuario:', error)
    throw error
  }
}

/**
 * Actualizar un usuario existente
 * Permisos requeridos: admin
 */
export async function updateUser(
  id: number,
  userData: {
    username?: string
    password?: string
    firstName?: string
    lastName?: string
    email?: string
    role?: string
    is_active?: boolean
  }
): Promise<User> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}users/${id}`
    
    console.log('👥 [USERS] Actualizando usuario:', fullUrl, { ...userData, password: userData.password ? '***' : undefined })
    
    const body: any = {}
    if (userData.username) body.username = userData.username
    if (userData.password) body.password = userData.password
    if (userData.firstName !== undefined) body.first_name = userData.firstName
    if (userData.lastName !== undefined) body.last_name = userData.lastName
    if (userData.email !== undefined) body.email = userData.email
    if (userData.role) body.role = userData.role
    if (userData.is_active !== undefined) body.is_active = userData.is_active
    
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
    
    const responseData: ApiResponse<User> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [USERS] Error al actualizar usuario:', error)
    throw error
  }
}

/**
 * Eliminar un usuario
 * Permisos requeridos: admin
 */
export async function deleteUser(id: number): Promise<void> {
  try {
    const apiUrl = getApiUrl()
    const fullUrl = `${apiUrl}users/${id}`
    
    console.log('👥 [USERS] Eliminando usuario:', fullUrl)
    
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error('💥 [USERS] Error al eliminar usuario:', error)
    throw error
  }
}

// ============================================================================
// PRESUPUESTOS / BUDGETS API
// ============================================================================

export interface BudgetItem {
  id?: string
  service: string
  description?: string
  equipmentType?: string
  equipmentModel?: string
  problemDescription?: string
  quantity: number
  vat: number
  recovery?: number
  unitPrice: number
  subtotal: number
}

export interface Budget {
  id: string
  numero: string
  cliente_id: number
  cliente_name: string
  cliente_email?: string
  cliente_telefono?: string
  cliente_direccion?: string
  fecha: string
  fecha_vencimiento: string
  estado: "pendiente" | "enviado" | "aprobado" | "revision" | "rechazado"
  items: BudgetItem[]
  subtotal: number
  vat21: number
  vat105: number
  total: number
  observaciones?: string
  validez?: number
  forma_pago?: string
  vendedor?: string
  currency?: string
  quote?: number
  created_at?: string
  updated_at?: string
}

export interface BudgetsResponse {
  budgets: Budget[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface BudgetStats {
  total_budgets: number
  pending_budgets: number
  sent_budgets: number
  approved_budgets: number
  rejected_budgets: number
  total_value: number
}

export interface CreateBudgetRequest {
  cliente_id: number
  fecha: string
  fecha_vencimiento: string
  items: BudgetItem[]
  observaciones?: string
  validez?: number
  forma_pago?: string
  vendedor?: string
  currency?: string
  quote?: number
}

export interface UpdateBudgetRequest {
  estado?: "pendiente" | "enviado" | "aprobado" | "revision" | "rechazado"
  fecha_vencimiento?: string
  items?: BudgetItem[]
  observaciones?: string
}

/**
 * Obtener todos los presupuestos con filtros opcionales
 */
export async function getBudgets(
  page: number = 1,
  limit: number = 10,
  search?: string,
  status?: string,
  clientId?: number
): Promise<BudgetsResponse> {
  const apiUrl = getApiUrl()
  
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  })
  
  if (search && search.trim()) {
    params.append('search', search.trim())
  }
  
  if (status) {
    params.append('status', status)
  }
  
  if (clientId) {
    params.append('client_id', clientId.toString())
  }
  
  const fullUrl = `${apiUrl}budgets?${params.toString()}`
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error al obtener presupuestos: ${response.status} ${response.statusText}`)
    }

    const responseData: ApiResponse<BudgetsResponse> = await response.json()
    return responseData.data || { budgets: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
  } catch (error) {
    console.error('💥 [API] Error al obtener presupuestos:', error)
    throw error
  }
}

/**
 * Obtener estadísticas de presupuestos
 */
export async function getBudgetStats(): Promise<BudgetStats> {
  const apiUrl = getApiUrl()
  const fullUrl = `${apiUrl}budgets/stats`
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Error al obtener estadísticas: ${response.status} ${response.statusText}`)
    }

    const responseData: ApiResponse<BudgetStats> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [API] Error al obtener estadísticas de presupuestos:', error)
    throw error
  }
}

/**
 * Obtener un presupuesto por ID
 */
export async function getBudget(id: string): Promise<Budget> {
  const apiUrl = getApiUrl()
  const fullUrl = `${apiUrl}budgets/${id}`
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Error al obtener presupuesto: ${response.status} ${response.statusText}`)
    }

    const responseData: ApiResponse<Budget> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [API] Error al obtener presupuesto:', error)
    throw error
  }
}

/**
 * Crear un nuevo presupuesto
 */
export async function createBudget(data: CreateBudgetRequest): Promise<Budget> {
  const apiUrl = getApiUrl()
  const fullUrl = `${apiUrl}budgets`
  
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error al crear presupuesto: ${response.status} ${response.statusText}`)
    }

    const responseData: ApiResponse<Budget> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [API] Error al crear presupuesto:', error)
    throw error
  }
}

/**
 * Actualizar un presupuesto existente
 */
export async function updateBudget(id: string, data: UpdateBudgetRequest): Promise<Budget> {
  const apiUrl = getApiUrl()
  const fullUrl = `${apiUrl}budgets/${id}`
  
  try {
    const response = await fetch(fullUrl, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error al actualizar presupuesto: ${response.status} ${response.statusText}`)
    }

    const responseData: ApiResponse<Budget> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [API] Error al actualizar presupuesto:', error)
    throw error
  }
}

/**
 * Enviar presupuesto por email
 */
export async function sendBudgetByEmail(id: string, email?: string): Promise<{ success: boolean; message: string }> {
  const apiUrl = getApiUrl()
  const fullUrl = `${apiUrl}budgets/${id}/send-email`
  
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error al enviar presupuesto: ${response.status} ${response.statusText}`)
    }

    const responseData: ApiResponse<{ success: boolean; message: string }> = await response.json()
    return responseData.data
  } catch (error) {
    console.error('💥 [API] Error al enviar presupuesto por email:', error)
    throw error
  }
}