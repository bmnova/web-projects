'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/firebase/auth-context'
import { Header } from '@/components/layout/Header'
import {
  Layers, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Send, FileText, List, LayoutGrid, Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrandProfile, ContentAngle, Platform, Format, AssetType } from '@/types'

// ── Constants ────────────────────────────────────────────────────────────────

const FORMATS: { value: Format; label: string; Icon: React.ElementType; desc: string }[] = [
  { value: 'post',     label: 'Post',     Icon: FileText,    desc: 'Metin paylaşımı' },
  { value: 'thread',   label: 'Thread',   Icon: List,        desc: 'Tweet serisi' },
  { value: 'carousel', label: 'Carousel', Icon: LayoutGrid,  desc: 'Slide içerik' },
  { value: 'script',   label: 'Script',   Icon: Video,       desc: 'Video scripti' },
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
  { value: 'pain_point',  label: 'Pain Point',  desc: 'Sorunu öne çıkar' },
  { value: 'feature',     label: 'Özellik',     desc: 'Ürün tanıtımı' },
  { value: 'educational', label: 'Eğitici',     desc: 'Bilgi paylaş' },
  { value: 'comparison',  label: 'Karşılaştır', desc: 'Rakiple kıyasla' },
  { value: 'founder',     label: 'Kurucu',      desc: 'Hikaye anlat' },
  { value: 'launch',      label: 'Lansman',     desc: 'Duyuru yap' },
]

const TONE_LABELS: Record<string, string> = {
  professional: 'Profesyonel',
  casual: 'Samimi',
  humorous: 'Eğlenceli',
  educational: 'Eğitici',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Idea { title: string; hook: string }

type PostEntry     = { type: 'post';     text: string; notes: string; saved: boolean }
type ThreadEntry   = { type: 'thread';   tweets: string[]; saved: boolean }
type CarouselEntry = { type: 'carousel'; cover: string; slides: { headline: string; body: string }[]; cta: string; saved: boolean }
type CachedContent = PostEntry | ThreadEntry | CarouselEntry

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

  useEffect(() => {
    if (!user) return
    loadBrandData(user.uid).then(setBrandData).finally(() => setLoadingBrand(false))
  }, [user])

  // ── Format change ─────────────────────────────────────────────────────────

  function handleFormatChange(f: Format) {
    setFormat(f)
    setIdeas([])
    setExpanded(null)
    setCache({})
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
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/generate/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ brandProfile: brandData.profile, angle, platforms }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setIdeas(data.ideas)
    } catch {
      setGenError('İçerik üretilemedi, tekrar dene.')
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
        if (data.error) throw new Error(data.error)
        entry = { type: 'thread', tweets: data.tweets, saved: false }

      } else if (format === 'carousel') {
        const res = await fetch('/api/generate/carousel', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({ idea: ideas[ideaIdx], brandProfile: brandData.profile }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        entry = { type: 'carousel', cover: data.cover, slides: data.slides, cta: data.cta, saved: false }

      } else {
        const res = await fetch('/api/generate/content', {
          method: 'POST',
          headers: authHeader,
          body: JSON.stringify({ idea: ideas[ideaIdx], brandProfile: brandData.profile, platform }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        entry = { type: 'post', text: data.content, notes: data.notes, saved: false }
      }

      setCache(prev => ({ ...prev, [key]: entry }))
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
    setCache(prev => ({ ...prev, [key]: { ...(prev[key] as PostEntry), text } }))
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
    return entry.text
  }

  // ── Save to approvals ─────────────────────────────────────────────────────

  async function sendToApprovals(ideaIdx: number, platform: Platform) {
    if (!brandData) return
    const key = `${ideaIdx}-${platform}-${format}`
    const entry = cache[key]
    if (!entry) return
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

      if (entry.type === 'thread') {
        assetType = 'thread'
        content = { tweets: entry.tweets }
      } else if (entry.type === 'carousel') {
        assetType = 'carousel'
        content = { cover: entry.cover, slides: entry.slides, cta: entry.cta }
      } else {
        assetType = format === 'script' ? 'script' : 'text'
        content = { text: entry.text, notes: entry.notes }
      }

      await saveAsset(brandData.workspaceId, ideaId, { platform, type: assetType, content })
      setCache(prev => ({ ...prev, [key]: { ...prev[key], saved: true } as CachedContent }))
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
              Önce <a href="/onboarding" className="text-blue-600 hover:underline">onboarding</a>&apos;i tamamla.
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
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">

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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">İçerik Açısı</p>
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
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Fikirler üretiliyor…</>
              : <><Sparkles className="w-4 h-4" /> Fikir Üret</>}
          </button>

          {genError && <p className="text-red-600 text-sm text-center">{genError}</p>}
        </div>

        {/* Ideas List */}
        {ideas.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {ideas.length} Fikir Üretildi
            </p>

            {ideas.map((idea, idx) => {
              const isOpen = expanded === idx
              const key = `${idx}-${activePlatform}-${format}`
              const entry = cache[key]
              const isLoading = contentLoading === key
              const platformMeta = ALL_PLATFORMS.find(p => p.value === activePlatform)!

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
                          <span className="ml-2 text-sm text-gray-500">İçerik yazılıyor…</span>
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
                                  value={entry.text}
                                  onChange={e => updatePostText(key, e.target.value)}
                                />
                                <button
                                  onClick={() => copyContent(entry.text, key)}
                                  className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-gray-900 transition"
                                >
                                  {copied === key
                                    ? <Check className="w-3.5 h-3.5 text-green-600" />
                                    : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <span className={cn(
                                  'absolute bottom-2 right-2 text-xs',
                                  charLimitColor(entry.text.length, platformMeta.limit)
                                )}>
                                  {entry.text.length.toLocaleString()} / {platformMeta.limit.toLocaleString()}
                                </span>
                              </div>
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
                                  ? <><Check className="w-3.5 h-3.5 text-green-600" /> Kopyalandı</>
                                  : <><Copy className="w-3.5 h-3.5" /> Tüm thread&apos;i kopyala</>}
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
                                    placeholder="Slide başlığı"
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
                                  ? <><Check className="w-3.5 h-3.5 text-green-600" /> Kopyalandı</>
                                  : <><Copy className="w-3.5 h-3.5" /> Tümünü kopyala</>}
                              </button>
                            </div>
                          )}

                          {/* ── Actions row ── */}
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <button
                              onClick={() => fetchContent(idx, activePlatform, true)}
                              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Yeniden üret
                            </button>

                            {entry.saved ? (
                              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                <Check className="w-3.5 h-3.5" /> Onay kuyruğuna eklendi
                              </span>
                            ) : (
                              <button
                                onClick={() => sendToApprovals(idx, activePlatform)}
                                disabled={saving === key}
                                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                              >
                                {saving === key
                                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Kaydediliyor…</>
                                  : <><Send className="w-3.5 h-3.5" /> Onaya Gönder</>}
                              </button>
                            )}
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
