import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { PRICE_TO_PLAN } from '@/lib/firebase/billing'

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const ts  = signature.split(';').find(p => p.startsWith('ts='))?.split('=')[1]
  const h1  = signature.split(';').find(p => p.startsWith('h1='))?.split('=')[1]
  if (!ts || !h1) return false
  const expected = createHmac('sha256', secret).update(`${ts}:${payload}`).digest('hex')
  return expected === h1
}

export async function POST(req: NextRequest) {
  const payload   = await req.text()
  const signature = req.headers.get('Paddle-Signature') ?? ''
  const secret    = process.env.PADDLE_WEBHOOK_SECRET ?? ''

  if (secret && !verifySignature(payload, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: { event_type: string; data: Record<string, unknown> }
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event_type, data } = event
  const customData = data.custom_data as Record<string, string> | undefined
  const uid = customData?.uid

  if (!uid) {
    // No UID in custom_data — skip silently
    return NextResponse.json({ ok: true })
  }

  const { updateUserPlan, cancelUserPlan } = await import('@/lib/firebase/billing')

  if (event_type === 'subscription.created' || event_type === 'subscription.updated') {
    const items = data.items as { price: { id: string } }[]
    const priceId = items?.[0]?.price?.id
    const plan = PRICE_TO_PLAN[priceId]

    if (plan) {
      await updateUserPlan(uid, plan, {
        subscriptionId: data.id as string,
        customerId: data.customer_id as string,
      })
    }
  } else if (event_type === 'subscription.cancelled') {
    await cancelUserPlan(uid)
  }

  return NextResponse.json({ ok: true })
}
