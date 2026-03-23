'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth-context'
import { Header } from '@/components/layout/Header'
import {
  Layers, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Send, FileText, List, LayoutGrid, Video,
  Image as ImageIcon, Clapperboard, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrandProfile, ContentAngle, Platform, Format, AssetType } from '@/types'
import {
  IMAGE_GEN_HOOKS,
  VIDEO_GEN_HOOKS,
  type ImageGenHook,
  type VideoGenHook,
} from '@/lib/ai/media-hooks'
import { isAiQuotaExceededResponse } from '@/lib/ai-quota'
import {
  MONTAGE_SCENE_MIN,
  MONTAGE_SCENE_MAX,
  clampMontageSceneCount,
  MONTAGE_MERGE_TRANSITIONS,
  parseAiPlanMergeTransition,
  type MontageMergeTransitionId,
} from '@/lib/ai/montage-shared'

// ── Constants ────────────────────────────────────────────────────────────────

const FORMATS: { value: Format; label: string; Icon: React.ElementType; desc: string }[] = [
  { value: 'post',     label: 'Post',     Icon: FileText,    desc: 'Text post' },
  { value: 'thread',   label: 'Thread',   Icon: List,        desc: 'Tweet / X thread' },
  { value: 'carousel', label: 'Carousel', Icon: LayoutGrid,  desc: 'Slide deck' },
  { value: 'script',   label: 'Script',   Icon: Video,       desc: 'Video script' },
]

const FORMAT_PLATFORMS: Record<Format, Platform[]> = {
  post:     ['reddit', 'twitter', 'instagram', 'youtube'],
  thread:   ['twitter'],
  carousel: ['instagram'],
  script:   ['tiktok', 'youtube_shorts'],
}

const ALL_PLATFORMS: { value: Platform; label: string; emoji: string; limit: number }[] = [
  { value: 'reddit',         label: 'Reddit',      emoji: '🟠', limit: 40000 },
  { value: 'twitter',        label: 'X (Twitter)', emoji: '✕',  limit: 280   },
  { value: 'instagram',      label: 'Instagram',   emoji: '📸', limit: 2200  },
  { value: 'youtube',        label: 'YouTube',     emoji: '▶️', limit: 5000  },
  { value: 'tiktok',         label: 'TikTok',      emoji: '🎵', limit: 2200  },
  { value: 'youtube_shorts', label: 'YT Shorts',   emoji: '📱', limit: 1000  },
]

const ANGLES: { value: ContentAngle; label: string; desc: string }[] = [
  { value: 'pain_point',  label: 'Pain point',  desc: 'Lead with the problem' },
  { value: 'feature',     label: 'Feature',     desc: 'Highlight the product' },
  { value: 'educational', label: 'Educational', desc: 'Teach something useful' },
  { value: 'comparison',  label: 'Comparison',  desc: 'Compare to alternatives' },
  { value: 'founder',     label: 'Founder',     desc: 'Tell a founder story' },
  { value: 'launch',      label: 'Launch',      desc: 'Announce something new' },
]

const TONE_LABELS: Record<string, string> = {
  professional: 'Professional',
  casual: 'Casual',
  humorous: 'Humorous',
  educational: 'Educational',
}

const IMAGE_HOOK_LABELS: Record<ImageGenHook, string> = {
  product_hero: 'Product hero',
  lifestyle: 'Lifestyle',
  bold_canvas: 'Headline space',
  ugc: 'UGC',
}

const VIDEO_HOOK_LABELS: Record<VideoGenHook, string> = {
  hook_broll: 'Hook b-roll',
  showcase: 'Showcase',
  kinetic: 'High energy',
  pattern_interrupt: 'Pattern interrupt',
  problem_relate: 'Pain point',
  curiosity_reveal: 'Curiosity reveal',
  contrarian_visual: 'Contrarian',
  list_beats: 'List beats (3)',
  proof_demo: 'Proof / demo',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Idea { title: string; hook: string }

type MontagePlanMeta = {
  mergeTransition: MontageMergeTransitionId
  audioDirection: string
  pacingNote: string
}

type PostEntry = {
  type: 'post'
  text: string
  notes: string
  saved: boolean
  /** data URL — not stored in Firestore; preview/download in browser only */
  imageDataUrl?: string
  videoDataUrl?: string
  /** Set when video was built from 3-scene montage (for UI hint) */
  montageSceneLabels?: string[]
  /** Per-clip previews when montage was rendered (any count ≥2); merged file stays in videoDataUrl */
  montageSegmentDataUrls?: string[]
}
type ThreadEntry   = { type: 'thread';   tweets: string[]; saved: boolean }
type CarouselEntry = { type: 'carousel'; cover: string; slides: { headline: string; body: string }[]; cta: string; saved: boolean }
type CachedContent = PostEntry | ThreadEntry | CarouselEntry

function dataUrlToRawBase64(dataUrl: string): string {
  const needle = ';base64,'
  const i = dataUrl.indexOf(needle)
  if (i >= 0) return dataUrl.slice(i + needle.length)
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadBrandData(uid: string) {
  const { getDoc, doc } = await import('firebase/firestore')
  const { getDb } = await import('@/lib/firebase/config')
  const db = getDb()

  const userSnap = await getDoc(doc(db, 'users', uid))
  if (!userSnap.exists()) return null
  const workspaceIds: string[] = userSnap.data().workspaceIds ?? []
  if (!workspaceIds.length) return null

  const workspaceId = workspaceIds[0]
  const wsSnap = await getDoc(doc(db, 'workspaces', workspaceId))
  if (!wsSnap.exists()) return null
  const { brandProfileId } = wsSnap.data()
  if (!brandProfileId) return null

  const bpSnap = await getDoc(doc(db, 'workspaces', workspaceId, 'brandProfiles', brandProfileId))
  if (!bpSnap.exists()) return null

  return {
    workspaceId,
    brandProfileId: brandProfileId as string,
    profile: bpSnap.data() as BrandProfile,
  }
}

function charLimitColor(len: number, limit: number) {
  const pct = len / limit
  if (pct > 0.95) return 'text-red-500'
  if (pct > 0.8)  return 'text-yellow-500'
  return 'text-gray-400'
}

// ── Studio Tab Bar ─────────────────────────────────────────────────────────────

function StudioTabBar() {
  const pathname = usePathname()
  return (
    <div className="border-b border-gray-200 bg-white px-6">
      <div className="flex max-w-4xl mx-auto">
        <Link
          href="/studio"
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            pathname === '/studio'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Content Studio
        </Link>
        <Link
          href="/studio/influencers"
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
            pathname.startsWith('/studio/influencers')
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          AI Influencers
          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700 rounded-full">
            NEW
          </span>
        </Link>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const { user } = useAuth()

  const [brandData, setBrandData] = useState<Awaited<ReturnType<typeof loadBrandData>>>(null)
  const [loadingBrand, setLoadingBrand] = useState(true)

  const [format, setFormat] = useState<Format>('post')
  const [angle, setAngle] = useState<ContentAngle>('pain_point')
  const [platforms, setPlatforms] = useState<Platform[]>(['reddit'])

  const [ideas, setIdeas] = useState<Idea[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  const [expanded, setExpanded] = useState<number | null>(null)
  const [activePlatform, setActivePlatform] = useState<Platform>('reddit')

  const [cache, setCache] = useState<Record<string, CachedContent>>({})
  const [contentLoading, setContentLoading] = useState<string | null>(null)

  const [copied, setCopied] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const [imageHook, setImageHook] = useState<ImageGenHook>('product_hero')
  const [videoHook, setVideoHook] = useState<VideoGenHook>('hook_broll')
  const [imageGenKey, setImageGenKey] = useState<string | null>(null)
  const [montageGenKey, setMontageGenKey] = useState<string | null>(null)
  /** `${cacheKey}-${sceneIndex}` while one montage clip is re-rendering */
  const [montageSceneRegenKey, setMontageSceneRegenKey] = useState<string | null>(null)
  const [montagePlanKey, setMontagePlanKey] = useState<string | null>(null)
  /** Target clip count for the next Plan (2–8). */
  const [montageClipCount, setMontageClipCount] = useState(3)
  /** Fallback when no plan meta yet (e.g. before first Plan). */
  const [montageMergeTransition] = useState<MontageMergeTransitionId>('straight')
  /** Per-idea: AI-chosen join, VO direction, pacing (set after Plan). */
  const [montagePlanMeta, setMontagePlanMeta] = useState<Record<string, MontagePlanMeta>>({})
  /** Per-idea manual join override; omit key to use AI plan choice. */
  const [montageMergeOverrideByKey, setMontageMergeOverrideByKey] = useState<
    Partial<Record<string, MontageMergeTransitionId>>
  >({})
  /** After plan API: scenes with editable veoPrompt. */
  const [montageScenesDraft, setMontageScenesDraft] = useState<
    Record<string, { label: string; veoPrompt: string }[]>
  >({})
  const [mediaGenError, setMediaGenError] = useState<Record<string, string>>({})
  const [approvalSendError, setApprovalSendError] = useState<Record<string, string>>({})
  const [aiQuotaBlocked, setAiQuotaBlocked] = useState(false)

  const noteAiQuotaIfNeeded = useCallback((res: Response, data: { code?: string }) => {
    if (isAiQuotaExceededResponse(res, data)) setAiQuotaBlocked(true)
  }, [])

  function montageMergeForKey(cacheKey: string): MontageMergeTransitionId {
    const o = montageMergeOverrideByKey[cacheKey]
    if (o !== undefined) return o
    const meta = montagePlanMeta[cacheKey]
    if (meta?.mergeTransition) return meta.mergeTransition
    return montageMergeTransition
  }

  useEffect(() => {
    if (!user) return
    loadBrandData(user.uid).then(setBrandData).finally(() => setLoadingBrand(false))
  }, [user])

  /** Hydrate script + platform from Approvals (“Open in Studio for video”). */
  useEffect(() => {
    if (!brandData || loadingBrand) return
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem('social-saas-studio-from-approvals')
    if (!raw) return
    sessionStorage.removeItem('social-saas-studio-from-approvals')
    try {
      const p = JSON.parse(raw) as {
        platform?: Platform
        text?: string
        notes?: string
        title?: string
        videoUrl?: string
        montageSceneLabels?: string[]
      }
      if (!p.platform || typeof p.text !== 'string') return
      if (!FORMAT_PLATFORMS.script.includes(p.platform)) return
      const plat = p.platform
      const title =
        typeof p.title === 'string' && p.title.trim() ? p.title.trim() : 'From approvals'
      setFormat('script')
      setPlatforms([plat])
      setActivePlatform(plat)
      setIdeas([{ title, hook: '' }])
      setExpanded(0)
      const key = `0-${plat}-script`
      const videoUrl = typeof p.videoUrl === 'string' && p.videoUrl.trim() ? p.videoUrl.trim() : undefined
      const labels = Array.isArray(p.montageSceneLabels)
        ? p.montageSceneLabels.filter((x): x is string => typeof x === 'string' && x.length > 0)
        : undefined
      setCache({
        [key]: {
          type: 'post',
          text: p.text,
          notes: typeof p.notes === 'string' ? p.notes : '',
          saved: true,
          ...(videoUrl ? { videoDataUrl: videoUrl } : {}),
          ...(labels && labels.length ? { montageSceneLabels: labels } : {}),
        },
      })
      setMontageScenesDraft({})
    } catch {
      /* ignore bad payload */
    }
  }, [brandData, loadingBrand])

  // ── Format change ─────────────────────────────────────────────────────────

  function handleFormatChange(f: Format) {
    setFormat(f)
    setIdeas([])
    setExpanded(null)
    setCache({})
    setMontageScenesDraft({})
    const valid = FORMAT_PLATFORMS[f]
    if (f === 'thread') {
      setPlatforms(['twitter'])
    } else if (f === 'carousel') {
      setPlatforms(['instagram'])
    } else {
      const kept = platforms.filter(p => valid.includes(p))
      setPlatforms(kept.length ? kept : [valid[0]])
    }
  }

  // ── Platform toggle ───────────────────────────────────────────────────────

  function togglePlatform(p: Platform) {
    const valid = FORMAT_PLATFORMS[format]
    if (!valid.includes(p)) return
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  // ── Idea generation ───────────────────────────────────────────────────────

  async function generateIdeas() {
    if (!brandData || platforms.length === 0 || !user) return
    setGenerating(true)
    setGenError('')
    setIdeas([])
    setExpanded(null)
    setCache({})
    setMontageScenesDraft({})
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/generate/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ brandProfile: brandData.profile, angle, platforms }),
      })
      let data: { error?: string; ideas?: Idea[]; code?: string } = {}
      try {
        data = await res.json()
      } catch {
        setGenError('Invalid response from server. Please try again.')
        return
      }
      noteAiQuotaIfNeeded(res, data)
      if (!res.ok || data.error) {
        setGenError(
          data.error ||
            (res.status === 429
              ? 'Monthly generation limit reached.'
              : `Request failed (${res.status}).`)
        )
        return
      }
      if (!Array.isArray(data.ideas)) {
        setGenError('Unexpected response. Please try again.')
        return
      }
      setIdeas(data.ideas)
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Could not generate ideas. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  // ── Content fetching ──────────────────────────────────────────────────────

  async function fetchContent(ideaIdx: number, platform: Platform, force = false) {
    if (!brandData || !user) return
    const key = `${ideaIdx}-${platform}-${format}`
    if (cache[key] && !force) return
    setContentLoading(key)
    try {
      let entry: CachedContent
      const token = await user.getIdToken()
      const authHeader = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

      if (format === 'thread') {
        const res = await fetch('/api/generate/thread', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({ idea: ideas[ideaIdx], brandProfile: brandData.profile }),
        })
        const data = await res.json()
        noteAiQuotaIfNeeded(res, data)
        if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`)
        entry = { type: 'thread', tweets: data.tweets, saved: false }

      } else if (format === 'carousel') {
        const res = await fetch('/api/generate/carousel', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({ idea: ideas[ideaIdx], brandProfile: brandData.profile }),
        })
        const data = await res.json()
        noteAiQuotaIfNeeded(res, data)
        if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`)
        entry = { type: 'carousel', cover: data.cover, slides: data.slides, cta: data.cta, saved: false }

      } else {
        const res = await fetch('/api/generate/content', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({ idea: ideas[ideaIdx], brandProfile: brandData.profile, platform }),
        })
        const data = await res.json()
        noteAiQuotaIfNeeded(res, data)
        if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`)
        const text = typeof data.content === 'string' ? data.content : ''
        const notes = typeof data.notes === 'string' ? data.notes : ''
        entry = { type: 'post', text, notes, saved: false }
      }

      setCache(prev => ({ ...prev, [key]: entry }))
      setMontageScenesDraft(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } catch {
      // show nothing — user can retry
    } finally {
      setContentLoading(null)
    }
  }

  function handleExpand(idx: number) {
    if (expanded === idx) { setExpanded(null); return }
    setExpanded(idx)
    const p = platforms[0] ?? 'reddit'
    setActivePlatform(p)
    fetchContent(idx, p)
  }

  function handlePlatformTab(idx: number, p: Platform) {
    setActivePlatform(p)
    fetchContent(idx, p)
  }

  // ── Cache mutations ───────────────────────────────────────────────────────

  function updatePostText(key: string, text: string) {
    setCache(prev => {
      const cur = prev[key] as PostEntry
      return { ...prev, [key]: { ...cur, text } }
    })
  }

  async function generateStudioImage(ideaIdx: number, platform: Platform) {
    if (!brandData || !user) return
    const key = `${ideaIdx}-${platform}-${format}`
    const entry = cache[key] as PostEntry | undefined
    if (!entry || entry.type !== 'post') return
    setImageGenKey(key)
    setMediaGenError(prev => {
      const next = { ...prev }
      delete next[`${key}-image`]
      return next
    })
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          idea: ideas[ideaIdx],
          brandProfile: brandData.profile,
          platform,
          imageHook,
          scriptExcerpt: entry.text ?? '',
        }),
      })
      const data = await res.json()
      noteAiQuotaIfNeeded(res, data)
      if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`)
      const dataUrl = `data:${data.mimeType};base64,${data.base64}`
      setCache(prev => {
        const cur = prev[key] as PostEntry
        if (!cur) return prev
        return { ...prev, [key]: { ...cur, imageDataUrl: dataUrl } }
      })
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : 'Image generation failed. Try again.'
      setMediaGenError(prev => ({
        ...prev,
        [`${key}-image`]: msg,
      }))
    } finally {
      setImageGenKey(null)
    }
  }

  async function planStudioMontage(ideaIdx: number, platform: Platform) {
    if (!brandData || !user) return
    const key = `${ideaIdx}-${platform}-${format}`
    const entry = cache[key] as PostEntry | undefined
    if (!entry || entry.type !== 'post') return
    setMontagePlanKey(key)
    setMediaGenError(prev => {
      const next = { ...prev }
      delete next[`${key}-montage`]
      return next
    })
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/generate/video/montage/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          idea: ideas[ideaIdx],
          brandProfile: brandData.profile,
          platform,
          videoHook,
          scriptExcerpt: entry.text ?? '',
          sceneCount: montageClipCount,
        }),
      })
      const data = await res.json()
      noteAiQuotaIfNeeded(res, data)
      if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`)
      const raw = Array.isArray(data.scenes) ? data.scenes : []
      const scenes = raw.map((s: { label?: string; veoPrompt?: string }, i: number) => ({
        label: typeof s.label === 'string' && s.label.trim() ? s.label.trim() : `Scene ${i + 1}`,
        veoPrompt: typeof s.veoPrompt === 'string' ? s.veoPrompt : '',
      }))
      const expected = clampMontageSceneCount(montageClipCount)
      if (scenes.length !== expected) {
        throw new Error(`Expected ${expected} scenes from planner, got ${scenes.length}`)
      }
      setMontagePlanMeta(prev => ({
        ...prev,
        [key]: {
          mergeTransition: parseAiPlanMergeTransition(data.mergeTransition),
          audioDirection:
            typeof data.audioDirection === 'string' && data.audioDirection.trim()
              ? String(data.audioDirection).trim()
              : 'Match the script energy; clear articulation; leave space after the hook.',
          pacingNote:
            typeof data.pacingNote === 'string' && data.pacingNote.trim()
              ? String(data.pacingNote).trim()
              : 'Build momentum across scenes toward a strong final beat.',
        },
      }))
      setMontageMergeOverrideByKey(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      setMontageScenesDraft(prev => ({ ...prev, [key]: scenes }))
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : 'Scene planning failed. Try again.'
      setMediaGenError(prev => ({
        ...prev,
        [`${key}-montage`]: msg,
      }))
    } finally {
      setMontagePlanKey(null)
    }
  }

  function updateMontageSceneDraft(
    key: string,
    sceneIndex: number,
    field: 'label' | 'veoPrompt',
    value: string
  ) {
    setMontageScenesDraft(prev => {
      const scenes = prev[key]
      if (!scenes) return prev
      const next = scenes.map((s, i) =>
        i === sceneIndex ? { ...s, [field]: value } : s
      )
      return { ...prev, [key]: next }
    })
  }

  async function renderStudioMontage(ideaIdx: number, platform: Platform) {
    if (!brandData || !user) return
    const key = `${ideaIdx}-${platform}-${format}`
    const entry = cache[key] as PostEntry | undefined
    const scenes = montageScenesDraft[key]
    if (!entry || entry.type !== 'post') return
    if (!scenes || scenes.length < MONTAGE_SCENE_MIN) {
      setMediaGenError(prev => ({
        ...prev,
        [`${key}-montage`]: 'Plan scenes first, then edit prompts if needed.',
      }))
      return
    }
    if (scenes.length !== montageClipCount) {
      setMediaGenError(prev => ({
        ...prev,
        [`${key}-montage`]:
          'Clip count changed since planning — set the number of clips to match your plan, or run Plan again.',
      }))
      return
    }
    setMontageGenKey(key)
    setMediaGenError(prev => {
      const next = { ...prev }
      delete next[`${key}-montage`]
      return next
    })
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/generate/video/montage/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          platform,
          scenes,
          mergeTransition: montageMergeForKey(key),
        }),
      })
      const data = await res.json()
      noteAiQuotaIfNeeded(res, data)
      if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`)
      const dataUrl = `data:${data.mimeType};base64,${data.base64}`
      const labels: string[] | undefined = Array.isArray(data.scenes)
        ? data.scenes.map((s: { label?: string }) => (typeof s.label === 'string' ? s.label : '')).filter(Boolean)
        : undefined
      const mime = typeof data.mimeType === 'string' ? data.mimeType : 'video/mp4'
      const rawSegs = Array.isArray(data.segmentBase64s) ? data.segmentBase64s : []
      const n = scenes.length
      const segmentUrls =
        rawSegs.length === n && rawSegs.every((s: unknown) => typeof s === 'string')
          ? rawSegs.map((b64: string) => `data:${mime};base64,${b64}`)
          : undefined
      setCache(prev => {
        const cur = prev[key] as PostEntry
        if (!cur) return prev
        return {
          ...prev,
          [key]: {
            ...cur,
            videoDataUrl: dataUrl,
            montageSceneLabels: labels,
            montageSegmentDataUrls: segmentUrls,
          },
        }
      })
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : 'Montage render failed or timed out. Needs ffmpeg locally. Try again.'
      setMediaGenError(prev => ({
        ...prev,
        [`${key}-montage`]: msg,
      }))
    } finally {
      setMontageGenKey(null)
    }
  }

  async function regenerateMontageScene(
    ideaIdx: number,
    platform: Platform,
    sceneIndex: number
  ) {
    if (!brandData || !user) return
    const key = `${ideaIdx}-${platform}-${format}`
    const entry = cache[key] as PostEntry | undefined
    const scenes = montageScenesDraft[key]
    const n = scenes?.length ?? 0
    if (!entry?.montageSegmentDataUrls || entry.montageSegmentDataUrls.length !== n || n < MONTAGE_SCENE_MIN) return
    if (!scenes || scenes.length !== n) return
    if (sceneIndex < 0 || sceneIndex >= n) return

    const regenKey = `${key}-${sceneIndex}`
    setMontageSceneRegenKey(regenKey)
    setMediaGenError(prev => {
      const next = { ...prev }
      delete next[`${key}-montage`]
      return next
    })
    try {
      const token = await user.getIdToken()
      const segmentBase64s = entry.montageSegmentDataUrls.map(dataUrlToRawBase64)
      const res = await fetch('/api/generate/video/montage/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          platform,
          scenes,
          regenerateIndex: sceneIndex,
          segmentBase64s,
          mergeTransition: montageMergeForKey(key),
        }),
      })
      const data = await res.json()
      noteAiQuotaIfNeeded(res, data)
      if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`)
      const dataUrl = `data:${data.mimeType};base64,${data.base64}`
      const labels: string[] | undefined = Array.isArray(data.scenes)
        ? data.scenes.map((s: { label?: string }) => (typeof s.label === 'string' ? s.label : '')).filter(Boolean)
        : undefined
      const mime = typeof data.mimeType === 'string' ? data.mimeType : 'video/mp4'
      const rawSegs = Array.isArray(data.segmentBase64s) ? data.segmentBase64s : []
      const segmentUrls =
        rawSegs.length === n && rawSegs.every((s: unknown) => typeof s === 'string')
          ? rawSegs.map((b64: string) => `data:${mime};base64,${b64}`)
          : undefined
      setCache(prev => {
        const cur = prev[key] as PostEntry
        if (!cur) return prev
        return {
          ...prev,
          [key]: {
            ...cur,
            videoDataUrl: dataUrl,
            montageSceneLabels: labels,
            montageSegmentDataUrls: segmentUrls,
          },
        }
      })
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim().length > 0
          ? e.message
          : 'Could not re-generate this clip. Try again.'
      setMediaGenError(prev => ({
        ...prev,
        [`${key}-montage`]: msg,
      }))
    } finally {
      setMontageSceneRegenKey(null)
    }
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }

  function updateTweet(key: string, idx: number, text: string) {
    setCache(prev => {
      const e = prev[key] as ThreadEntry
      const tweets = e.tweets.map((t, i) => i === idx ? text : t)
      return { ...prev, [key]: { ...e, tweets } }
    })
  }

  function updateCarouselCover(key: string, cover: string) {
    setCache(prev => ({ ...prev, [key]: { ...(prev[key] as CarouselEntry), cover } }))
  }

  function updateSlide(key: string, idx: number, field: 'headline' | 'body', val: string) {
    setCache(prev => {
      const e = prev[key] as CarouselEntry
      const slides = e.slides.map((s, i) => i === idx ? { ...s, [field]: val } : s)
      return { ...prev, [key]: { ...e, slides } }
    })
  }

  function updateCarouselCta(key: string, cta: string) {
    setCache(prev => ({ ...prev, [key]: { ...(prev[key] as CarouselEntry), cta } }))
  }

  // ── Copy ──────────────────────────────────────────────────────────────────

  async function copyContent(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  function copyableText(entry: CachedContent): string {
    if (entry.type === 'thread') return entry.tweets.join('\n\n')
    if (entry.type === 'carousel') {
      const slides = entry.slides.map((s, i) => `Slide ${i + 1}: ${s.headline}\n${s.body}`).join('\n\n')
      return `Cover: ${entry.cover}\n\n${slides}\n\nCTA: ${entry.cta}`
    }
    return entry.text ?? ''
  }

  // ── Save to approvals ─────────────────────────────────────────────────────

  async function sendToApprovals(ideaIdx: number, platform: Platform) {
    if (!brandData) return
    const key = `${ideaIdx}-${platform}-${format}`
    const entry = cache[key]
    if (!entry) return

    if (format === 'script' && entry.type === 'post') {
      const post = entry as PostEntry
      if (!post.videoDataUrl) {
        setApprovalSendError(prev => ({
          ...prev,
          [key]:
            'Create your video first. Approvals are for publish-ready video + script.',
        }))
        return
      }
    }

    setApprovalSendError(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSaving(key)
    try {
      const { saveContentIdea, saveAsset } = await import('@/lib/firebase/content')
      const ideaId = await saveContentIdea(
        brandData.workspaceId,
        brandData.brandProfileId,
        { title: ideas[ideaIdx].title, angle, platforms }
      )

      let assetType: AssetType
      let content: Record<string, unknown>
      let videoDataUrl: string | undefined

      if (entry.type === 'thread') {
        assetType = 'thread'
        content = { tweets: entry.tweets }
      } else if (entry.type === 'carousel') {
        assetType = 'carousel'
        content = { cover: entry.cover, slides: entry.slides, cta: entry.cta }
      } else if (format === 'script') {
        const post = entry as PostEntry
        assetType = 'video'
        content = {
          scriptText: post.text ?? '',
          notes: post.notes ?? '',
          ...(post.montageSceneLabels?.length
            ? { montageSceneLabels: post.montageSceneLabels }
            : {}),
        }
        videoDataUrl = post.videoDataUrl
      } else {
        assetType = 'text'
        content = { text: (entry as PostEntry).text ?? '', notes: (entry as PostEntry).notes ?? '' }
      }

      await saveAsset(brandData.workspaceId, ideaId, {
        platform,
        type: assetType,
        content,
        ...(videoDataUrl ? { videoDataUrl } : {}),
      })
      setCache(prev => ({ ...prev, [key]: { ...prev[key], saved: true } as CachedContent }))
    } catch (e) {
      setApprovalSendError(prev => ({
        ...prev,
        [key]:
          e instanceof Error ? e.message : 'Could not save to approvals. Check Storage rules and try again.',
      }))
    } finally {
      setSaving(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingBrand) {
    return (
      <>
        <Header title="Content Studio" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </main>
      </>
    )
  }

  if (!brandData) {
    return (
      <>
        <Header title="Content Studio" />
        <main className="flex-1 p-6">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              Complete <a href="/onboarding" className="text-blue-600 hover:underline">onboarding</a> first.
            </p>
          </div>
        </main>
      </>
    )
  }

  const { profile } = brandData
  const validPlatforms = ALL_PLATFORMS.filter(p => FORMAT_PLATFORMS[format].includes(p.value))
  const isSinglePlatform = FORMAT_PLATFORMS[format].length === 1

  return (
    <>
      <Header title="Content Studio" />
      <StudioTabBar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">

        {aiQuotaBlocked && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="min-w-0 leading-relaxed">
              <span className="font-semibold text-amber-900">You&apos;ve hit your monthly AI limit.</span>{' '}
              Upgrade your plan to keep generating content and media.
            </p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href="/settings/billing"
                className="inline-flex items-center justify-center rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
              >
                View plans &amp; upgrade
              </Link>
              <button
                type="button"
                onClick={() => setAiQuotaBlocked(false)}
                className="text-xs font-medium text-amber-800 underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Brand Pill */}
        <div className="flex items-center gap-3 mb-6 bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{profile.productName}</p>
            <p className="text-xs text-gray-400 truncate">{profile.targetAudience}</p>
          </div>
          <span className="ml-auto shrink-0 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {TONE_LABELS[profile.toneOfVoice] ?? profile.toneOfVoice}
          </span>
        </div>

        {/* Generate Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-5">

          {/* Format */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Format</p>
            <div className="grid grid-cols-4 gap-2">
              {FORMATS.map(f => {
                const Icon = f.Icon
                return (
                  <button
                    key={f.value}
                    onClick={() => handleFormatChange(f.value)}
                    className={cn(
                      'text-left px-3 py-2.5 rounded-lg border text-sm transition',
                      format === f.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="font-medium block">{f.label}</span>
                    <span className="text-xs opacity-60">{f.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Angle */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Content angle</p>
            <div className="grid grid-cols-3 gap-2">
              {ANGLES.map(a => (
                <button
                  key={a.value}
                  onClick={() => setAngle(a.value)}
                  className={cn(
                    'text-left px-3 py-2 rounded-lg border text-sm transition',
                    angle === a.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <span className="font-medium block">{a.label}</span>
                  <span className="text-xs opacity-60">{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platform</p>
            <div className="flex flex-wrap gap-2">
              {validPlatforms.map(p => (
                <button
                  key={p.value}
                  onClick={() => !isSinglePlatform && togglePlatform(p.value)}
                  disabled={isSinglePlatform}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition',
                    platforms.includes(p.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300',
                    isSinglePlatform && 'cursor-default'
                  )}
                >
                  <span>{p.emoji}</span> {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Button */}
          <button
            onClick={generateIdeas}
            disabled={generating || platforms.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50"
          >
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating ideas…</>
              : <><Sparkles className="w-4 h-4" /> Generate ideas</>}
          </button>

          {genError && <p className="text-red-600 text-sm text-center">{genError}</p>}
        </div>

        {/* Ideas List */}
        {ideas.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {ideas.length} ideas generated
            </p>

            {ideas.map((idea, idx) => {
              const isOpen = expanded === idx
              const key = `${idx}-${activePlatform}-${format}`
              const entry = cache[key]
              const isLoading = contentLoading === key
              const platformMeta = ALL_PLATFORMS.find(p => p.value === activePlatform)!
              const montageRegenBusyThisIdea =
                montageSceneRegenKey != null && montageSceneRegenKey.startsWith(`${key}-`)

              return (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">

                  {/* Header row */}
                  <button
                    onClick={() => handleExpand(idx)}
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition"
                  >
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{idea.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{idea.hook}</p>
                    </div>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                  </button>

                  {/* Expanded */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 space-y-4">

                      {/* Platform Tabs — only shown when multiple platforms */}
                      {!isSinglePlatform && platforms.length > 1 && (
                        <div className="flex gap-1">
                          {platforms.map(p => {
                            const pm = ALL_PLATFORMS.find(x => x.value === p)!
                            return (
                              <button
                                key={p}
                                onClick={() => handlePlatformTab(idx, p)}
                                className={cn(
                                  'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition',
                                  activePlatform === p
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                )}
                              >
                                {pm.emoji} {pm.label}
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Content area */}
                      {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="ml-2 text-sm text-gray-500">Writing content…</span>
                        </div>
                      ) : entry ? (
                        <div className="space-y-3">

                          {/* ── Post / Script ── */}
                          {entry.type === 'post' && (
                            <>
                              <div className="relative">
                                <textarea
                                  className="w-full border border-gray-200 rounded-lg p-3 pr-10 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                  rows={8}
                                  value={entry.text ?? ''}
                                  onChange={e => updatePostText(key, e.target.value)}
                                />
                                <button
                                  onClick={() => copyContent(entry.text ?? '', key)}
                                  className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-gray-900 transition"
                                >
                                  {copied === key
                                    ? <Check className="w-3.5 h-3.5 text-green-600" />
                                    : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <span className={cn(
                                  'absolute bottom-2 right-2 text-xs',
                                  charLimitColor((entry.text ?? '').length, platformMeta.limit)
                                )}>
                                  {(entry.text ?? '').length.toLocaleString()} / {platformMeta.limit.toLocaleString()}
                                </span>
                              </div>

                              {format === 'script' && (
                                <div className="space-y-4">
                                  <div className="border border-violet-200 rounded-xl p-4 bg-violet-50/40 space-y-4">
                                    <p className="text-xs font-semibold text-violet-900 flex items-center gap-2">
                                      <Clapperboard className="w-3.5 h-3.5 shrink-0" />
                                      Create video
                                    </p>
                                    <p className="text-[11px] text-gray-600 leading-snug">
                                      Multi-clip Veo montage (~4s per clip). The planner acts as your marketing creative:
                                      scene prompts, how clips join, pacing, and VO direction for later. Counts toward
                                      quota — then <strong>Send to approvals</strong> with the combined MP4.
                                    </p>
                                    <div className="flex flex-wrap items-end gap-4">
                                      <div>
                                        <label
                                          htmlFor={`clip-count-${key}`}
                                          className="text-[11px] font-medium text-gray-600 block mb-1"
                                        >
                                          Number of clips ({MONTAGE_SCENE_MIN}–{MONTAGE_SCENE_MAX})
                                        </label>
                                        <input
                                          id={`clip-count-${key}`}
                                          type="number"
                                          min={MONTAGE_SCENE_MIN}
                                          max={MONTAGE_SCENE_MAX}
                                          value={montageClipCount}
                                          onChange={e => {
                                            const raw = parseInt(e.target.value, 10)
                                            setMontageClipCount(
                                              clampMontageSceneCount(
                                                Number.isNaN(raw) ? MONTAGE_SCENE_MIN : raw
                                              )
                                            )
                                          }}
                                          disabled={montagePlanKey === key || montageGenKey === key}
                                          className="w-24 text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white"
                                        />
                                      </div>
                                    </div>
                                    {montagePlanMeta[key] ? (
                                      <div className="rounded-lg border border-violet-100 bg-white/90 p-3 space-y-2 shadow-sm">
                                        <p className="text-[11px] font-semibold text-violet-900">
                                          AI edit &amp; pacing
                                        </p>
                                        <p className="text-[11px] text-gray-700">
                                          <span className="font-medium text-gray-800">Join clips:</span>{' '}
                                          {MONTAGE_MERGE_TRANSITIONS.find(
                                            x => x.id === montageMergeForKey(key)
                                          )?.label ?? montageMergeForKey(key)}
                                          {montageMergeOverrideByKey[key] !== undefined && (
                                            <span className="text-violet-700 font-medium"> (override)</span>
                                          )}
                                        </p>
                                        <p className="text-[11px] text-gray-600 leading-relaxed">
                                          {montagePlanMeta[key]!.pacingNote}
                                        </p>
                                        <p className="text-[11px] text-gray-600 leading-relaxed">
                                          <span className="font-medium text-gray-800">VO direction:</span>{' '}
                                          {montagePlanMeta[key]!.audioDirection}
                                        </p>
                                        <details className="text-[11px] group">
                                          <summary className="cursor-pointer text-violet-800 font-medium list-none flex items-center gap-1 [&::-webkit-details-marker]:hidden">
                                            <ChevronDown className="w-3.5 h-3.5 shrink-0 transition group-open:rotate-180" />
                                            Override join style
                                          </summary>
                                          <div className="flex flex-wrap gap-1.5 mt-2">
                                            {MONTAGE_MERGE_TRANSITIONS.map(t => (
                                              <button
                                                key={t.id}
                                                type="button"
                                                onClick={() =>
                                                  setMontageMergeOverrideByKey(prev => ({
                                                    ...prev,
                                                    [key]: t.id,
                                                  }))
                                                }
                                                disabled={
                                                  montagePlanKey === key ||
                                                  montageGenKey === key ||
                                                  montageRegenBusyThisIdea
                                                }
                                                title={t.description}
                                                className={cn(
                                                  'px-2 py-1 rounded-md text-[11px] font-medium border transition',
                                                  montageMergeForKey(key) === t.id
                                                    ? 'border-violet-500 bg-white text-violet-900 shadow-sm'
                                                    : 'border-violet-200/80 bg-violet-100/30 text-violet-800 hover:bg-violet-100/60',
                                                  'disabled:opacity-50'
                                                )}
                                              >
                                                {t.label}
                                              </button>
                                            ))}
                                          </div>
                                          {montageMergeOverrideByKey[key] !== undefined && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setMontageMergeOverrideByKey(prev => {
                                                  const next = { ...prev }
                                                  delete next[key]
                                                  return next
                                                })
                                              }
                                              disabled={
                                                montagePlanKey === key ||
                                                montageGenKey === key ||
                                                montageRegenBusyThisIdea
                                              }
                                              className="mt-2 text-[11px] font-medium text-violet-800 hover:underline disabled:opacity-50"
                                            >
                                              Reset to AI choice
                                            </button>
                                          )}
                                          <p className="text-[10px] text-gray-500 mt-2 leading-snug">
                                            {MONTAGE_MERGE_TRANSITIONS.find(x => x.id === montageMergeForKey(key))
                                              ?.description ?? ''}{' '}
                                            Crossfade and swipe options re-encode the combined export (slightly slower
                                            than black beats).
                                          </p>
                                        </details>
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-gray-500 leading-snug">
                                        Run <strong>Plan</strong> so the creative picks join style (cuts, crossfade,
                                        swipes…), pacing, and voiceover direction for this idea.
                                      </p>
                                    )}
                                    <p className="text-[11px] text-gray-600">
                                      Visual style for the planner — same hooks as before.
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {(Object.keys(VIDEO_GEN_HOOKS) as VideoGenHook[]).map(h => (
                                        <button
                                          key={h}
                                          type="button"
                                          onClick={() => setVideoHook(h)}
                                          disabled={
                                            imageGenKey === key ||
                                            montageGenKey === key ||
                                            montagePlanKey === key ||
                                            montageRegenBusyThisIdea
                                          }
                                          className={cn(
                                            'px-2.5 py-1 rounded-md text-xs font-medium border transition',
                                            videoHook === h
                                              ? 'border-violet-500 bg-violet-50 text-violet-800'
                                              : 'border-gray-200 text-gray-600 hover:border-gray-300',
                                            'disabled:opacity-50'
                                          )}
                                        >
                                          {VIDEO_HOOK_LABELS[h]}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        type="button"
                                        onClick={() => planStudioMontage(idx, activePlatform)}
                                        disabled={
                                          montageGenKey === key ||
                                          montageRegenBusyThisIdea ||
                                          imageGenKey === key ||
                                          montagePlanKey === key
                                        }
                                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-violet-300 bg-violet-50 text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                                      >
                                        {montagePlanKey === key ? (
                                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Planning…</>
                                        ) : (
                                          <><Sparkles className="w-3.5 h-3.5" /> Plan {montageClipCount} scenes</>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => renderStudioMontage(idx, activePlatform)}
                                        disabled={
                                          montageGenKey === key ||
                                          montageRegenBusyThisIdea ||
                                          imageGenKey === key ||
                                          montagePlanKey === key ||
                                          !montageScenesDraft[key] ||
                                          montageScenesDraft[key]!.length !== montageClipCount
                                        }
                                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-50"
                                      >
                                        {montageGenKey === key ? (
                                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</>
                                        ) : (
                                          <><Clapperboard className="w-3.5 h-3.5" /> Create video</>
                                        )}
                                      </button>
                                    </div>
                                    {montageScenesDraft[key] &&
                                      montageScenesDraft[key]!.length > 0 &&
                                      montageScenesDraft[key]!.length !== montageClipCount && (
                                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
                                        You have {montageScenesDraft[key]!.length} planned scene(s). Set{' '}
                                        <strong>Number of clips</strong> to match, or run <strong>Plan</strong> again.
                                      </p>
                                    )}
                                    {montageScenesDraft[key] && montageScenesDraft[key]!.length === montageClipCount ? (
                                      <div className="space-y-3">
                                        {montageScenesDraft[key]!.map((scene, sIdx) => (
                                          <div
                                            key={sIdx}
                                            className="rounded-lg border border-violet-100 bg-white p-3 space-y-2 shadow-sm"
                                          >
                                            <p className="text-[11px] font-semibold text-violet-900">
                                              Scene {sIdx + 1}
                                            </p>
                                            <input
                                              type="text"
                                              className="w-full text-xs border border-gray-200 rounded-md px-2 py-1.5"
                                              value={scene.label}
                                              onChange={e =>
                                                updateMontageSceneDraft(key, sIdx, 'label', e.target.value)
                                              }
                                              disabled={
                                                imageGenKey === key ||
                                                montageGenKey === key ||
                                                montageRegenBusyThisIdea ||
                                                montagePlanKey === key
                                              }
                                              aria-label={`Scene ${sIdx + 1} label`}
                                            />
                                            <textarea
                                              className="w-full text-xs text-gray-800 border border-gray-200 rounded-lg p-2 min-h-[72px] focus:outline-none focus:ring-2 focus:ring-violet-200"
                                              value={scene.veoPrompt}
                                              onChange={e =>
                                                updateMontageSceneDraft(key, sIdx, 'veoPrompt', e.target.value)
                                              }
                                              disabled={
                                                imageGenKey === key ||
                                                montageGenKey === key ||
                                                montageRegenBusyThisIdea ||
                                                montagePlanKey === key
                                              }
                                              placeholder="Veo prompt for this clip…"
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-600">
                                        Set <strong>Number of clips</strong>, then <strong>Plan scenes</strong>. Edit
                                        prompts, then <strong>Create video</strong>.
                                      </p>
                                    )}
                                    {mediaGenError[`${key}-montage`] && (
                                      <p className="text-red-600 text-xs">{mediaGenError[`${key}-montage`]}</p>
                                    )}
                                    <p className="text-[11px] text-gray-500">
                                      Short <strong>black beats</strong> between clips so cuts read clearly (~4s each +
                                      gaps). Creating the video may take several minutes.
                                    </p>
                                  </div>

                                  {/* Video output — below script + controls */}
                                  {entry.videoDataUrl && (
                                    <div className="space-y-4 border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                                      {(entry.montageSegmentDataUrls?.length ?? 0) >= MONTAGE_SCENE_MIN && (
                                        <div>
                                          <p className="text-[11px] font-semibold text-violet-900 mb-2">
                                            Separate clips ({entry.montageSegmentDataUrls!.length})
                                          </p>
                                          <p className="text-[10px] text-gray-600 mb-2">
                                            Change a scene prompt above, then <strong>Re-generate this clip</strong> for
                                            that slot (one generation each).
                                          </p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {entry.montageSegmentDataUrls!.map((src, si) => {
                                              const label =
                                                entry.montageSceneLabels?.[si] ?? `Scene ${si + 1}`
                                              const sceneRegenBusyKey = `${key}-${si}`
                                              const thisClipRegenerating =
                                                montageSceneRegenKey === sceneRegenBusyKey
                                              const montageClipActionsLocked =
                                                montageGenKey === key ||
                                                montageRegenBusyThisIdea ||
                                                imageGenKey === key ||
                                                montagePlanKey === key
                                              return (
                                                <div
                                                  key={si}
                                                  className="rounded-lg border border-violet-200 bg-violet-50/50 overflow-hidden"
                                                >
                                                  <p className="text-[10px] font-medium text-violet-800 px-2 py-1 border-b border-violet-100 truncate">
                                                    {label}
                                                  </p>
                                                  <video
                                                    src={src}
                                                    controls
                                                    className="w-full max-h-44 object-contain bg-black"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      regenerateMontageScene(idx, activePlatform, si)
                                                    }
                                                    disabled={montageClipActionsLocked}
                                                    className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-violet-900 bg-violet-100/80 hover:bg-violet-200/80 border-t border-violet-100 py-1.5 disabled:opacity-50"
                                                  >
                                                    {thisClipRegenerating ? (
                                                      <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Re-generating…
                                                      </>
                                                    ) : (
                                                      <>
                                                        <RefreshCw className="w-3 h-3" />
                                                        Re-generate this clip
                                                      </>
                                                    )}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      downloadDataUrl(
                                                        src,
                                                        `studio-${idx}-scene-${si + 1}.mp4`
                                                      )
                                                    }
                                                    className="w-full text-center text-[10px] text-violet-700 hover:underline py-1.5"
                                                  >
                                                    Download this clip
                                                  </button>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      <div>
                                        <p className="text-[11px] font-semibold text-gray-700 mb-2">
                                          {(entry.montageSegmentDataUrls?.length ?? 0) >= MONTAGE_SCENE_MIN
                                            ? 'Combined video (for approvals)'
                                            : 'Video'}
                                        </p>
                                        {entry.montageSceneLabels &&
                                          entry.montageSceneLabels.length > 0 &&
                                          (entry.montageSegmentDataUrls?.length ?? 0) < MONTAGE_SCENE_MIN && (
                                            <p className="text-[11px] text-violet-700 font-medium mb-1">
                                              Montage scenes: {entry.montageSceneLabels.join(' → ')}
                                            </p>
                                          )}
                                        <video
                                          src={entry.videoDataUrl}
                                          controls
                                          className="max-w-full max-h-80 rounded-lg border border-gray-200 bg-black"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            downloadDataUrl(
                                              entry.videoDataUrl!,
                                              `studio-${idx}-${
                                                (entry.montageSegmentDataUrls?.length ?? 0) >= MONTAGE_SCENE_MIN
                                                  ? 'montage-merged'
                                                  : 'video'
                                              }.mp4`
                                            )
                                          }
                                          className="flex items-center gap-1 text-xs text-violet-700 hover:underline mt-2"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                          {(entry.montageSegmentDataUrls?.length ?? 0) >= MONTAGE_SCENE_MIN
                                            ? 'Download combined MP4'
                                            : 'Download MP4'}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Image — optional, after video */}
                                  <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
                                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                                      <ImageIcon className="w-3.5 h-3.5" />
                                      Image — Imagen Fast · optional
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                      {(Object.keys(IMAGE_GEN_HOOKS) as ImageGenHook[]).map(h => (
                                        <button
                                          key={h}
                                          type="button"
                                          onClick={() => setImageHook(h)}
                                          className={cn(
                                            'px-2.5 py-1 rounded-md text-xs font-medium border transition',
                                            imageHook === h
                                              ? 'border-blue-500 bg-blue-50 text-blue-800'
                                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                          )}
                                        >
                                          {IMAGE_HOOK_LABELS[h]}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => generateStudioImage(idx, activePlatform)}
                                      disabled={
                                        imageGenKey === key ||
                                        montageGenKey === key ||
                                        montagePlanKey === key ||
                                        montageRegenBusyThisIdea
                                      }
                                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                                    >
                                      {imageGenKey === key ? (
                                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating image…</>
                                      ) : (
                                        <><ImageIcon className="w-3.5 h-3.5" /> Generate image</>
                                      )}
                                    </button>
                                    {mediaGenError[`${key}-image`] && (
                                      <p className="text-red-600 text-xs mt-2">{mediaGenError[`${key}-image`]}</p>
                                    )}
                                    {entry.imageDataUrl && (
                                      <div className="mt-3 space-y-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={entry.imageDataUrl}
                                          alt=""
                                          className="max-w-full max-h-80 rounded-lg border border-gray-200 object-contain bg-gray-50"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            downloadDataUrl(entry.imageDataUrl!, `studio-${idx}-image.png`)
                                          }
                                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                        >
                                          <Download className="w-3.5 h-3.5" /> Download PNG
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {entry.notes && (
                                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                  💡 {entry.notes}
                                </p>
                              )}
                            </>
                          )}

                          {/* ── Thread ── */}
                          {entry.type === 'thread' && (
                            <div className="space-y-2">
                              {entry.tweets.map((tweet, tIdx) => (
                                <div key={tIdx} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs text-gray-400 font-mono shrink-0 mt-1 w-4">{tIdx + 1}</span>
                                    <textarea
                                      className="flex-1 text-sm text-gray-800 bg-transparent resize-none focus:outline-none"
                                      rows={Math.max(2, Math.ceil(tweet.length / 60))}
                                      value={tweet}
                                      onChange={e => updateTweet(key, tIdx, e.target.value)}
                                    />
                                  </div>
                                  <div className="flex justify-end mt-1">
                                    <span className={cn('text-xs', tweet.length > 260 ? 'text-red-500' : 'text-gray-400')}>
                                      {tweet.length}/280
                                    </span>
                                  </div>
                                </div>
                              ))}
                              <button
                                onClick={() => copyContent(copyableText(entry), key)}
                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition mt-1"
                              >
                                {copied === key
                                  ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</>
                                  : <><Copy className="w-3.5 h-3.5" /> Copy entire thread</>}
                              </button>
                            </div>
                          )}

                          {/* ── Carousel ── */}
                          {entry.type === 'carousel' && (
                            <div className="space-y-2">
                              {/* Cover */}
                              <div className="bg-blue-600 rounded-lg p-4 text-white">
                                <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-60">Cover</p>
                                <input
                                  className="w-full bg-transparent font-bold text-base text-white placeholder:text-white/50 focus:outline-none"
                                  value={entry.cover}
                                  onChange={e => updateCarouselCover(key, e.target.value)}
                                />
                              </div>
                              {/* Slides */}
                              {entry.slides.map((slide, sIdx) => (
                                <div key={sIdx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                  <p className="text-xs text-gray-400 mb-2">Slide {sIdx + 1}</p>
                                  <input
                                    className="w-full font-semibold text-sm text-gray-900 bg-transparent focus:outline-none mb-1 border-b border-transparent focus:border-gray-300 pb-1"
                                    value={slide.headline}
                                    onChange={e => updateSlide(key, sIdx, 'headline', e.target.value)}
                                    placeholder="Slide headline"
                                  />
                                  <textarea
                                    className="w-full text-sm text-gray-600 bg-transparent resize-none focus:outline-none mt-2"
                                    rows={2}
                                    value={slide.body}
                                    onChange={e => updateSlide(key, sIdx, 'body', e.target.value)}
                                  />
                                </div>
                              ))}
                              {/* CTA */}
                              <div className="bg-gray-900 rounded-lg p-4 text-white">
                                <p className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-60">CTA</p>
                                <input
                                  className="w-full bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
                                  value={entry.cta}
                                  onChange={e => updateCarouselCta(key, e.target.value)}
                                />
                              </div>
                              <button
                                onClick={() => copyContent(copyableText(entry), key)}
                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition"
                              >
                                {copied === key
                                  ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</>
                                  : <><Copy className="w-3.5 h-3.5" /> Copy all</>}
                              </button>
                            </div>
                          )}

                          {/* ── Actions row (montage + approvals) ── */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => fetchContent(idx, activePlatform, true)}
                              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition self-start shrink-0"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Regenerate
                            </button>

                            <div className="flex flex-col items-stretch sm:items-end gap-2 min-w-0 flex-1">
                              <div className="flex flex-wrap gap-2 sm:justify-end items-center">
                                {entry.saved ? (
                                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                    <Check className="w-3.5 h-3.5 shrink-0" /> Sent for publishing review
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => sendToApprovals(idx, activePlatform)}
                                    disabled={
                                      saving === key ||
                                      (format === 'script' &&
                                        entry.type === 'post' &&
                                        !entry.videoDataUrl)
                                    }
                                    title={
                                      format === 'script' &&
                                      entry.type === 'post' &&
                                      !entry.videoDataUrl
                                        ? 'Create your video first'
                                        : undefined
                                    }
                                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition disabled:opacity-50"
                                  >
                                    {saving === key ? (
                                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                                    ) : format === 'script' ? (
                                      <><Send className="w-3.5 h-3.5" /> Send to approvals (video + script)</>
                                    ) : (
                                      <><Send className="w-3.5 h-3.5" /> Send for approval</>
                                    )}
                                  </button>
                                )}
                              </div>
                              {approvalSendError[key] && (
                                <p className="text-xs text-red-600 text-right w-full sm:max-w-sm">
                                  {approvalSendError[key]}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
