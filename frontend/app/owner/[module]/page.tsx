import { notFound } from 'next/navigation'
import { InternalModulePage, type ModuleKey } from '@/components/internal/internal-module-page'

const modules: ModuleKey[] = ['reports','staff','services','expenses','gallery','dp-settings','audit']
export default async function OwnerModuleRoute({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  if (!modules.includes(module as ModuleKey)) notFound()
  return <InternalModulePage module={module as ModuleKey} area="owner" />
}
