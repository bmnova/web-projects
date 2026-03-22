import { Header } from '@/components/layout/Header'
import { CalendarDays } from 'lucide-react'

export default function CalendarPage() {
  return (
    <>
      <Header title="Calendar & Queue" />
      <main className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Publishing queue and calendar coming soon.
          </p>
        </div>
      </main>
    </>
  )
}
