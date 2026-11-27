import { notFound } from 'next/navigation'
import { InternalModulePage, type ModuleKey } from '@/components/internal/internal-module-page'

const modules: ModuleKey[] = ['capsters','bookings','transactions','customers','services']
export default async function AdminModuleRoute({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  if (!modules.includes(module as ModuleKey)) notFound()
  return <InternalModulePage module={module as ModuleKey} area="admin" />
}
