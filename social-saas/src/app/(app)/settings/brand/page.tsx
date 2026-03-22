import { Header } from '@/components/layout/Header'
import { Palette } from 'lucide-react'

export default function BrandPage() {
  return (
    <>
      <Header title="Brand profile" />
      <main className="flex-1 p-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Palette className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Brand profile editor will be added in a later release.
          </p>
        </div>
      </main>
    </>
  )
}
