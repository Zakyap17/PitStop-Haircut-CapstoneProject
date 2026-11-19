/** Lokasi dan jam buka Pit Stop Barbershop. Satu sumber untuk halaman Lokasi, footer, dan data terstruktur SEO. */
export const location = {
  name: 'Pitstop Barbershop Dewasa dan Anak',
  street: 'Jl. Leuwi Panjang, Situsaeur',
  district: 'Kec. Bojongloa Kidul',
  city: 'Kota Bandung',
  province: 'Jawa Barat',
  postalCode: '40235',
  latitude: -6.9438977,
  longitude: 107.5958281,
  /** Tautan pendek Google Maps yang dibagikan pemilik. */
  mapsUrl: 'https://maps.app.goo.gl/hhVQXvJ6JRuaVRMk6',
  /** Jam buka setiap hari, dan jam istirahat. */
  opensAt: '10:00',
  closesAt: '21:00',
  breakFrom: '18:00',
  breakTo: '19:00',
}

export const fullAddress = `${location.street}, ${location.district}, ${location.city}, ${location.province} ${location.postalCode}`

/** Tautan petunjuk arah ke lokasi, dibuka di aplikasi Google Maps di HP. */
export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`

/** Alamat peta yang boleh ditanam (embed) tanpa API key. Alamat lama (?output=embed) dialihkan ke sini dan pengalihannya membawa larangan frame. */
export const mapEmbedUrl = `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${location.latitude},${location.longitude}!6i17`
