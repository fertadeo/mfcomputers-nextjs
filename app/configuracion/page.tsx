"use client"

import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, Key } from "lucide-react"
import { RolesManagement } from "@/components/roles-management"
import { UsersManagement } from "@/components/users-management"
import { ExceptionPermissions } from "@/components/exception-permissions"

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
            <TabsList className="grid w-full grid-cols-3">
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
          </Tabs>
        </div>
      </ERPLayout>
    </Protected>
  )
}

