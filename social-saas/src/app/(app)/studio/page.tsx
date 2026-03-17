'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/firebase/auth-context'
import { Header } from '@/components/layout/Header'
import {
  Layers, Sparkles, Copy, Check, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrandProfile, ContentAngle, Platform } from '@/types'

// ── Types ────────────────────────────────────────────────────────────────────

interface Idea {
  title: string
  hook: string
}

interface GeneratedContent {
  content: string
  notes: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const ANGLES: { value: ContentAngle; label: string; desc: string }[] = [
  { value: 'pain_point',   label: 'Pain Point',  desc: 'Sorunu öne çıkar' },
  { value: 'feature',      label: 'Özellik',     desc: 'Ürün tanıtımı' },
  { value: 'educational',  label: 'Eğitici',     desc: 'Bilgi paylaş' },
  { value: 'comparison',   label: 'Karşılaştır', desc: 'Rakiple kıyasla' },
  { value: 'founder',      label: 'Kurucu',      desc: 'Hikaye anlat' },
  { value: 'launch',       label: 'Lansman',     desc: 'Duyuru yap' },
]

const PLATFORMS: { value: Platform; label: string; emoji: string }[] = [
  { value: 'reddit',    label: 'Reddit',    emoji: '🟠' },
  { value: 'instagram', label: 'Instagram', emoji: '📸' },
  { value: 'tiktok',    label: 'TikTok',    emoji: '🎵' },
  { value: 'youtube',   label: 'YouTube',   emoji: '▶️' },
]

const TONE_LABELS: Record<string, string> = {
  professional: 'Profesyonel',
  casual: 'Samimi',
  humorous: 'Eğlenceli',
  educational: 'Eğitici',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function loadBrandProfile(uid: string): Promise<{ workspaceId: string; profile: BrandProfile } | null> {
  const { getDoc, doc, collection, query, where, getDocs } = await import('firebase/firestore')
  const { getDb } = await import('@/lib/firebase/config')
  const db = getDb()

  const userSnap = await getDoc(doc(db, 'users', uid))
  if (!userSnap.exists()) return null
  const workspaceIds: string[] = userSnap.data().workspaceIds ?? []
  if (!workspaceIds.length) return null

  const workspaceId = workspaceIds[0]
  const wsSnap = await getDoc(doc(db, 'workspaces', workspaceId))
  if (!wsSnap.exists()) return null
  const brandProfileId: string | undefined = wsSnap.data().brandProfileId
  if (!brandProfileId) return null

  const bpSnap = await getDoc(doc(db, 'workspaces', workspaceId, 'brandProfiles', brandProfileId))
  if (!bpSnap.exists()) return null
  return { workspaceId, profile: bpSnap.data() as BrandProfile }
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StudioPage() {
  const { user } = useAuth()

  const [brandData, setBrandData] = useState<{ workspaceId: string; profile: BrandProfile } | null>(null)
  const [loadingBrand, setLoadingBrand] = useState(true)

  const [angle, setAngle] = useState<ContentAngle>('pain_point')
  const [platforms, setPlatforms] = useState<Platform[]>(['reddit'])

  const [ideas, setIdeas] = useState<Idea[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  // expanded idea index + platform
  const [expanded, setExpanded] = useState<number | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('reddit')

  // per-idea per-platform content cache
  const [contentCache, setContentCache] = useState<Record<string, GeneratedContent>>({})
  const [contentLoading, setContentLoading] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    loadBrandProfile(user.uid)
      .then(setBrandData)
      .finally(() => setLoadingBrand(false))
  }, [user])

  function togglePlatform(p: Platform) {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function generateIdeas() {
    if (!brandData || platforms.length === 0) return
    setGenerating(true)
    setGenError('')
    setIdeas([])
    setExpanded(null)
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

  async function generateContent(idea: Idea, platform: Platform, cacheKey: string) {
    if (!brandData) return
    setContentLoading(true)
    try {
      const res = await fetch('/api/generate/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, brandProfile: brandData.profile, platform }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setContentCache(prev => ({ ...prev, [cacheKey]: data }))
    } finally {
      setContentLoading(false)
    }
  }

  function handleExpand(idx: number) {
    if (expanded === idx) { setExpanded(null); return }
    setExpanded(idx)
    const defaultPlatform = platforms[0] ?? 'reddit'
    setSelectedPlatform(defaultPlatform)
    const key = `${idx}-${defaultPlatform}`
    if (!contentCache[key]) {
      generateContent(ideas[idx], defaultPlatform, key)
    }
  }

  function handlePlatformTab(idx: number, p: Platform) {
    setSelectedPlatform(p)
    const key = `${idx}-${p}`
    if (!contentCache[key]) {
      generateContent(ideas[idx], p, key)
    }
  }

  async function copyContent(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
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
              Önce <a href="/onboarding" className="text-blue-600 hover:underline">onboarding</a>'i tamamla ve marka profilini oluştur.
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
                  <span className="text-xs opacity-70">{a.desc}</span>
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
                  <span>{p.emoji}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateIdeas}
            disabled={generating || platforms.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition disabled:opacity-50"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Fikirler üretiliyor…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Fikir Üret</>
            )}
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
              const cacheKey = `${idx}-${selectedPlatform}`
              const cached = contentCache[cacheKey]

              return (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {/* Idea Header */}
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
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  {isOpen && (
                    <div className="border-t border-gray-100 p-4">
                      {/* Platform Tabs */}
                      <div className="flex gap-1 mb-4">
                        {platforms.map(p => {
                          const pl = PLATFORMS.find(x => x.value === p)!
                          return (
                            <button
                              key={p}
                              onClick={() => handlePlatformTab(idx, p)}
                              className={cn(
                                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition',
                                selectedPlatform === p
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              )}
                            >
                              {pl.emoji} {pl.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* Content */}
                      {contentLoading && !cached ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          <span className="ml-2 text-sm text-gray-500">İçerik yazılıyor…</span>
                        </div>
                      ) : cached ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <textarea
                              className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                              rows={8}
                              defaultValue={cached.content}
                            />
                            <button
                              onClick={() => copyContent(cached.content, cacheKey)}
                              className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-gray-900 transition"
                            >
                              {copied === cacheKey ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {cached.notes && (
                            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-100">
                              💡 {cached.notes}
                            </p>
                          )}
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
