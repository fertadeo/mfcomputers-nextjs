"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [error, setError] = useState("")
  const { login, isLoginLoading } = useAuth()
  const router = useRouter()

  const slides = [
    {
      title: "¿Sabías que la mayoría de las notificaciones \"instantáneas\" pueden tardar minutos o incluso horas en llegar?",
      subtitle: "¡Las nuestras se entregan en tiempo real!",
      mockups: (
        <div className="mb-8 space-y-6">
          {/* Mockup desktop */}
          <div className="bg-gray-900 rounded-lg p-4 shadow-2xl transform rotate-2">
            <div className="bg-gray-800 rounded p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="text-white text-sm font-medium mb-2">Dashboard ERP</div>
              <div className="space-y-1">
                <div className="h-2 bg-turquoise-500 rounded w-3/4"></div>
                <div className="h-2 bg-gray-700 rounded w-1/2"></div>
                <div className="h-2 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>

          {/* Mockup móvil */}
          <div className="bg-gray-900 rounded-lg p-3 shadow-2xl transform -rotate-1 ml-16">
            <div className="bg-gray-800 rounded p-2">
              <div className="text-white text-xs font-medium mb-2">Ventas</div>
              <div className="grid grid-cols-2 gap-1">
                <div className="h-8 bg-turquoise-500 rounded"></div>
                <div className="h-8 bg-gray-700 rounded"></div>
                <div className="h-8 bg-gray-700 rounded"></div>
                <div className="h-8 bg-turquoise-500 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "¿Te has dado cuenta de cuánto tiempo pierdes buscando información de inventario en diferentes sistemas?",
      subtitle: "¡Con nuestro ERP todo está centralizado y actualizado en tiempo real!",
      mockups: (
        <div className="mb-8 space-y-6">
          {/* Mockup de inventario */}
          <div className="bg-gray-900 rounded-lg p-4 shadow-2xl transform rotate-1">
            <div className="bg-gray-800 rounded p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="text-white text-sm font-medium mb-2">Control de Stock</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="h-2 bg-turquoise-500 rounded w-1/3"></div>
                  <div className="text-white text-xs">1,234</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-2 bg-yellow-500 rounded w-1/4"></div>
                  <div className="text-white text-xs">856</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-2 bg-red-500 rounded w-1/6"></div>
                  <div className="text-white text-xs">8</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup de alertas */}
          <div className="bg-gray-900 rounded-lg p-3 shadow-2xl transform -rotate-1 ml-16">
            <div className="bg-gray-800 rounded p-2">
              <div className="text-white text-xs font-medium mb-2">Alertas</div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="h-1 bg-red-500 rounded w-16"></div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="h-1 bg-yellow-500 rounded w-12"></div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-turquoise-500 rounded-full"></div>
                  <div className="h-1 bg-turquoise-500 rounded w-20"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "¿Cuántas horas dedicas cada mes a generar reportes y facturas manualmente?",
      subtitle: "¡Automatiza todo y enfócate en hacer crecer tu negocio!",
      mockups: (
        <div className="mb-8 space-y-6">
          {/* Mockup de facturación */}
          <div className="bg-gray-900 rounded-lg p-4 shadow-2xl transform rotate-1">
            <div className="bg-gray-800 rounded p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="text-white text-sm font-medium mb-2">Facturación</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="text-white text-xs">Ventas Hoy</div>
                  <div className="text-turquoise-400 text-xs font-bold">$45,230</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-white text-xs">Facturas</div>
                  <div className="text-white text-xs">34</div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-white text-xs">Pendientes</div>
                  <div className="text-yellow-400 text-xs">3</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mockup de reportes */}
          <div className="bg-gray-900 rounded-lg p-3 shadow-2xl transform -rotate-1 ml-16">
            <div className="bg-gray-800 rounded p-2">
              <div className="text-white text-xs font-medium mb-2">Reportes</div>
              <div className="grid grid-cols-2 gap-1">
                <div className="h-6 bg-turquoise-500 rounded"></div>
                <div className="h-6 bg-gray-700 rounded"></div>
                <div className="h-6 bg-gray-700 rounded"></div>
                <div className="h-6 bg-turquoise-500 rounded"></div>
                <div className="h-6 bg-gray-700 rounded"></div>
                <div className="h-6 bg-turquoise-500 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  // Auto-play del carrusel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Cambia cada 5 segundos

    return () => clearInterval(interval)
  }, [slides.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("") // Limpiar errores anteriores
    
    try {
      console.log("🔐 [LOGIN] Intentando autenticación:", { username })
      
      // Validar que los campos no estén vacíos
      if (!username.trim() || !password.trim()) {
        setError("Por favor, completa todos los campos")
        return
      }

      // Usar la función de login del contexto (que maneja la redirección automáticamente)
      await login({
        username: username.trim(),
        password: password.trim()
      })
      
    } catch (error) {
      console.error("❌ [LOGIN] Error en la autenticación:", error)
      
      // Manejar diferentes tipos de errores
      if (error instanceof Error) {
        if (error.message.includes("401")) {
          setError("Credenciales incorrectas. Verifica tu usuario y contraseña.")
        } else if (error.message.includes("404")) {
          setError("Usuario no encontrado. Verifica tu nombre de usuario.")
        } else if (error.message.includes("500")) {
          setError("Error del servidor. Intenta nuevamente más tarde.")
        } else if (error.message.includes("NetworkError") || error.message.includes("fetch")) {
          setError("Error de conexión. Verifica tu conexión a internet.")
        } else {
          setError(error.message || "Error inesperado. Intenta nuevamente.")
        }
      } else {
        setError("Error inesperado. Intenta nuevamente.")
      }
    }
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Panel izquierdo - Promocional */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-turquoise-600 to-turquoise-800 relative overflow-hidden">
        {/* Patrón de hexágonos de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 border-2 border-white rotate-45"></div>
          <div className="absolute top-32 left-32 w-16 h-16 border-2 border-white rotate-45"></div>
          <div className="absolute top-20 right-20 w-24 h-24 border-2 border-white rotate-45"></div>
          <div className="absolute bottom-20 left-20 w-18 h-18 border-2 border-white rotate-45"></div>
          <div className="absolute bottom-32 right-32 w-22 h-22 border-2 border-white rotate-45"></div>
        </div>

        {/* Logo principal */}
        <div className="absolute top-8 left-8">
          <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <span className="text-3xl font-bold text-white">MF</span>
          </div>
        </div>

        {/* Contenido promocional */}
        <div className="flex flex-col justify-center items-center text-center px-12 relative z-10 h-full">
          {/* Mockups de interfaz - Carrusel */}
          <div className="transition-all duration-500 ease-in-out mb-6">
            {slides[currentSlide].mockups}
          </div>

          {/* Texto promocional - Carrusel */}
          <div className="text-white space-y-3 transition-all duration-500 ease-in-out mb-6">
            <h2 className="text-xl font-bold leading-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-base opacity-90">
              {slides[currentSlide].subtitle}
            </p>
          </div>

          {/* Indicadores de slide */}
          <div className="flex gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide 
                    ? 'bg-white w-8' 
                    : 'bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          {/* Navegación */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
            <button 
              onClick={prevSlide}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button 
              onClick={nextSlide}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-white/30 transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Panel derecho - Formulario de login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-background h-full overflow-y-auto">
        <div className="w-full max-w-md space-y-6 p-6 bg-card rounded-lg shadow-sm border border-border/50">
          {/* Logo y título */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-10 h-10 bg-turquoise-500 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-white">MF</span>
              </div>
              <span className="text-xl font-bold text-foreground">MF COMPUTERS</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Iniciar Sesión</h1>
            <p className="text-sm text-muted-foreground">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="text-turquoise-500 hover:text-turquoise-600 font-medium">
                Regístrate
              </Link>
            </p>
          </div>

          {/* Formulario */}
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium">
                    Usuario *
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Ingresa tu nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Contraseña *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ingresa tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Debe tener al menos 8 caracteres.
                  </p>
                </div>

                {/* Mensaje de error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                 <Button
                   type="submit"
                   disabled={isLoginLoading}
                   className="w-full h-10 bg-turquoise-500 hover:bg-turquoise-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isLoginLoading ? (
                     <>
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       Iniciando sesión...
                     </>
                   ) : (
                     "Iniciar Sesión"
                   )}
                 </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">O</span>
                  </div>
                </div>

                 <Button
                   type="button"
                   variant="outline"
                   className="w-full h-10 border-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950/20 dark:hover:border-blue-400 dark:hover:text-blue-300 transition-all duration-200"
                 >
                   <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                     <path
                       fill="currentColor"
                       d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                     />
                     <path
                       fill="currentColor"
                       d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                     />
                     <path
                       fill="currentColor"
                       d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                     />
                     <path
                       fill="currentColor"
                       d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                     />
                   </svg>
                   Iniciar sesión con Google
                 </Button>
              </form>
            </CardContent>
          </Card>

          {/* Enlaces adicionales */}
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-turquoise-500 hover:text-turquoise-600"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
