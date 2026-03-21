// Server-only billing helpers — do NOT import this in client components

import type { Plan } from './billing-shared'

export type { Plan }

export const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.PADDLE_PRICE_STARTER ?? 'price_starter']: 'starter',
  [process.env.PADDLE_PRICE_PRO    ?? 'price_pro']:     'pro',
  [process.env.PADDLE_PRICE_AGENCY ?? 'price_agency']:  'agency',
}

export async function updateUserPlan(
  uid: string,
  plan: Plan,
  paddleData: { subscriptionId: string; customerId: string }
): Promise<void> {
  const { getAdminDb } = await import('./admin')
  const db = getAdminDb()
  await db.doc(`users/${uid}`).set(
    {
      plan,
      paddleSubscriptionId: paddleData.subscriptionId,
      paddleCustomerId: paddleData.customerId,
      planUpdatedAt: new Date(),
    },
    { merge: true }
  )
}

export async function cancelUserPlan(uid: string): Promise<void> {
  const { getAdminDb } = await import('./admin')
  const db = getAdminDb()
  await db.doc(`users/${uid}`).set(
    { plan: 'free', paddleSubscriptionId: null, planUpdatedAt: new Date() },
    { merge: true }
  )
}
