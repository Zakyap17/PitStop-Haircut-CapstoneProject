'use client'

import { createContext, useContext } from 'react'
import type { Catalog } from '@/types/catalog'

const CatalogContext = createContext<Catalog | null>(null)

/** Membagikan katalog dari server ke komponen client (form reservasi, galeri, Try-On, dst.). Diisi oleh layout (customer). */
export function CatalogProvider({ catalog, children }: { catalog: Catalog; children: React.ReactNode }) {
  return <CatalogContext.Provider value={catalog}>{children}</CatalogContext.Provider>
}

export function useCatalog(): Catalog {
  const catalog = useContext(CatalogContext)
  if (!catalog) throw new Error('useCatalog harus dipakai di dalam CatalogProvider (app/(customer)/layout.tsx).')
  return catalog
}
