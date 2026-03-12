import { Header } from '@/components/layout/Header'
import { CheckSquare } from 'lucide-react'

export default function ApprovalsPage() {
  return (
    <>
      <Header title="Approvals" />
      <main className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Onay bekleyen içerik yok.
          </p>
        </div>
      </main>
    </>
  )
}
