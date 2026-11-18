import { services } from '@/data/services'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site-config'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Data terstruktur agar mesin pencari memahami bahwa ini barbershop, jam buka, dan daftar layanannya. */
export function BarbershopJsonLd() {
  const prices = services.map((service) => service.price)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BarberShop',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/images/brand/logo-mark.png`,
    priceRange: `Rp${Math.min(...prices).toLocaleString('id-ID')} - Rp${Math.max(...prices).toLocaleString('id-ID')}`,
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: DAYS, opens: '10:00', closes: '21:00' }],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Layanan',
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        priceCurrency: 'IDR',
        price: service.price,
        itemOffered: { '@type': 'Service', name: service.name, description: service.description },
      })),
    },
  }

  // "<" di-escape supaya isi JSON tidak bisa menutup tag <script> lebih awal.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
