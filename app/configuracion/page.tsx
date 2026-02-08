"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Users, Key, Receipt } from "lucide-react"
import { RolesManagement } from "@/components/roles-management"
import { UsersManagement } from "@/components/users-management"
import { ExceptionPermissions } from "@/components/exception-permissions"
import { getPosApiKey } from "@/lib/api"

const POS_API_KEY_STORAGE = "posApiKey"

function PosApiKeyCard() {
  const [value, setValue] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(getPosApiKey() || "")
  }, [])

  function handleSave() {
    if (typeof window === "undefined") return
    if (value.trim()) {
      localStorage.setItem(POS_API_KEY_STORAGE, value.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      localStorage.removeItem(POS_API_KEY_STORAGE)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key para Punto de venta</CardTitle>
        <CardDescription>
          La API Key se usa para registrar ventas en local (POST /api/sales). Obtenela en el panel de administración del ERP y guardala aquí. Se guarda solo en este navegador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pos-api-key">API Key</Label>
          <Input
            id="pos-api-key"
            type="password"
            placeholder="fnec_xxxxxxxx..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="max-w-md font-mono"
          />
        </div>
        <Button onClick={handleSave}>
          {saved ? "Guardado" : "Guardar API Key"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ConfiguracionPage() {
  return (
    <Protected requiredRoles={['admin', 'gerencia']}>
      <ERPLayout activeItem="configuracion">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8" />
                Configuración de Roles y Permisos
              </h1>
              <p className="text-muted-foreground">
                Gestión de usuarios, roles y permisos del sistema
              </p>
            </div>
          </div>

          {/* Tabs para las diferentes secciones */}
          <Tabs defaultValue="roles" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Roles y Permisos
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="exceptions" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Permisos Excepcionales
              </TabsTrigger>
              <TabsTrigger value="pos" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Punto de venta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Roles</CardTitle>
                  <CardDescription>
                    Asigna permisos a los diferentes roles del sistema. Los usuarios heredan los permisos de su rol.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RolesManagement />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                  <CardDescription>
                    Crea y gestiona usuarios del sistema. Asigna roles y gestiona sus permisos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UsersManagement />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exceptions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Permisos Excepcionales</CardTitle>
                  <CardDescription>
                    Extiende las funcionalidades de usuarios específicos más allá de su rol base.
                    Útil para casos especiales donde un usuario necesita permisos adicionales temporalmente.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExceptionPermissions />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pos" className="space-y-4">
              <PosApiKeyCard />
            </TabsContent>
          </Tabs>
        </div>
      </ERPLayout>
    </Protected>
  )
}

