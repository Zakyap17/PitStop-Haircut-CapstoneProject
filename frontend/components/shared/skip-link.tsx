/** Tautan pertama di halaman: pengguna keyboard/pembaca layar bisa langsung melompat ke isi utama. */
export function SkipLink() {
  return (
    <a
      href="#konten"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:rounded-full focus:bg-foreground focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-background"
    >
      Lewati ke konten utama
    </a>
  )
}
