import { Header } from '@/components/layout/Header'
import { Layers } from 'lucide-react'

export default function StudioPage() {
  return (
    <>
      <Header title="Content Studio" />
      <main className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            İçerik stüdyosu yakında. Marka profilini tamamladıktan sonra fikir üretebilirsin.
          </p>
        </div>
      </main>
    </>
  )
}
