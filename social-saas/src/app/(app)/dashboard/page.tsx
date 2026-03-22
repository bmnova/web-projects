'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/firebase/auth-context'
import { Header } from '@/components/layout/Header'
import { LayoutDashboard, Link2, Clock, CheckSquare, Send, Search, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  connected: number
  queued: number
  pending: number
  published: number
  leads: number
}

async function loadStats(uid: string): Promise<{ stats: Stats; workspaceId: string | null }> {
  const { getDoc, doc, collection, query, where, getCountFromServer } = await import('firebase/firestore')
  const { getDb } = await import('@/lib/firebase/config')
  const db = getDb()

  const userSnap = await getDoc(doc(db, 'users', uid))
  if (!userSnap.exists()) return { stats: { connected: 0, queued: 0, pending: 0, published: 0, leads: 0 }, workspaceId: null }

  const wids: string[] = userSnap.data().workspaceIds ?? []
  if (!wids.length) return { stats: { connected: 0, queued: 0, pending: 0, published: 0, leads: 0 }, workspaceId: null }

  const wid = wids[0]

  const [connected, queued, pending, published, leads] = await Promise.all([
    getCountFromServer(collection(db, 'workspaces', wid, 'connectedAccounts')),
    getCountFromServer(query(
      collection(db, 'workspaces', wid, 'publishJobs'),
      where('status', 'in', ['queued', 'processing'])
    )),
    getCountFromServer(query(
      collection(db, 'workspaces', wid, 'assets'),
      where('status', '==', 'pending_approval')
    )),
    getCountFromServer(query(
      collection(db, 'workspaces', wid, 'publishJobs'),
      where('status', '==', 'completed')
    )),
    getCountFromServer(query(
      collection(db, 'workspaces', wid, 'redditLeads'),
      where('status', '==', 'pending')
    )),
  ])

  return {
    workspaceId: wid,
    stats: {
      connected: connected.data().count,
      queued: queued.data().count,
      pending: pending.data().count,
      published: published.data().count,
      leads: leads.data().count,
    },
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({ connected: 0, queued: 0, pending: 0, published: 0, leads: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadStats(user.uid)
      .then(({ stats: s }) => setStats(s))
      .finally(() => setLoading(false))
  }, [user])

  const widgets = [
    { label: 'Connected accounts', value: stats.connected, icon: Link2,       color: 'bg-blue-50 text-blue-600',   href: '/settings/accounts' },
    { label: 'In queue',           value: stats.queued,    icon: Clock,       color: 'bg-yellow-50 text-yellow-600', href: '/calendar' },
    { label: 'Pending approval',   value: stats.pending,   icon: CheckSquare, color: 'bg-orange-50 text-orange-600', href: '/approvals' },
    { label: 'Published',          value: stats.published, icon: Send,        color: 'bg-green-50 text-green-600',   href: '/calendar' },
    { label: 'Reddit leads',       value: stats.leads,     icon: Search,      color: 'bg-purple-50 text-purple-600', href: '/research' },
  ]

  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 p-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {widgets.map(({ label, value, icon: Icon, color, href }) => (
            <Link key={label} href={href}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition"
            >
              <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin text-gray-300 mb-0.5" />
                : <p className="text-2xl font-bold text-gray-900">{value}</p>
              }
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Create content</p>
                <p className="text-xs text-gray-400">Generate platform-ready copy with AI</p>
              </div>
            </div>
            <Link
              href="/studio"
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition"
            >
              Open studio
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Reddit research</p>
                <p className="text-xs text-gray-400">Surface leads and conversations</p>
              </div>
            </div>
            <Link
              href="/research"
              className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition"
            >
              Research Inbox
            </Link>
          </div>
        </div>

        {stats.connected === 0 && !loading && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Link2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">No connected accounts yet</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Connect social accounts to publish automatically —{' '}
                <Link href="/settings/accounts" className="underline font-medium">open settings</Link>.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
