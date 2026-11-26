/** Gaya rambut yang dipilih pelanggan di Virtual Try-On dan dilampirkan ke reservasi. */
export type TryOnChoice = {
  name: string
  barber: string
  category: string
}

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'error'

/** Hasil analisa wajah dari AI: bentuk wajah, jenis rambut, alasan singkat, dan id gaya yang cocok (paling cocok dulu). */
export type FaceAnalysis = {
  faceShape: string
  hairType: string
  summary: string
  recommendedIds: string[]
}
