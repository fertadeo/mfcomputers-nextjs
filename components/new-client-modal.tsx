"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Mail, Phone, MapPin, Building, AlertCircle, CheckCircle } from "lucide-react"
import { createCliente } from "@/lib/api"
import { SALES_CHANNEL_CONFIG } from "@/lib/utils"

interface NewClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface NewClientData {
  client_type: "minorista" | "mayorista" | "personalizado"
  sales_channel: "woocommerce_minorista" | "woocommerce_mayorista" | "mercadolibre" | "sistema_mf" | "manual" | "otro"
  name: string
  email: string
  phone: string
  address: string
  city: string
  country: string
}

export function NewClientModal({ isOpen, onClose, onSuccess }: NewClientModalProps) {
  const [formData, setFormData] = useState<NewClientData>({
    client_type: "minorista",
    sales_channel: "manual",
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    country: "Argentina"
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleInputChange = (field: keyof NewClientData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // Limpiar errores cuando el usuario empiece a escribir
    if (error) setError(null)
  }

  const validateForm = (): boolean => {
    if (!formData.client_type) {
      setError("El tipo de cliente es obligatorio")
      return false
    }
    if (!formData.sales_channel) {
      setError("El canal de venta es obligatorio")
      return false
    }
    if (!formData.name.trim()) {
      setError("El nombre es obligatorio")
      return false
    }
    if (!formData.email.trim()) {
      setError("El email es obligatorio")
      return false
    }
    if (!formData.email.includes("@")) {
      setError("El email debe tener un formato válido")
      return false
    }
    if (!formData.phone.trim()) {
      setError("El teléfono es obligatorio")
      return false
    }
    if (!formData.city.trim()) {
      setError("La ciudad es obligatoria")
      return false
    }
    if (!formData.country.trim()) {
      setError("El país es obligatorio")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      console.log('📡 [NEW CLIENT] Enviando datos:', formData)
      
      await createCliente(formData)
      
      console.log('✅ [NEW CLIENT] Cliente creado exitosamente')

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onSuccess()
        onClose()
        // Resetear formulario
        setFormData({
          client_type: "minorista",
          sales_channel: "manual",
          name: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          country: "Argentina"
        })
      }, 1500)

    } catch (err) {
      console.error('💥 [NEW CLIENT] Error al crear cliente:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido al crear el cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nuevo Cliente
          </DialogTitle>
          <DialogDescription>
            Complete la información del nuevo cliente para agregarlo al sistema
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
              <CardDescription>Datos básicos del cliente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_type">Tipo de Cliente *</Label>
                  <Select
                    value={formData.client_type}
                    onValueChange={(value) => handleInputChange("client_type", value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minorista">Minorista</SelectItem>
                      <SelectItem value="mayorista">Mayorista</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sales_channel">Canal de Venta *</Label>
                  <Select
                    value={formData.sales_channel}
                    onValueChange={(value) => handleInputChange("sales_channel", value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el canal" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SALES_CHANNEL_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span>{config.icon}</span>
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ej: Fenec Studio S.A."
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="contacto@empresa.com"
                      className="pl-8"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <div className="relative">
                    <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+54 11 4567-8900"
                      className="pl-8"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de Ubicación */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ubicación</CardTitle>
              <CardDescription>Dirección y datos de localización</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Av. Industrial 567, Zona Industrial Norte"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="Córdoba"
                      className="pl-8"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País *</Label>
                  <div className="relative">
                    <Building className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      placeholder="Argentina"
                      className="pl-8"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Mensajes de Error y Éxito */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-turquoise-50 border border-turquoise-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-turquoise-500" />
              <span className="text-turquoise-700">Cliente creado exitosamente</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando...
                </>
              ) : (
                "Crear Cliente"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
