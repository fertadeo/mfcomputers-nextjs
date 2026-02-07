import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que requieren autenticación
const protectedRoutes = [
  '/dashboard',
  '/clientes',
  '/stock',
  '/compras',
  '/produccion',
  '/pedidos',
  '/presupuestos',
  '/tienda',
  '/personal',
  '/proveedores',
  '/bancos',
  '/facturacion',
  '/caja',
  '/configuracion',
  '/contabilidad'
]

// Rutas que solo deben ser accesibles si NO estás autenticado
const authRoutes = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log('🛡️ [MIDDLEWARE] Verificando ruta:', pathname)
  
  // Verificar si la ruta está protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  // Verificar si es una ruta de autenticación
  const isAuthRoute = authRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  console.log('🛡️ [MIDDLEWARE] Estado:', {
    pathname,
    isProtectedRoute,
    isAuthRoute
  })
  
  // Para rutas protegidas, permitir que el cliente maneje la autenticación
  // El AuthProvider se encargará de redirigir si no hay autenticación válida
  if (isProtectedRoute) {
    console.log('🔒 [MIDDLEWARE] Ruta protegida - permitiendo acceso para hidratación del cliente')
    return NextResponse.next()
  }
  
  // Para la ruta raíz, permitir acceso para que el AuthProvider maneje la redirección
  if (pathname === '/') {
    console.log('🏠 [MIDDLEWARE] Ruta raíz - permitiendo acceso para hidratación del cliente')
    return NextResponse.next()
  }
  
  // Para rutas de autenticación, permitir acceso para que el AuthProvider maneje la redirección
  if (isAuthRoute) {
    console.log('🔑 [MIDDLEWARE] Ruta de autenticación - permitiendo acceso para hidratación del cliente')
    return NextResponse.next()
  }
  
  console.log('✅ [MIDDLEWARE] Ruta permitida')
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
