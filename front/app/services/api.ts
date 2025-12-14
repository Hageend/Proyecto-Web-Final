/**
 * SERVICIO DE API
 * ------------------------------------------------
 * Maneja automáticamente la resolución de URLs
 */

const isServer = typeof window === "undefined";

// CONFIGURACIÓN
const INTERNAL_API_URL = "http://127.0.0.1:8000"; // Server-to-Server
const PUBLIC_API_PREFIX = "/api";                 // Client-to-Proxy

export async function apiFetch<T = any>(endpoint: string, init?: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  
  let finalUrl: string;

  if (isServer) {
      finalUrl = `${INTERNAL_API_URL}${cleanEndpoint}`;
  } else {
      finalUrl = `${PUBLIC_API_PREFIX}${cleanEndpoint}`;
  }

  const response = await fetch(finalUrl, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "Unknown error");
    console.error(`[API Error] ${response.status} en ${finalUrl}:`, errorBody);
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}