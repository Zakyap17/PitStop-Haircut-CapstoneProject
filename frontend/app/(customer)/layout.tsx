import { CatalogProvider } from '@/components/providers/catalog-provider'
import { getCatalog } from '@/lib/catalog'

// Katalog diambil dari backend pada tiap permintaan (di-cache 30 detik oleh Next), bukan saat build,
// sehingga build tidak butuh backend yang menyala dan perubahan dari admin cepat terlihat.
export const dynamic = 'force-dynamic'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog()
  return <CatalogProvider catalog={catalog}>{children}</CatalogProvider>
}
