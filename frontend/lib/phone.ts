/** Nomor seluler Indonesia: 0812..., +62812..., 62812..., 812... (spasi, strip, dan titik diabaikan). Sama dengan aturan di backend. */
export function isValidPhone(input: string): boolean {
  let digits = input.replace(/[^\d]/g, '')
  if (digits.startsWith('62')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = digits.slice(1)
  return /^8\d{8,11}$/.test(digits)
}
