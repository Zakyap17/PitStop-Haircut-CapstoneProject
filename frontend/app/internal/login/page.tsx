import type { Metadata } from 'next'
import { InternalLogin } from '@/components/internal/internal-login'

export const metadata: Metadata = { title: 'Login Internal · PitStop', robots: { index: false, follow: false } }
export default function InternalLoginPage() { return <InternalLogin /> }
