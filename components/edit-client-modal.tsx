"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  Save,
  X,
  AlertCircle,
  CheckCircle
} from "lucide-react"
import { updateCliente } from "@/lib/api"
import { SALES_CHANNEL_CONFIG, SalesChannel } from "@/lib/utils"

interface ClienteUI {
  id: string // Código del cliente
  dbId: number // ID numérico de la base de datos
  salesChannel: SalesChannel // Canal de venta
  nombre: string
  email: string
  telefono: string
  ciudad: string
  tipo: "Minorista" | "Mayorista" | "Personalizado"
  estado: "Activo" | "Inactivo"
  ultimaCompra: string
  totalCompras: number
  direccion?: string
  cuit?: string
  cuitSecundario?: string
  personType?: "Persona Física" | "Persona Jurídica"
  taxCondition?: string
  fechaRegistro?: string
  descuento?: number
  limiteCredito?: number
  vendedor?: string
}

interface EditClientData {
  client_type: "minorista" | "mayorista" | "personalizado"
  sales_channel: SalesChannel
  name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
}

interface EditClientModalProps {
  cliente: ClienteUI | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditClientModal({ cliente, isOpen, onClose, onSuccess }: EditClientModalProps) {
  const [formData, setFormData] = useState<EditClientData>({
    client_type: "minorista",
    sales_channel: "manual",
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Argentina"
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState("")

  // Cargar datos del cliente cuando se abre el modal
  useEffect(() => {
    if (cliente && isOpen) {
      setFormData({
        client_type: cliente.tipo.toLowerCase() as "minorista" | "mayorista" | "personalizado",
        sales_channel: cliente.salesChannel,
        name: cliente.nombre,
        email: cliente.email,
        phone: cliente.telefono,
        address: cliente.direccion || "",
        city: cliente.ciudad,
        country: "Argentina" // Valor por defecto
      })
      setErrors({})
      setSuccessMessage("")
    }
  }, [cliente, isOpen])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.client_type.trim()) {
      newErrors.client_type = "El tipo de cliente es requerido"
    }

    if (!formData.name.trim()) {
      newErrors.name = "El nombre es requerido"
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres"
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "El formato del email no es válido"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "El teléfono es requerido"
    } else if (formData.phone.trim().length < 8) {
      newErrors.phone = "El teléfono debe tener al menos 8 dígitos"
    }

    if (!formData.city.trim()) {
      newErrors.city = "La ciudad es requerida"
    }

    if (!formData.country.trim()) {
      newErrors.country = "El país es requerido"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!cliente) return

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      console.log('📝 [EDIT] Enviando datos de actualización:', {
        clienteId: cliente.dbId,
        formData: formData
      })

      await updateCliente(cliente.dbId, formData)
      
      setSuccessMessage("Cliente actualizado exitosamente")
      
      // Esperar un momento para mostrar el mensaje de éxito
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)

    } catch (error) {
      console.error('💥 [EDIT] Error al actualizar cliente:', error)
      setErrors({
        submit: error instanceof Error ? error.message : "Error al actualizar el cliente"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof EditClientData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  if (!cliente) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-turquoise-100 dark:bg-turquoise-900/20 rounded-lg">
              <User className="h-5 w-5 text-turquoise-600 dark:text-turquoise-400" />
            </div>
            Editar Cliente: {cliente.nombre}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-turquoise-100 dark:bg-turquoise-900/20 rounded-md">
                  <User className="h-4 w-4 text-turquoise-600 dark:text-turquoise-400" />
                </div>
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_type" className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    Tipo de Cliente *
                  </Label>
                  <Select 
                    value={formData.client_type} 
                    onValueChange={(value: "minorista" | "mayorista" | "personalizado") => 
                      handleInputChange("client_type", value)
                    }
                  >
                    <SelectTrigger className={errors.client_type ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minorista">Minorista</SelectItem>
                      <SelectItem value="mayorista">Mayorista</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.client_type && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.client_type}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    Nombre Completo *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ej: María González"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Ej: maria.gonzalez@gmail.com"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    Teléfono *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Ej: +54 11 4567-8900"
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Ubicación */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-1.5 bg-turquoise-100 dark:bg-turquoise-900/20 rounded-md">
                  <MapPin className="h-4 w-4 text-turquoise-600 dark:text-turquoise-400" />
                </div>
                Información de Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  Dirección
                </Label>
                <Input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Ej: Av. Industrial 567, Zona Tecnológica"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    Ciudad *
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="Ej: Córdoba"
                    className={errors.city ? "border-red-500" : ""}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.city}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    País *
                  </Label>
                  <Input
                    id="country"
                    type="text"
                    value={formData.country}
                    onChange={(e) => handleInputChange("country", e.target.value)}
                    placeholder="Ej: Argentina"
                    className={errors.country ? "border-red-500" : ""}
                  />
                  {errors.country && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mensajes de Error y Éxito */}
          {errors.submit && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-turquoise-50 dark:bg-turquoise-900/20 border border-turquoise-200 dark:border-turquoise-800 rounded-lg">
              <CheckCircle className="h-4 w-4 text-turquoise-600 dark:text-turquoise-400 flex-shrink-0" />
              <p className="text-sm text-turquoise-600 dark:text-turquoise-400">{successMessage}</p>
            </div>
          )}

          <Separator />

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 bg-turquoise-600 hover:bg-turquoise-700"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
