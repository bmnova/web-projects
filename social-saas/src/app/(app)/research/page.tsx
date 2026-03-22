import { Header } from '@/components/layout/Header'
import { Search } from 'lucide-react'

export default function ResearchPage() {
  return (
    <>
      <Header title="Research Inbox" />
      <main className="flex-1 p-6">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Reddit research module coming soon. You will add subreddits and keywords here.
          </p>
        </div>
      </main>
    </>
  )
}
