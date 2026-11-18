/** Gaya rambut yang dipilih pelanggan di Virtual Try-On dan dilampirkan ke reservasi. */
export type TryOnChoice = {
  name: string
  barber: string
  category: string
}

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unsupported' | 'error'
