"use client"

import { useState, useEffect } from "react"
import { ERPLayout } from "@/components/erp-layout"
import { Protected } from "@/components/protected"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { getCashDay } from "@/lib/cash"
import { PLAN_CUENTAS_DATA, getCuentasMovibles } from "@/lib/plan-cuentas"
import {
  BookText,
  PenLine,
  BookOpen,
  ListOrdered,
  CalendarDays,
  BarChart3,
  ArrowRight,
  DollarSign,
  FileText,
  Loader2,
  Calendar,
} from "lucide-react"

export default function ContabilidadPage() {
  const [cashDay, setCashDay] = useState<{
    incomes: number
    expenses: number
    balance: number
  } | null>(null)
  const [cashLoading, setCashLoading] = useState(true)

  useEffect(() => {
    getCashDay()
      .then((data) =>
        setCashDay({
          incomes: data.incomes,
          expenses: data.expenses,
          balance: data.balance,
        })
      )
      .catch(() => setCashDay(null))
      .finally(() => setCashLoading(false))
  }, [])

  const ejercicioActual = new Date().getFullYear()
  const totalCuentas = PLAN_CUENTAS_DATA.length
  const cuentasMovibles = getCuentasMovibles().length

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const modules = [
    {
      title: "Asientos manuales",
      description: "Registrar y consultar asientos contables manuales.",
      href: "/contabilidad/asientos",
      icon: PenLine,
    },
    {
      title: "Nuevo asiento",
      description: "Crear un nuevo asiento contable.",
      href: "/contabilidad/asientos/nuevo",
      icon: PenLine,
    },
    {
      title: "Libro diario",
      description: "Registro cronológico de todas las operaciones.",
      href: "/contabilidad/libro-diario",
      icon: BookOpen,
    },
    {
      title: "Libro mayor",
      description: "Movimientos por cuenta contable.",
      href: "/contabilidad/libro-mayor",
      icon: BookOpen,
    },
    {
      title: "Plan de cuentas",
      description: "Estructura jerárquica de cuentas contables.",
      href: "/contabilidad/plan-cuentas",
      icon: ListOrdered,
    },
    {
      title: "Ejercicios contables",
      description: "Períodos fiscales y cierres.",
      href: "/contabilidad/ejercicios",
      icon: CalendarDays,
    },
    {
      title: "Reportes",
      description: "Sumas y saldos, estado de resultados, balance.",
      href: "/contabilidad/reportes",
      icon: BarChart3,
    },
  ]

  return (
    <Protected requiredRoles={["finanzas", "admin", "gerencia"]}>
      <ERPLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookText className="h-7 w-7" />
              Contabilidad
            </h1>
            <p className="text-muted-foreground mt-1">
              Resumen del módulo contable. Integrado con ARCA (ex AFIP).
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString("es-AR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Resumen - Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ejercicio actual
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ejercicioActual}</div>
                <p className="text-xs text-muted-foreground">
                  Período fiscal vigente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Asientos del mes
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">
                  —
                </div>
                <p className="text-xs text-muted-foreground">
                  Con backend contable
                </p>
              </CardContent>
            </Card>

            <Link href="/caja">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Caja hoy
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {cashLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : cashDay ? (
                    <>
                      <div className="text-2xl font-bold">
                        {formatMoney(cashDay.balance)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ingresos {formatMoney(cashDay.incomes)} · Egresos{" "}
                        {formatMoney(cashDay.expenses)}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-muted-foreground">
                        —
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ver módulo Caja
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>

            <Link href="/contabilidad/plan-cuentas">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Plan de cuentas
                  </CardTitle>
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalCuentas} <span className="text-sm font-normal text-muted-foreground">cuentas</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cuentasMovibles} movibles
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Accesos rápidos */}
          <Card>
            <CardHeader>
              <CardTitle>Accesos rápidos</CardTitle>
              <CardDescription>
                Ir a las secciones del módulo contable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((mod) => {
                  const Icon = mod.icon
                  return (
                    <Link key={mod.href} href={mod.href}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <CardTitle className="text-base">{mod.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {mod.description}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </ERPLayout>
    </Protected>
  )
}
