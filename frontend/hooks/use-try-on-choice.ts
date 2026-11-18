'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { parseTryOnChoice, readRawTryOnChoice, TRY_ON_CHANGED_EVENT } from '@/lib/try-on-storage'
import type { TryOnChoice } from '@/types/try-on'

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(TRY_ON_CHANGED_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(TRY_ON_CHANGED_EVENT, onChange)
  }
}

/** Gaya yang disimpan dari Virtual Try-On (null bila belum ada). Ikut berubah di semua komponen saat disimpan/dihapus. */
export function useTryOnChoice(): TryOnChoice | null {
  const raw = useSyncExternalStore(subscribe, readRawTryOnChoice, () => null)
  return useMemo(() => parseTryOnChoice(raw), [raw])
}
