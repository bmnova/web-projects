/** Client + server safe — keep out of video-montage.ts (that module pulls in Gemini). */

export const MONTAGE_SCENE_MIN = 2
export const MONTAGE_SCENE_MAX = 8

export function clampMontageSceneCount(n: number): number {
  return Math.min(
    MONTAGE_SCENE_MAX,
    Math.max(MONTAGE_SCENE_MIN, Math.floor(Number.isFinite(n) ? n : MONTAGE_SCENE_MIN))
  )
}

/** How merged montage joins clips. */
export const MONTAGE_MERGE_TRANSITIONS = [
  {
    id: 'straight',
    label: 'Straight join',
    description:
      'Hard cuts, no overlap — total length is the sum of all clips (e.g. 5×4s = 20s).',
    kind: 'straight' as const,
  },
  {
    id: 'black',
    label: 'Black beat',
    description: 'Short black gap between clips (adds a little to total length).',
    kind: 'black' as const,
  },
  {
    id: 'fade',
    label: 'Crossfade',
    description:
      'Clips overlap while blending — the file is shorter than the sum of clips (normal for xfade).',
    kind: 'xfade' as const,
    xfade: 'fade' as const,
  },
  {
    id: 'swipe_left',
    label: 'Swipe left',
    description: 'Overlapping slide (shorter total than sum of clips).',
    kind: 'xfade' as const,
    xfade: 'slideleft' as const,
  },
  {
    id: 'swipe_right',
    label: 'Swipe right',
    description: 'Overlapping slide (shorter total than sum of clips).',
    kind: 'xfade' as const,
    xfade: 'slideright' as const,
  },
  {
    id: 'swipe_up',
    label: 'Swipe up',
    description: 'Overlapping slide (shorter total than sum of clips).',
    kind: 'xfade' as const,
    xfade: 'slideup' as const,
  },
  {
    id: 'swipe_down',
    label: 'Swipe down',
    description: 'Overlapping slide (shorter total than sum of clips).',
    kind: 'xfade' as const,
    xfade: 'slidedown' as const,
  },
  {
    id: 'wipe_left',
    label: 'Wipe left',
    description: 'Overlapping wipe (shorter total than sum of clips).',
    kind: 'xfade' as const,
    xfade: 'wipeleft' as const,
  },
  {
    id: 'wipe_right',
    label: 'Wipe right',
    description: 'Overlapping wipe (shorter total than sum of clips).',
    kind: 'xfade' as const,
    xfade: 'wiperight' as const,
  },
] as const

export type MontageMergeTransitionId = (typeof MONTAGE_MERGE_TRANSITIONS)[number]['id']

const MERGE_IDS = new Set<string>(MONTAGE_MERGE_TRANSITIONS.map((t) => t.id))

/** Unknown / missing → straight join (full summed duration). */
export function parseMontageMergeTransition(raw: unknown): MontageMergeTransitionId {
  if (typeof raw !== 'string' || !MERGE_IDS.has(raw)) return 'straight'
  return raw as MontageMergeTransitionId
}

/** When the model returns an unknown join id, prefer a soft transition for marketing feel. */
export function parseAiPlanMergeTransition(raw: unknown): MontageMergeTransitionId {
  if (typeof raw !== 'string' || !MERGE_IDS.has(raw)) return 'fade'
  return raw as MontageMergeTransitionId
}

/** Ids the planner model must choose from (prompt + validation). */
export const AI_PLAN_MERGE_TRANSITION_IDS: MontageMergeTransitionId[] = [
  'straight',
  'black',
  'fade',
  'swipe_left',
  'swipe_right',
  'swipe_up',
  'swipe_down',
  'wipe_left',
  'wipe_right',
]

export type ResolvedMontageMerge =
  | { mergeMode: 'black' }
  | { mergeMode: 'straight' }
  | { mergeMode: 'xfade'; xfadeName: string }

export function resolveMontageMerge(id: MontageMergeTransitionId): ResolvedMontageMerge {
  const row = MONTAGE_MERGE_TRANSITIONS.find((t) => t.id === id)
  if (!row) return { mergeMode: 'straight' }
  if (row.kind === 'straight') return { mergeMode: 'straight' }
  if (row.kind === 'black') return { mergeMode: 'black' }
  return { mergeMode: 'xfade', xfadeName: row.xfade }
}
