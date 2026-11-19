import type { Metadata } from 'next'
import { GalleryGrid } from '@/components/gallery/gallery-grid'
import { PageShell } from '@/components/pages/page-shell'

export const metadata: Metadata = {
  title: 'Galeri Gaya Rambut — Pit Stop Barbershop',
  description: 'Galeri hasil potongan Pit Stop Barbershop: fade, klasik, korean, anak, dan grooming. Pilih gaya favoritmu lalu reservasi.',
  alternates: { canonical: '/galeri' },
}

export default function GalleryPage() {
  return (
    <PageShell
      eyebrow="Portofolio"
      title={
        <>
          Galeri <em className="text-accent">gaya</em> rambut
        </>
      }
      intro="Semua hasil potongan dari kapster kami. Pilih kategori, buka fotonya, lalu coba gayanya di Try-On atau langsung reservasi."
    >
      <GalleryGrid />
    </PageShell>
  )
}
