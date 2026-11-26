'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { internalApi, type InternalUser } from '@/lib/internal-api'

type Row = Record<string, unknown>
export type ModuleKey = 'bookings' | 'payments' | 'transactions' | 'customers' | 'services' | 'staff' | 'expenses' | 'dp-settings' | 'gallery' | 'reports' | 'audit' | 'schedule' | 'history' | 'earnings'
const config: Record<ModuleKey, { title: string; subtitle: string; endpoint: string; key: string; columns: string[] }> = {
  bookings: { title: 'Booking online', subtitle: 'Pantau booking customer dan status pembayaran DP.', endpoint: '/api/internal/bookings', key: 'bookings', columns: ['kode_booking','tanggal_booking','jam_mulai','nama_customer','no_whatsapp','layanan','nama_capster','status_booking','total_harga','nominal_dp'] },
  payments: { title: 'Pembayaran DP', subtitle: 'Pantau status pembayaran booking.', endpoint: '/api/internal/payments', key: 'payments', columns: ['kode_booking','nama_customer','jenis_pembayaran','nominal','metode_pembayaran','status_pembayaran','waktu_bayar'] },
  transactions: { title: 'Transaksi', subtitle: 'Catat transaksi walk-in dan lihat transaksi yang tersimpan.', endpoint: '/api/internal/transactions', key: 'transactions', columns: ['kode_transaksi','created_at','jenis_transaksi','nama_customer','layanan','nama_capster','kasir','total_tagihan','total_dibayar','status_transaksi','metode_pembayaran'] },
  customers: { title: 'Pelanggan', subtitle: 'Informasi pelanggan untuk kebutuhan operasional internal.', endpoint: '/api/internal/customers', key: 'customers', columns: ['nama_customer','no_whatsapp','jumlah_booking','jumlah_transaksi','created_at'] },
  services: { title: 'Layanan', subtitle: 'Daftar layanan dan harga yang digunakan operasional.', endpoint: '/api/internal/services', key: 'services', columns: ['nama_layanan','deskripsi','harga','durasi_menit','status_aktif'] },
  staff: { title: 'Akun staf', subtitle: 'Kelola akses Admin/Cashier dan Capster.', endpoint: '/api/internal/staff', key: 'staff', columns: ['nama_lengkap','email','role','nama_capster','spesialisasi','status_aktif'] },
  expenses: { title: 'Pengeluaran', subtitle: 'Catat dan pantau biaya usaha.', endpoint: '/api/internal/expenses', key: 'expenses', columns: ['tanggal_pengeluaran','kategori','deskripsi','nominal'] },
  'dp-settings': { title: 'Pengaturan DP', subtitle: 'Atur persentase DP beserta tanggal mulai berlaku.', endpoint: '/api/internal/dp-settings', key: 'setting', columns: ['persentase_dp','berlaku_sejak'] },
  gallery: { title: 'Galeri', subtitle: 'Kelola referensi model rambut yang disimpan pada database.', endpoint: '/api/internal/gallery', key: 'gallery', columns: ['judul','file_gambar','created_at'] },
  reports: { title: 'Laporan operasional', subtitle: 'Ringkasan transaksi, pendapatan, pengeluaran, dan pelanggan per hari.', endpoint: '/api/internal/reports', key: 'reports', columns: ['tanggal','pendapatan','pengeluaran','jumlah_transaksi','pelanggan'] },
  audit: { title: 'Jejak audit', subtitle: 'Catatan aktivitas internal yang tersimpan.', endpoint: '/api/internal/audit', key: 'audit', columns: ['waktu','nama_lengkap','aksi','jenis_objek','id_objek'] },
  schedule: { title: 'Jadwal saya', subtitle: 'Booking yang ditugaskan kepada Anda.', endpoint: '/api/internal/capster/schedule', key: 'schedule', columns: ['tanggal_booking','jam_mulai','nama_customer','no_whatsapp','layanan','status_booking','status_layanan'] },
  history: { title: 'Riwayat layanan', subtitle: 'Layanan yang sudah diselesaikan.', endpoint: '/api/internal/capster/history', key: 'history', columns: ['tanggal_booking','jam_mulai','kode_booking','nama_customer','layanan','status_booking'] },
  earnings: { title: 'Pendapatan saya', subtitle: 'Estimasi rekap sesuai rumus blueprint: Rp100.000 + Rp10.000 per pelanggan dilayani.', endpoint: '/api/internal/capster/earnings', key: 'earnings', columns: ['period','customers','earnings'] },
}
const labels: Record<string, string> = {
  kode_booking:'Kode booking',tanggal_booking:'Tanggal',jam_mulai:'Jam',nama_customer:'Pelanggan',no_whatsapp:'WhatsApp',layanan:'Layanan',nama_capster:'Capster',
  status_booking:'Status booking',total_harga:'Total',nominal_dp:'DP',jenis_pembayaran:'Jenis',nominal:'Nominal',metode_pembayaran:'Metode',status_pembayaran:'Status pembayaran',
  waktu_bayar:'Dibayar pada',kode_transaksi:'Kode transaksi',created_at:'Dibuat',jenis_transaksi:'Jenis transaksi',kasir:'Kasir',total_tagihan:'Tagihan',total_dibayar:'Terbayar',status_transaksi:'Status',
  jumlah_booking:'Booking',jumlah_transaksi:'Transaksi',nama_layanan:'Layanan',deskripsi:'Deskripsi',harga:'Harga',durasi_menit:'Durasi (menit)',status_aktif:'Aktif',nama_lengkap:'Nama',email:'Email',role:'Role',spesialisasi:'Spesialisasi',
  tanggal_pengeluaran:'Tanggal',kategori:'Kategori',pengeluaran:'Pengeluaran',persentase_dp:'DP (%)',berlaku_sejak:'Berlaku sejak',judul:'Judul',file_gambar:'Referensi gambar',tanggal:'Tanggal',pendapatan:'Pendapatan',pelanggan:'Pelanggan',
  waktu:'Waktu',aksi:'Aksi',jenis_objek:'Objek',id_objek:'ID objek',period:'Periode',customers:'Pelanggan dilayani',status_layanan:'Status layanan',
}
const titles = (key: string) => labels[key] || key
const jakartaToday = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const showValue = (value: unknown, key: string) => {
  if (value == null || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak'
  if (['harga','total_harga','nominal_dp','nominal','total_tagihan','total_dibayar','pendapatan','pengeluaran','earnings'].includes(key)) return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(value))
  if (typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value))) return new Date(value).toLocaleString('id-ID')
  return String(value)
}
const box = 'rounded-lg border border-input bg-background px-3 py-2.5 text-sm'
const button = 'rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60'

export function InternalModulePage({ module, area }: { module: ModuleKey; area: 'admin' | 'owner' | 'capster' }) {
  const definition = config[module]
  const [rows, setRows] = useState<Row[]>([])
  const [user, setUser] = useState<InternalUser | null>(null)
  const [services, setServices] = useState<Row[]>([])
  const [capsters, setCapsters] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [reportEnd, setReportEnd] = useState(jakartaToday)
  const [reportStart, setReportStart] = useState(() => `${jakartaToday().slice(0,4)}-01-01`)
  const canManage = area === 'owner'

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const endpoint=module==='reports'?`${definition.endpoint}?start=${reportStart}&end=${reportEnd}`:definition.endpoint
      const result = await internalApi<Record<string, unknown>>(endpoint)
      const value = result[definition.key]
      setRows(Array.isArray(value) ? value as Row[] : value && typeof value === 'object' ? [value as Row] : [])
      const current = await internalApi<{ user: InternalUser }>('/api/internal/auth/me'); setUser(current.user)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Data gagal dimuat.') }
    finally { setLoading(false) }
  }, [definition.endpoint, definition.key, module, reportStart, reportEnd])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (module !== 'transactions') return
    internalApi<{ services: Row[] }>('/api/internal/services').then((data) => setServices(data.services)).catch(() => undefined)
    internalApi<{ capsters: Row[] }>('/api/internal/capsters').then((data) => setCapsters(data.capsters.filter((item) => item.status_aktif))).catch(() => undefined)
  }, [module])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const value = (key: string) => String(form.get(key) || '').trim()
    let url = definition.endpoint; let method = 'POST'; let body: Record<string, unknown> = {}
    if (module === 'services') body = { name: value('name'), description: value('description'), price: Number(value('price')), durationMinutes: Number(value('durationMinutes')) }
    else if (module === 'staff') body = { name: value('name'), email: value('email'), password: value('password'), role: value('role'), capsterName: value('capsterName') || value('name') }
    else if (module === 'expenses') body = { category: value('category'), description: value('description'), amount: Number(value('amount')), date: value('date') }
    else if (module === 'dp-settings') body = { percent: Number(value('percent')), effectiveDate: value('effectiveDate') }
    else if (module === 'gallery') body = { title: value('title'), image: value('image') }
    else if (module === 'transactions') body = { customerName: value('customerName'), whatsapp: value('whatsapp'), capsterId: Number(value('capsterId')), serviceIds: form.getAll('serviceIds').map(Number), paymentMethod: value('paymentMethod') }
    else return
    if (module === 'transactions') url += '/walk-in'
    try {
      const result = await internalApi<{ transaction?: { kode_transaksi?: string } }>(url, { method, body: JSON.stringify(body) })
      setNotice(result.transaction?.kode_transaksi ? `Transaksi ${result.transaction.kode_transaksi} berhasil disimpan.` : 'Perubahan berhasil disimpan.')
      formElement.reset(); await refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Simpan gagal.') }
    finally { setBusy(false) }
  }

  async function updateRecord(url: string, method: string, body?: unknown) {
    try { await internalApi(url, { method, body: body == null ? undefined : JSON.stringify(body) }); setNotice('Perubahan berhasil disimpan.'); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Perubahan gagal.') }
  }
  async function recordExport(format: 'csv' | 'pdf') {
    await internalApi('/api/internal/reports/export',{method:'POST',body:JSON.stringify({start:reportStart,end:reportEnd,format})})
  }
  async function exportCsv() {
    try { await recordExport('csv') } catch(cause) { setError(cause instanceof Error?cause.message:'Ekspor gagal dicatat.'); return }
    const csvCell = (value: string) => `"${(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value).replaceAll('"','""')}"`
    const csv = [definition.columns.map(titles).join(','), ...rows.map((row) => definition.columns.map((column) => csvCell(String(showValue(row[column],column)))).join(','))].join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'})); const link = document.createElement('a'); link.href=url; link.download=`pitstop-${module}.csv`; link.click(); URL.revokeObjectURL(url)
  }
  async function printReport() {
    try { await recordExport('pdf'); window.print() } catch(cause) { setError(cause instanceof Error?cause.message:'Ekspor gagal dicatat.') }
  }

  const form = useMemo(() => {
    if (module === 'services' && canManage) return <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"><h2 className="sm:col-span-2 font-semibold">Tambah layanan</h2><input name="name" required placeholder="Nama layanan" className={box}/><input name="price" type="number" min="0" required placeholder="Harga (Rp)" className={box}/><input name="durationMinutes" type="number" min="1" required placeholder="Durasi menit" className={box}/><input name="description" placeholder="Deskripsi (opsional)" className={box}/><button className={button} disabled={busy}>Simpan layanan</button></form>
    if (module === 'staff' && canManage) return <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"><h2 className="sm:col-span-2 font-semibold">Buat akun staf</h2><input name="name" required placeholder="Nama lengkap" className={box}/><input name="email" required type="email" placeholder="Email" className={box}/><input name="password" required minLength={10} type="password" placeholder="Password awal (min. 10 karakter)" className={box}/><select name="role" className={box}><option value="admin">Admin / Cashier</option><option value="capster">Capster</option></select><button className={button} disabled={busy}>Buat akun</button></form>
    if (module === 'expenses' && canManage) return <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"><h2 className="sm:col-span-2 font-semibold">Catat pengeluaran</h2><input name="category" required placeholder="Kategori" className={box}/><input name="amount" required min="1" type="number" placeholder="Nominal (Rp)" className={box}/><input name="date" required type="date" defaultValue={new Date().toISOString().slice(0,10)} className={box}/><input name="description" placeholder="Keterangan" className={box}/><button className={button} disabled={busy}>Simpan pengeluaran</button></form>
    if (module === 'dp-settings' && canManage) return <><p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Catatan: blueprint menetapkan DP Rp25.000 per booking, sedangkan tabel pengaturan menyimpan persentase. Nilai persentase di sini dicatat, tetapi belum mengubah nominal DP booking.</p><form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-3"><h2 className="sm:col-span-3 font-semibold">Tambah aturan persentase DP</h2><input name="percent" required type="number" min="0.01" max="100" step="0.01" placeholder="Persentase DP" className={box}/><input name="effectiveDate" required type="date" className={box}/><button className={button} disabled={busy}>Simpan pengaturan</button></form></>
    if (module === 'gallery' && canManage) return <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-3"><h2 className="sm:col-span-3 font-semibold">Tambah referensi galeri</h2><input name="title" required placeholder="Judul" className={box}/><input name="image" required placeholder="Path/URL gambar" className={box}/><button className={button} disabled={busy}>Simpan item</button></form>
    if (module === 'transactions') return <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2"><h2 className="sm:col-span-2 font-semibold">Catat transaksi walk-in</h2><input name="customerName" required placeholder="Nama pelanggan" className={box}/><input name="whatsapp" required placeholder="Nomor WhatsApp" className={box}/><select name="capsterId" required className={box}><option value="">Pilih capster</option>{capsters.map((item)=><option key={String(item.id_capster)} value={String(item.id_capster)}>{String(item.nama_capster)}</option>)}</select><select name="paymentMethod" required className={box}><option value="">Metode pembayaran</option>{['Tunai','QRIS','Transfer Bank'].map((item)=><option key={item}>{item}</option>)}</select><fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-medium">Pilih layanan</legend><div className="grid gap-2 sm:grid-cols-2">{services.map((item)=><label key={String(item.id_layanan)} className="flex gap-2 text-sm"><input type="checkbox" name="serviceIds" value={String(item.id_layanan)}/>{String(item.nama_layanan)} · {showValue(item.harga,'harga')}</label>)}</div></fieldset><button className={button} disabled={busy}>Simpan transaksi</button></form>
    return null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module, canManage, busy, services, capsters, submit])

  return <>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">{area === 'capster' ? 'Ruang kerja capster' : area === 'owner' ? 'Manajemen usaha' : 'Operasional'}</p><h1 className="mt-1 text-3xl font-bold">{definition.title}</h1><p className="mt-2 text-sm text-muted-foreground">{definition.subtitle}</p></div>{module === 'reports' && <div className="flex flex-wrap items-end gap-2"><label className="text-xs text-muted-foreground">Dari<input type="date" value={reportStart} onChange={(event)=>setReportStart(event.target.value)} className={`${box} mt-1 block`}/></label><label className="text-xs text-muted-foreground">Sampai<input type="date" value={reportEnd} onChange={(event)=>setReportEnd(event.target.value)} className={`${box} mt-1 block`}/></label><button onClick={() => void exportCsv()} className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm">Ekspor CSV</button><button onClick={() => void printReport()} className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm">Cetak / Simpan PDF</button></div>}</div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {form}
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">{definition.title}</h2></div>
      {loading ? <p className="p-5 text-sm text-muted-foreground">Memuat data…</p> : rows.length === 0 ? <p className="p-5 text-sm text-muted-foreground">Belum ada data.</p> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-background text-xs text-muted-foreground"><tr>{definition.columns.map((column)=><th key={column} className="px-4 py-3 font-medium">{titles(column)}</th>)}{['schedule','staff','services','gallery','bookings'].includes(module)&&<th className="px-4 py-3 font-medium">Aksi</th>}</tr></thead>
          <tbody>{rows.map((row,index)=><tr key={String(row.id_booking ?? row.id_transaksi ?? row.id_pengguna ?? row.id_layanan ?? row.id_pengeluaran ?? row.id_galeri ?? row.id_pembayaran ?? row.id_customer ?? row.id_riwayat ?? index)} className="border-t border-border">
            {definition.columns.map((column)=><td key={column} className="max-w-[280px] px-4 py-3">{showValue(row[column],column)}</td>)}
            {module==='schedule'&&<td className="px-4 py-3"><div className="flex gap-2">
              {['menunggu','menunggu antrean','dikonfirmasi','terkonfirmasi','confirmed'].includes(String(row.status_booking))&&!['layanan dimulai','layanan selesai'].includes(String(row.status_layanan))&&<button className="text-xs font-semibold text-primary" onClick={()=>updateRecord(row.id_transaksi?`/api/internal/capster/transactions/${row.id_transaksi}/status`:`/api/internal/capster/bookings/${row.id_booking}/status`,'PATCH',{action:'start'})}>Mulai</button>}
              {row.status_layanan==='layanan dimulai'&&<button className="text-xs font-semibold text-primary" onClick={()=>updateRecord(row.id_transaksi?`/api/internal/capster/transactions/${row.id_transaksi}/status`:`/api/internal/capster/bookings/${row.id_booking}/status`,'PATCH',{action:'complete'})}>Selesai</button>}
              {!row.id_transaksi&&['dikonfirmasi','terkonfirmasi','confirmed','menunggu antrean'].includes(String(row.status_booking))&&!['layanan dimulai','layanan selesai'].includes(String(row.status_layanan))&&String(row.tanggal_booking).slice(0,10)===new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())&&<button className="text-xs text-red-700" onClick={()=>updateRecord(`/api/internal/capster/bookings/${row.id_booking}/status`,'PATCH',{action:'no-show'})}>Tidak hadir</button>}
            </div></td>}
            {module==='bookings'&&<td className="px-4 py-3"><div className="flex gap-2">
              {row.status_layanan==='layanan selesai'&&<button className="text-xs font-semibold text-primary" onClick={()=>{const paymentMethod=window.prompt('Metode pelunasan: Tunai, QRIS, atau Transfer Bank','Tunai');if(paymentMethod)void updateRecord(`/api/internal/bookings/${row.id_booking}/settle`,'POST',{paymentMethod})}}>Catat pelunasan</button>}
              {row.status_booking==='tidak_hadir'&&String(row.tanggal_booking).slice(0,10)===new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())&&<button className="text-xs font-semibold text-primary" onClick={()=>updateRecord(`/api/internal/bookings/${row.id_booking}/queue-return`,'POST')}>Masukkan ke antrean</button>}
            </div></td>}
            {module==='staff'&&canManage&&<td className="px-4 py-3"><button className="text-xs text-primary" onClick={()=>updateRecord(`/api/internal/staff/${row.id_pengguna}/status`,'PATCH',{active:!row.status_aktif})}>{row.status_aktif?'Nonaktifkan':'Aktifkan'}</button></td>}
            {module==='services'&&canManage&&<td className="px-4 py-3"><div className="flex gap-3"><button className="text-xs font-medium text-primary" onClick={()=>{const price=window.prompt('Harga layanan baru (Rp)',String(row.harga??''));if(price!==null&&price.trim()!==''&&Number.isFinite(Number(price)))void updateRecord(`/api/internal/services/${row.id_layanan}`,'PATCH',{price:Number(price)})}}>Ubah harga</button><button className="text-xs text-primary" onClick={()=>updateRecord(`/api/internal/services/${row.id_layanan}`,'PATCH',{active:!row.status_aktif})}>{row.status_aktif?'Nonaktifkan':'Aktifkan'}</button></div></td>}
            {module==='gallery'&&canManage&&<td className="px-4 py-3"><button className="text-xs text-red-700" onClick={()=>updateRecord(`/api/internal/gallery/${row.id_galeri}`,'DELETE')}>Hapus</button></td>}
          </tr>)}</tbody>
        </table></div>
      )}
    </section>
    {user?.role==='owner' && module==='services' && <p className="text-xs text-muted-foreground">Perubahan harga berlaku untuk transaksi berikutnya. Snapshot transaksi lama tetap tersimpan.</p>}
  </>
}
