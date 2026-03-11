import { Header } from '@/components/layout/Header'
import { LayoutDashboard, Link2, Clock, CheckSquare, Send, Search } from 'lucide-react'

const widgets = [
  { label: 'Bağlı Hesaplar', value: '0', icon: Link2, color: 'bg-blue-50 text-blue-600' },
  { label: 'Kuyrukta Bekleyen', value: '0', icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
  { label: 'Onay Bekleyen', value: '0', icon: CheckSquare, color: 'bg-orange-50 text-orange-600' },
  { label: 'Son Yayınlanan', value: '0', icon: Send, color: 'bg-green-50 text-green-600' },
  { label: 'Reddit Fırsatı', value: '0', icon: Search, color: 'bg-purple-50 text-purple-600' },
]

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {widgets.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <LayoutDashboard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Henüz içerik yok. Workspace oluşturup hesaplarını bağla.
          </p>
        </div>
      </main>
    </>
  )
}
