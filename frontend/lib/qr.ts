import QRCode from 'qrcode'

/** Matriks QR (true = modul gelap) untuk sebuah teks. Level koreksi M tahan terhadap sedikit kotoran atau layar kusam. */
export function buildQrMatrix(text: string): boolean[][] {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
  return Array.from({ length: modules.size }, (_, row) => Array.from({ length: modules.size }, (_, column) => modules.get(row, column) === 1))
}

/** Lebar zona tenang (dalam modul) di sekeliling QR. Standar QR minimal 4 supaya pemindai bisa mengenalinya. */
export const QR_QUIET_ZONE = 4
