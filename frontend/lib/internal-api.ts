export const INTERNAL_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export async function internalApi<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${INTERNAL_API_URL}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Permintaan gagal (${response.status}).`)
  return payload as T
}

export type InternalUser = { id: number; name: string; email: string; role: 'owner' | 'admin' | 'capster'; capsterId?: number | null }
