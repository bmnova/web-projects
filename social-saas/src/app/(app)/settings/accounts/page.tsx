import { Header } from '@/components/layout/Header'
import { Link2 } from 'lucide-react'

const platforms = [
  { id: 'reddit', label: 'Reddit', color: 'bg-orange-500' },
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-500' },
  { id: 'tiktok', label: 'TikTok', color: 'bg-black' },
  { id: 'youtube', label: 'YouTube', color: 'bg-red-600' },
]

export default function AccountsPage() {
  return (
    <>
      <Header title="Connected accounts" />
      <main className="flex-1 p-6 max-w-2xl">
        <p className="text-sm text-gray-500 mb-4">
          Connect the platforms you want to publish to.
        </p>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {platforms.map(({ id, label, color }) => (
            <div key={id} className="flex items-center gap-4 px-5 py-4">
              <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
                <Link2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400">Not connected</p>
              </div>
              <button className="text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 px-3 py-1.5 rounded-lg transition">
                Connect
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">OAuth connections will be enabled in a later release.</p>
      </main>
    </>
  )
}
