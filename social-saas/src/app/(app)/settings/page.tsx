import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Link2, Palette, ChevronRight } from 'lucide-react'

const sections = [
  { href: '/settings/accounts', label: 'Connected accounts', desc: 'Reddit, Instagram, TikTok, YouTube', icon: Link2 },
  { href: '/settings/brand', label: 'Brand profile', desc: 'Product, tone, target audience', icon: Palette },
]

export default function SettingsPage() {
  return (
    <>
      <Header title="Settings" />
      <main className="flex-1 p-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {sections.map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition"
            >
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}
