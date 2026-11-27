'use client'

import { useCallback, useEffect, useState } from 'react'
import { internalApi } from '@/lib/internal-api'

type Capster={id_capster:number;nama_capster:string;status_aktif:boolean;tersedia:boolean;akun_aktif:boolean;akun_terdaftar:boolean}

export function AdminCapstersPage(){
  const [capsters,setCapsters]=useState<Capster[]>([])
  const [loading,setLoading]=useState(true)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const refresh=useCallback(async()=>{setLoading(true);setError('');try{const result=await internalApi<{capsters:Capster[]}>('/api/internal/capsters');setCapsters(result.capsters.filter(c=>c.status_aktif&&c.akun_aktif&&c.akun_terdaftar))}catch(e){setError(e instanceof Error?e.message:'Data capster gagal dimuat.')}finally{setLoading(false)}},[])
  useEffect(()=>{void refresh()},[refresh])
  async function toggle(c:Capster){setBusy(true);setError('');setNotice('');try{await internalApi(`/api/internal/capsters/${c.id_capster}/availability`,{method:'PATCH',body:JSON.stringify({tersedia:!c.tersedia})});setNotice(`${c.nama_capster}: ${c.tersedia?'tidak tersedia':'tersedia'}.`);await refresh()}catch(e){setError(e instanceof Error?e.message:'Status ketersediaan gagal diperbarui.')}finally{setBusy(false)}}
  return <div className="space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Operasional</p><h1 className="mt-1 text-3xl font-bold">Atur Capster</h1><p className="mt-2 text-sm text-muted-foreground">Daftar hanya menampilkan akun capster aktif. Capster yang tidak tersedia tidak dapat dipilih untuk booking baru atau transaksi walk-in.</p></header>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <section className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border p-4"><h2 className="font-semibold">Akun capster aktif</h2><p className="mt-1 text-xs text-muted-foreground">Ubah ketersediaan untuk mengatur apakah capster dapat dibooking.</p></div>{loading?<p className="p-5 text-sm text-muted-foreground">Memuat capster...</p>:capsters.length?<div className="divide-y divide-border">{capsters.map(c=><div key={c.id_capster} className="flex items-center justify-between gap-3 px-4 py-3"><div><p className="font-medium">{c.nama_capster}</p><p className="text-xs text-muted-foreground">Akun aktif</p></div><button disabled={busy} onClick={()=>void toggle(c)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${c.tersedia?'bg-green-100 text-green-800':'bg-muted text-muted-foreground'}`}>{c.tersedia?'Tersedia':'Tidak tersedia'} · ubah</button></div>)}</div>:<p className="p-5 text-sm text-muted-foreground">Belum ada akun capster aktif.</p>}</section>
  </div>
}
