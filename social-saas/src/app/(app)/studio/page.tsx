'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/firebase/auth-context'
import { Header } from '@/components/layout/Header'
import {
  Layers, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  Loader2, RefreshCw, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrandProfile, ContentAngle, Platform } from '@/types'

// ── Constants ────────────────────────────────────────────────────────────────

const ANGLES: { value: ContentAngle; label: string; desc: string }[] = [
  { value: 'pain_point',  label: 'Pain Point',  desc: 'Sorunu öne çıkar' },
  { value: 'feature',     label: 'Özellik',     desc: 'Ürün tanıtımı' },
  { value: 'educational', label: 'Eğitici',     desc: 'Bilgi paylaş' },
  { value: 'comparison',  label: 'Karşılaştır', desc: 'Rakiple kıyasla' },
  { value: 'founder',     label: 'Kurucu',      desc: 'Hikaye anlat' },
  { value: 'launch',      label: 'Lansman',     desc: 'Duyuru yap' },
]

const PLATFORMS: { value: Platform; label: string; emoji: string; limit: number }[] = [
  { value: 'reddit',    label: 'Reddit',    emoji: '🟠', limit: 40000 },
  { value: 'instagram', label: 'Instagram', emoji: '📸', limit: 2200  },
  { value: 'tiktok',    label: 'TikTok',    emoji: '🎵', limit: 2200  },
  { value: 'youtube',   label: 'YouTube',   emoji: '▶️', limit: 5000  },
]

const TONE_LABELS: Record<string, string> = {
  professional: 'Profesyonel',
  casual: 'Samimi',
  humorous: 'Eğlenceli',
  educational: 'Eğitici',
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Idea { title: string; hook: string }

interface CachedContent {
  text: string   // editable copy
  notes: string
  saved: boolean // sent to approvals
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const { user } = useAuth()

  // brand
  const [brandData, setBrandData] = useState<Awaited<ReturnType<typeof loadBrandData>>>(null)
  const [loadingBrand, setLoadingBrand] = useState(true)

  // form
  const [angle, setAngle] = useState<ContentAngle>('pain_point')
  const [platforms, setPlatforms] = useState<Platform[]>(['reddit'])

  // ideas
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  // expanded idea
  const [expanded, setExpanded] = useState<number | null>(null)
  const [activePlatform, setActivePlatform] = useState<Platform>('reddit')

  // content: key = `${ideaIdx}-${platform}`
  const [cache, setCache] = useState<Record<string, CachedContent>>({})
  const [contentLoading, setContentLoading] = useState<string | null>(null) // key being loaded

  // copy
  const [copied, setCopied] = useState<string | null>(null)
  // save
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadBrandData(user.uid).then(setBrandData).finally(() => setLoadingBrand(false))
  }, [user])

  // ── Actions ──────────────────────────────────────────────────────────────

  function togglePlatform(p: Platform) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  async function generateIdeas() {
    if (!brandData || platforms.length === 0) return
    setGenerating(true)
    setGenError('')
    setIdeas([])
    setExpanded(null)
    setCache({})
    try {
      const res = await fetch('/api/generate/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  async function fetchContent(ideaIdx: number, platform: Platform, force = false) {
    if (!brandData) return
    const key = `${ideaIdx}-${platform}`
    if (cache[key] && !force) return
    setContentLoading(key)
    try {
      const res = await fetch('/api/generate/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: ideas[ideaIdx], brandProfile: brandData.profile, platform }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCache(prev => ({ ...prev, [key]: { text: data.content, notes: data.notes, saved: false } }))
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

  function updateText(key: string, text: string) {
    setCache(prev => ({ ...prev, [key]: { ...prev[key], text } }))
  }

  async function copyContent(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  async function sendToApprovals(ideaIdx: number, platform: Platform) {
    if (!brandData) return
    const key = `${ideaIdx}-${platform}`
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
      await saveAsset(brandData.workspaceId, ideaId, {
        platform,
        text: entry.text,
        notes: entry.notes,
      })
      setCache(prev => ({ ...prev, [key]: { ...prev[key], saved: true } }))
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
              Önce <a href="/onboarding" className="text-blue-600 hover:underline">onboarding</a>'i tamamla.
            </p>
          </div>
        </main>
      </>
    )
  }

  const { profile } = brandData

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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Platformlar</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.value}
                  onClick={() => togglePlatform(p.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition',
                    platforms.includes(p.value)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
              const key = `${idx}-${activePlatform}`
              const entry = cache[key]
              const isLoading = contentLoading === key
              const platformMeta = PLATFORMS.find(p => p.value === activePlatform)!

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

                      {/* Platform Tabs */}
                      <div className="flex gap-1">
                        {platforms.map(p => {
                          const pm = PLATFORMS.find(x => x.value === p)!
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

                      {/* Content area */}
                      {isLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="ml-2 text-sm text-gray-500">İçerik yazılıyor…</span>
                        </div>
                      ) : entry ? (
                        <div className="space-y-3">

                          {/* Textarea + toolbar */}
                          <div className="relative">
                            <textarea
                              className="w-full border border-gray-200 rounded-lg p-3 pr-10 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                              rows={8}
                              value={entry.text}
                              onChange={e => updateText(key, e.target.value)}
                            />
                            {/* Copy */}
                            <button
                              onClick={() => copyContent(entry.text, key)}
                              className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-gray-900 transition"
                              title="Kopyala"
                            >
                              {copied === key
                                ? <Check className="w-3.5 h-3.5 text-green-600" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {/* Character count */}
                            <span className={cn(
                              'absolute bottom-2 right-2 text-xs',
                              charLimitColor(entry.text.length, platformMeta.limit)
                            )}>
                              {entry.text.length.toLocaleString()} / {platformMeta.limit.toLocaleString()}
                            </span>
                          </div>

                          {/* Notes */}
                          {entry.notes && (
                            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-100">
                              💡 {entry.notes}
                            </p>
                          )}

                          {/* Actions row */}
                          <div className="flex items-center justify-between gap-2">
                            {/* Regenerate */}
                            <button
                              onClick={() => fetchContent(idx, activePlatform, true)}
                              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Yeniden üret
                            </button>

                            {/* Send to approvals */}
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
