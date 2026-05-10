"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Shield, Users, Key, Receipt, FileText } from "lucide-react"
import { RolesManagement } from "@/components/roles-management"
import { UsersManagement } from "@/components/users-management"
import { ExceptionPermissions } from "@/components/exception-permissions"
import { Alert } from "@/components/ui/alert"
import { getPosApiKey } from "@/lib/api"
import { FACTURACION_STORAGE_KEYS, normalizeCuitEmisor } from "@/lib/facturacion-settings"

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
          La API Key se usa para registrar ventas en local (POST /api/sales). Obtenela en el panel de administración del ERP y guardala aquí. Se guarda solo en este navegador. También podés definir <code className="text-xs bg-muted px-1 rounded">NEXT_PUBLIC_POS_API_KEY</code> en tu entorno para no depender del navegador.
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

function ArcaFacturacionSettingsCard() {
  const [cuit, setCuit] = useState("")
  const [puntoVenta, setPuntoVenta] = useState("")
  const [facturadorApiKey, setFacturadorApiKey] = useState("")
  const [saved, setSaved] = useState(false)
  const [cuitError, setCuitError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    setCuit(localStorage.getItem(FACTURACION_STORAGE_KEYS.CUIT_EMISOR) || "")
    setPuntoVenta(localStorage.getItem(FACTURACION_STORAGE_KEYS.PUNTO_VENTA) || "")
    setFacturadorApiKey(localStorage.getItem(FACTURACION_STORAGE_KEYS.FACTURADOR_API_KEY) || "")
  }, [])

  function handleSave() {
    if (typeof window === "undefined") return
    setCuitError(null)

    const trimmedCuit = cuit.trim()
    let normCuit: string | null = null
    if (trimmedCuit) {
      normCuit = normalizeCuitEmisor(trimmedCuit)
      if (!normCuit) {
        setCuitError("El CUIT emisor debe tener 11 dígitos (podés escribirlo con o sin guiones).")
        return
      }
    }

    const pv = puntoVenta.trim()
    if (pv) {
      const n = parseInt(pv, 10)
      if (!Number.isFinite(n) || n < 1 || n > 99999) {
        setCuitError("Punto de venta inválido: usá un número entre 1 y 99999.")
        return
      }
    }

    if (normCuit) localStorage.setItem(FACTURACION_STORAGE_KEYS.CUIT_EMISOR, normCuit)
    else localStorage.removeItem(FACTURACION_STORAGE_KEYS.CUIT_EMISOR)

    if (pv) localStorage.setItem(FACTURACION_STORAGE_KEYS.PUNTO_VENTA, String(parseInt(pv, 10)))
    else localStorage.removeItem(FACTURACION_STORAGE_KEYS.PUNTO_VENTA)

    const keyTrim = facturadorApiKey.trim()
    if (keyTrim) localStorage.setItem(FACTURACION_STORAGE_KEYS.FACTURADOR_API_KEY, keyTrim)
    else localStorage.removeItem(FACTURACION_STORAGE_KEYS.FACTURADOR_API_KEY)

    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div className="space-y-4">
      <Alert
        variant="warning"
        title="Seguridad y backend"
        description={
          <span>
            La clave del API facturador es un secreto: guardarla solo en el navegador es útil para pruebas o entornos controlados.
            En producción lo recomendable es que MF API la obtenga de variables de entorno (<code className="rounded bg-muted px-1 text-xs">FACTURADOR_API_KEY</code>) o de un almacén seguro en servidor.
          </span>
        }
      />

      <Alert
        variant="info"
        title="Qué debe hacer el equipo de MF API (backend)"
        description={
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>
              <strong>CUIT emisor y punto de venta:</strong> el frontend puede enviarlos en el body de{" "}
              <code className="rounded bg-muted px-1 text-xs">POST /api/sales/:id/facturar</code> como{" "}
              <code className="rounded bg-muted px-1 text-xs">cuitEmisor</code> y{" "}
              <code className="rounded bg-muted px-1 text-xs">puntoVenta</code> (ya contemplado en la doc). Si no vienen, seguir usando{" "}
              <code className="rounded bg-muted px-1 text-xs">FACTURADOR_CUIT_EMISOR</code> /{" "}
              <code className="rounded bg-muted px-1 text-xs">FACTURADOR_PUNTO_VENTA</code>.
            </li>
            <li>
              <strong>Clave del facturador:</strong> hoy el cliente puede enviar la cabecera opcional{" "}
              <code className="rounded bg-muted px-1 text-xs">x-facturador-api-key</code> si la guardaste aquí.
              El backend debe implementar explícitamente: si esa cabecera llega en una petición autenticada autorizada, usarla al llamar al servicio de facturación; si no, usar{" "}
              <code className="rounded bg-muted px-1 text-xs">FACTURADOR_API_KEY</code>.
              Alternativa más segura: endpoints de administración{" "}
              <code className="rounded bg-muted px-1 text-xs">GET/PUT /api/settings/facturacion</code> que persistan la clave cifrada y nunca la devuelvan completas al cliente.
            </li>
            <li>
              <strong>URL del facturador:</strong> no debe configurarse en el navegador hacia un dominio público del facturador; MF API debe resolver la URL base (env{" "}
              <code className="rounded bg-muted px-1 text-xs">FACTURADOR_URL</code> o similar).
            </li>
          </ul>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Facturación ARCA</CardTitle>
          <CardDescription>
            Estos valores se guardan solo en este navegador. Se aplican automáticamente al emitir comprobantes (
            <code className="rounded bg-muted px-1 text-xs">cuitEmisor</code>,{" "}
            <code className="rounded bg-muted px-1 text-xs">puntoVenta</code> en el POST y cabecera opcional para la clave del facturador).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="arca-cuit-emisor">CUIT emisor</Label>
            <Input
              id="arca-cuit-emisor"
              placeholder="30-12345678-9"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              className="max-w-md font-mono"
              autoComplete="off"
            />
            <p className="text-muted-foreground text-xs">11 dígitos. Se normaliza sin guiones al guardar.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arca-punto-venta">Punto de venta (opcional)</Label>
            <Input
              id="arca-punto-venta"
              type="number"
              min={1}
              max={99999}
              placeholder="Ej: 1"
              value={puntoVenta}
              onChange={(e) => setPuntoVenta(e.target.value)}
              className="max-w-xs font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Equivale a <code className="rounded bg-muted px-1 text-xs">puntoVenta</code> en el body; si está vacío, usa la configuración del servidor.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arca-facturador-api-key">API Key del facturador</Label>
            <Input
              id="arca-facturador-api-key"
              type="password"
              placeholder="Clave que usa MF API contra el servicio de facturación"
              value={facturadorApiKey}
              onChange={(e) => setFacturadorApiKey(e.target.value)}
              className="max-w-md font-mono"
              autoComplete="new-password"
            />
            <p className="text-muted-foreground text-xs">
              Si completás este campo, las llamadas a facturar envían la cabecera{" "}
              <code className="rounded bg-muted px-1 text-xs">x-facturador-api-key</code>. MF API debe soportarla o ignorarla según su diseño.
            </p>
          </div>

          {cuitError ? (
            <Alert variant="error" title="Revisá los datos" description={cuitError} />
          ) : null}

          <Button onClick={handleSave}>{saved ? "Guardado" : "Guardar configuración ARCA"}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConfiguracionPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<string>(() =>
    tabParam === "pos" ? "pos" : tabParam === "facturacion" ? "facturacion" : "roles"
  )

  useEffect(() => {
    if (tabParam === "pos") setActiveTab("pos")
    if (tabParam === "facturacion") setActiveTab("facturacion")
  }, [tabParam])

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex h-auto w-full flex-wrap justify-stretch gap-1 bg-muted p-1 md:grid md:grid-cols-5">
              <TabsTrigger value="roles" className="flex flex-1 items-center gap-2">
                <Key className="h-4 w-4 shrink-0" />
                <span className="truncate">Roles</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex flex-1 items-center gap-2">
                <Users className="h-4 w-4 shrink-0" />
                <span className="truncate">Usuarios</span>
              </TabsTrigger>
              <TabsTrigger value="exceptions" className="flex flex-1 items-center gap-2">
                <Shield className="h-4 w-4 shrink-0" />
                <span className="truncate">Excepciones</span>
              </TabsTrigger>
              <TabsTrigger value="facturacion" className="flex flex-1 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">Facturación ARCA</span>
              </TabsTrigger>
              <TabsTrigger value="pos" className="flex flex-1 items-center gap-2">
                <Receipt className="h-4 w-4 shrink-0" />
                <span className="truncate">Punto de venta</span>
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

            <TabsContent value="facturacion" className="space-y-4">
              <ArcaFacturacionSettingsCard />
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

