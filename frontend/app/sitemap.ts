import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/layanan`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/kapster`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/galeri`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/cek-reservasi`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
