'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/firebase/auth-context'
import { Header } from '@/components/layout/Header'
import { Loader2, CheckCircle, Zap, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/firebase/billing-shared'
import { PLAN_LABELS, PLAN_COLORS } from '@/lib/firebase/billing-shared'

interface UserBilling {
  plan: Plan
  usage: number
  limit: number
}

const PLANS: {
  id: Plan
  name: string
  price: string
  period: string
  limit: string
  features: string[]
  priceEnvKey: string
}[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$19',
    period: '/ay',
    limit: '150 üretim/ay',
    features: ['1 workspace', 'Tüm formatlar & platformlar', 'Onay akışı', 'Scheduler'],
    priceEnvKey: 'NEXT_PUBLIC_PADDLE_PRICE_STARTER',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49',
    period: '/ay',
    limit: 'Sınırsız üretim',
    features: ['3 workspace', 'Takım üyeleri', 'Onay + Scheduler', 'Analitik', 'Öncelikli destek'],
    priceEnvKey: 'NEXT_PUBLIC_PADDLE_PRICE_PRO',
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$99',
    period: '/ay',
    limit: 'Sınırsız üretim',
    features: ['10 workspace', 'Sınırsız takım üyesi', 'White-label', 'Özel destek'],
    priceEnvKey: 'NEXT_PUBLIC_PADDLE_PRICE_AGENCY',
  },
]

const PRICE_IDS: Record<string, string> = {
  starter: process.env.NEXT_PUBLIC_PADDLE_PRICE_STARTER ?? '',
  pro:     process.env.NEXT_PUBLIC_PADDLE_PRICE_PRO     ?? '',
  agency:  process.env.NEXT_PUBLIC_PADDLE_PRICE_AGENCY  ?? '',
}

async function loadBilling(uid: string): Promise<UserBilling> {
  const { getDoc, doc } = await import('firebase/firestore')
  const { getDb } = await import('@/lib/firebase/config')
  const db = getDb()

  const userSnap = await getDoc(doc(db, 'users', uid))
  const plan: Plan = (userSnap.data()?.plan as Plan) ?? 'free'

  const month = new Date().toISOString().slice(0, 7)
  const usageSnap = await getDoc(doc(db, 'users', uid, 'usage', month))
  const usage: number = usageSnap.data()?.count ?? 0

  const limits: Record<Plan, number> = { free: 15, starter: 150, pro: -1, agency: -1 }
  const limit = limits[plan] ?? 15

  return { plan, usage, limit }
}

export default function BillingPage() {
  const { user } = useAuth()
  const [billing, setBilling] = useState<UserBilling | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadBilling(user.uid)
      .then(setBilling)
      .finally(() => setLoading(false))
  }, [user])

  async function openCheckout(planId: string) {
    if (!user) return
    const priceId = PRICE_IDS[planId]
    if (!priceId) {
      alert('Paddle fiyat ID tanımlı değil. .env dosyasını kontrol et.')
      return
    }

    setCheckoutLoading(planId)
    try {
      const { initializePaddle } = await import('@paddle/paddle-js')
      const paddle = await initializePaddle({
        environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') ?? 'sandbox',
        token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '',
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') {
            // Refresh billing data after successful checkout
            loadBilling(user.uid).then(setBilling)
          }
        },
      })
      paddle?.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { uid: user.uid },
      })
    } finally {
      setCheckoutLoading(null)
    }
  }

  const usagePct = billing && billing.limit > 0
    ? Math.min((billing.usage / billing.limit) * 100, 100)
    : 0

  return (
    <>
      <Header title="Billing" />
      <main className="flex-1 p-6 max-w-3xl mx-auto w-full">

        {/* Current plan */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Mevcut Plan</p>

          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          ) : billing ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-sm font-semibold px-2.5 py-0.5 rounded-full', PLAN_COLORS[billing.plan])}>
                    {PLAN_LABELS[billing.plan]}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Bu ay:{' '}
                  <strong className="text-gray-800">
                    {billing.usage}{billing.limit > 0 ? ` / ${billing.limit}` : ''} üretim
                  </strong>
                </p>
                {billing.limit > 0 && (
                  <div className="w-48 h-1.5 bg-gray-100 rounded-full mt-2">
                    <div
                      className={cn('h-1.5 rounded-full transition-all', usagePct > 85 ? 'bg-red-500' : 'bg-blue-500')}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                )}
              </div>
              {billing.plan === 'free' && (
                <a
                  href="#plans"
                  className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Planı Yükselt
                </a>
              )}
            </div>
          ) : null}
        </div>

        {/* Plan cards */}
        <div id="plans" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrentPlan = billing?.plan === plan.id
            const isLoading = checkoutLoading === plan.id

            return (
              <div
                key={plan.id}
                className={cn(
                  'bg-white rounded-xl border p-5 flex flex-col',
                  isCurrentPlan ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200'
                )}
              >
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-800">{plan.name}</p>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-xs text-gray-400">{plan.period}</span>
                  </div>
                  <p className="text-xs text-blue-600 font-medium mt-1">{plan.limit}</p>
                </div>

                <ul className="space-y-1.5 mb-4 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="text-center text-xs text-blue-600 font-semibold py-2">
                    Aktif Plan
                  </div>
                ) : (
                  <button
                    onClick={() => openCheckout(plan.id)}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-1.5 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {isLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Yükleniyor…</>
                      : <><ArrowUpRight className="w-3.5 h-3.5" /> {plan.name}&apos;a Geç</>
                    }
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 text-center mt-4">
          Ödemeler Paddle üzerinden güvenli şekilde işlenir. İstediğin zaman iptal edebilirsin.
        </p>
      </main>
    </>
  )
}
