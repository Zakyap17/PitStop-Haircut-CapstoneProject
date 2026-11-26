'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { internalApi, type InternalUser } from '@/lib/internal-api'

export function InternalLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await internalApi<{ user: InternalUser }>('/api/internal/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      router.replace(result.user.role === 'owner' ? '/owner' : result.user.role === 'capster' ? '/capster' : '/admin')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Login gagal.') }
    finally { setBusy(false) }
  }
  return (
    <main className="admin-theme flex min-h-svh items-center justify-center p-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm">
        <p className="mb-2 text-xs font-bold tracking-[.2em] text-primary">PITSTOP · INTERNAL</p>
        <h1 className="mb-2 text-2xl font-bold">Masuk ke sistem</h1>
        <p className="mb-6 text-sm text-muted-foreground">Login khusus staf barbershop.</p>
        <label className="mb-4 block text-sm font-medium">Email<input autoComplete="username" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2.5" /></label>
        <label className="mb-5 block text-sm font-medium">Password<span className="relative mt-1.5 block"><input autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-11" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="sr-only">{showPassword ? 'Sembunyikan password' : 'Tampilkan password'}</span>{showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}</button></span></label>
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Memeriksa…' : 'Masuk'}</button>
      </form>
    </main>
  )
}
