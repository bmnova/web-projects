import { AI_QUOTA_EXCEEDED_CODE } from '@/lib/ai-quota'

export const PLAN_LIMITS: Record<string, number> = {
  free:    15,
  starter: 150,
  pro:     -1,   // unlimited
  agency:  -1,   // unlimited
}

/** When true, skips quota checks and increments (local / staging tests). Server-only env. */
export function isAiQuotaGloballyDisabled(): boolean {
  const v = process.env.DISABLE_AI_QUOTA
  return v === 'true' || v === '1'
}

/**
 * Atomically checks and increments the user's monthly AI generation count.
 * Throws 429 if the limit is reached. No-ops in dev mode (uid === 'dev-user').
 */
export async function checkAndIncrementUsage(uid: string): Promise<void> {
  if (uid === 'dev-user') return
  if (isAiQuotaGloballyDisabled()) return

  const { getAdminDb } = await import('./admin')
  const db = getAdminDb()

  const userSnap = await db.doc(`users/${uid}`).get()
  const plan: string = userSnap.data()?.plan ?? 'free'
  const limit = PLAN_LIMITS[plan] ?? 15

  if (limit === -1) return // unlimited

  const month = new Date().toISOString().slice(0, 7) // YYYY-MM
  const usageRef = db.doc(`users/${uid}/usage/${month}`)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(usageRef)
    const count: number = snap.data()?.count ?? 0
    if (count >= limit) {
      throw Object.assign(
        new Error(
          "You've used all AI generations included in your plan this month. Upgrade to keep creating."
        ),
        { status: 429, code: AI_QUOTA_EXCEEDED_CODE }
      )
    }
    tx.set(usageRef, { count: count + 1, plan, limit }, { merge: true })
  })
}

/**
 * Returns the user's current usage for the current month.
 */
export async function getUsage(uid: string): Promise<{ count: number; limit: number; plan: string }> {
  if (uid === 'dev-user') return { count: 0, limit: 15, plan: 'free' }

  const { getAdminDb } = await import('./admin')
  const db = getAdminDb()

  const userSnap = await db.doc(`users/${uid}`).get()
  const plan: string = userSnap.data()?.plan ?? 'free'

  if (isAiQuotaGloballyDisabled()) {
    return { count: 0, limit: -1, plan }
  }

  const limit = PLAN_LIMITS[plan] ?? 15

  const month = new Date().toISOString().slice(0, 7)
  const usageSnap = await db.doc(`users/${uid}/usage/${month}`).get()
  const count: number = usageSnap.data()?.count ?? 0

  return { count, limit, plan }
}
