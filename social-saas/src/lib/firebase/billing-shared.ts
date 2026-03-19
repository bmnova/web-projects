// Client-safe billing constants — no server imports here

export type Plan = 'free' | 'starter' | 'pro' | 'agency'

export const PLAN_LABELS: Record<Plan, string> = {
  free:    'Free',
  starter: 'Starter',
  pro:     'Pro',
  agency:  'Agency',
}

export const PLAN_COLORS: Record<Plan, string> = {
  free:    'bg-gray-100 text-gray-700',
  starter: 'bg-blue-100 text-blue-700',
  pro:     'bg-purple-100 text-purple-700',
  agency:  'bg-amber-100 text-amber-700',
}
