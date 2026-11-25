import type { Haircut } from '@/types/haircut'

/** Daftar kategori filter galeri: "Semua" lalu kategori yang benar-benar ada, sesuai urutan kemunculan. */
export function haircutCategories(haircuts: Haircut[]): string[] {
  return ['Semua', ...Array.from(new Set(haircuts.map((haircut) => haircut.category)))]
}
