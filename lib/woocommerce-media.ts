import { getApiUrl } from "@/config/api"

const API_BASE = typeof window !== "undefined" ? getApiUrl() : ""
const API_KEY = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_API_KEY : ""

export interface WordPressMediaUpload {
  id: number
  source_url: string
}

const MAX_FILES = 10
const MAX_SIZE_MB = 10
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]

/**
 * Sube una o más imágenes a la galería de WordPress/WooCommerce.
 * Límite: 10 archivos por request, 10 MB por archivo. Formatos: jpeg, png, gif, webp.
 * Auth: header X-API-Key.
 */
const ENV_ERROR_MESSAGE =
  "No se puede subir a WooCommerce: faltan NEXT_PUBLIC_API_URL o NEXT_PUBLIC_API_KEY. " +
  "En producción deben estar en el panel de tu hosting (ej. Vercel) y hay que volver a desplegar para que se incluyan en el build."

export async function uploadImagesToWordPress(
  files: File[]
): Promise<WordPressMediaUpload[]> {
  if (!API_BASE || !API_KEY) {
    throw new Error(ENV_ERROR_MESSAGE)
  }
  if (!files.length) return []
  if (files.length > MAX_FILES) {
    throw new Error(`Máximo ${MAX_FILES} archivos por solicitud`)
  }

  for (const file of files) {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`La imagen ${file.name} supera los ${MAX_SIZE_MB} MB`)
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(
        `Solo se permiten imágenes (jpeg, png, gif, webp). ${file.name} no es válido.`
      )
    }
  }

  const formData = new FormData()
  files.forEach((file) => formData.append("files", file))

  const res = await fetch(`${API_BASE}woocommerce/media`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      (err as { message?: string }).message || "Error subiendo imágenes"
    )
  }

  const data = (await res.json()) as {
    data?: { uploads?: WordPressMediaUpload[] }
  }
  const uploads = data.data?.uploads ?? []
  return uploads
}
