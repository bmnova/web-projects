'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase/auth-context'
import { Header } from '@/components/layout/Header'
import {
  Sparkles, Loader2, ChevronRight, ChevronLeft, Check,
  Upload, X, Download, RefreshCw, Video, User, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrandProfile } from '@/types'
import { isAiQuotaExceededResponse } from '@/lib/ai-quota'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StoryPersona {
  story: string
  persona: string
  emotion: string
  reactionDesc: string
}

type Step = 'brief' | 'stories' | 'demo' | 'cta' | 'generate'

const STEPS: { id: Step; label: string }[] = [
  { id: 'brief',    label: 'Brief' },
  { id: 'stories',  label: 'Story & Persona' },
  { id: 'demo',     label: 'App Demo' },
  { id: 'cta',      label: 'CTA' },
  { id: 'generate', label: 'Generate' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadBrandData(uid: string) {
  const { getDoc, doc } = await import('firebase/firestore')
  const { getDb } = await import('@/lib/firebase/config')
  const db = getDb()

  const userSnap = await getDoc(doc(db, 'users', uid))
  if (!userSnap.exists()) return null
  const workspaceIds: string[] = userSnap.data().workspaceIds ?? []
  if (!workspaceIds.length) return null

  const workspaceId = workspaceIds[0]!
  const wsSnap = await getDoc(doc(db, 'workspaces', workspaceId))
  if (!wsSnap.exists()) return null
  const { brandProfileId } = wsSnap.data()
  if (!brandProfileId) return null

  const bpSnap = await getDoc(doc(db, 'workspaces', workspaceId, 'brandProfiles', brandProfileId))
  if (!bpSnap.exists()) return null

  return { profile: bpSnap.data() as BrandProfile }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const needle = ';base64,'
      const i = result.indexOf(needle)
      resolve(i >= 0 ? result.slice(i + needle.length) : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.id === current)
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : <span>{i + 1}</span>}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  active ? 'text-gray-900' : done ? 'text-blue-600' : 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px w-6 sm:w-8 mx-2', i < currentIdx ? 'bg-blue-400' : 'bg-gray-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AiInfluencersPage() {
  const { user } = useAuth()

  // Brand
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [loadingBrand, setLoadingBrand] = useState(true)

  // Wizard state
  const [step, setStep] = useState<Step>('brief')

  // Step 1 – Brief
  const [valueProps, setValueProps] = useState<string[]>([])
  const [selectedProps, setSelectedProps] = useState<string[]>([])
  const [generatingProps, setGeneratingProps] = useState(false)
  const [propsError, setPropsError] = useState('')

  // Step 2 – Stories
  const [stories, setStories] = useState<StoryPersona[]>([])
  const [selectedStory, setSelectedStory] = useState<StoryPersona | null>(null)
  const [generatingStories, setGeneratingStories] = useState(false)
  const [storiesError, setStoriesError] = useState('')

  // Step 3 – Demo
  const [demoFile, setDemoFile] = useState<File | null>(null)
  const [demoPreviewUrl, setDemoPreviewUrl] = useState('')
  const [requestProduction, setRequestProduction] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 4 – CTA
  const [ctaSuggestions, setCtaSuggestions] = useState<string[]>([])
  const [selectedCta, setSelectedCta] = useState('')
  const [customCta, setCustomCta] = useState('')
  const [generatingCta, setGeneratingCta] = useState(false)
  const [ctaError, setCtaError] = useState('')

  // Step 5 – Generate
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [finalVideoDataUrl, setFinalVideoDataUrl] = useState('')

  // Quota
  const [aiQuotaBlocked, setAiQuotaBlocked] = useState(false)

  // ── Load brand profile ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    loadBrandData(user.uid)
      .then((data) => { if (data) setBrandProfile(data.profile) })
      .finally(() => setLoadingBrand(false))
  }, [user])

  // ── Auth token helper ──────────────────────────────────────────────────────

  async function getToken(): Promise<string> {
    if (!user) throw new Error('Not authenticated')
    return user.getIdToken()
  }

  // ── Step 1: Generate value props ───────────────────────────────────────────

  async function handleGenerateProps() {
    if (!brandProfile) return
    setGeneratingProps(true)
    setPropsError('')
    try {
      const token = await getToken()
      const res = await fetch('/api/generate/influencer/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ brandProfile }),
      })
      const data = await res.json()
      if (!res.ok) { setPropsError(data.error || 'Failed'); return }
      setValueProps(data.valueProps ?? [])
    } catch {
      setPropsError('Request failed. Please try again.')
    } finally {
      setGeneratingProps(false)
    }
  }

  function toggleProp(p: string) {
    setSelectedProps((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : prev.length < 3 ? [...prev, p] : prev
    )
  }

  // ── Step 2: Generate stories ───────────────────────────────────────────────

  async function handleGenerateStories() {
    if (!brandProfile || selectedProps.length === 0) return
    setGeneratingStories(true)
    setStoriesError('')
    setStories([])
    setSelectedStory(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/generate/influencer/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ brandProfile, selectedProps }),
      })
      const data = await res.json()
      if (isAiQuotaExceededResponse(res, data)) { setAiQuotaBlocked(true); return }
      if (!res.ok) { setStoriesError(data.error || 'Failed'); return }
      setStories(data.stories ?? [])
    } catch {
      setStoriesError('Request failed. Please try again.')
    } finally {
      setGeneratingStories(false)
    }
  }

  // ── Step 3: Demo upload ────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setDemoFile(file)
    setDemoPreviewUrl(URL.createObjectURL(file))
    setRequestProduction(false)
  }

  function handleRemoveDemo() {
    setDemoFile(null)
    if (demoPreviewUrl) URL.revokeObjectURL(demoPreviewUrl)
    setDemoPreviewUrl('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Step 4: Generate CTAs ──────────────────────────────────────────────────

  async function handleGenerateCtas() {
    if (!brandProfile) return
    setGeneratingCta(true)
    setCtaError('')
    try {
      const token = await getToken()
      const res = await fetch('/api/generate/influencer/cta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ brandProfile }),
      })
      const data = await res.json()
      if (!res.ok) { setCtaError(data.error || 'Failed'); return }
      setCtaSuggestions(data.ctas ?? [])
      if (data.ctas?.length > 0 && !selectedCta) setSelectedCta(data.ctas[0])
    } catch {
      setCtaError('Request failed. Please try again.')
    } finally {
      setGeneratingCta(false)
    }
  }

  // ── Step 5: Generate video ─────────────────────────────────────────────────

  async function handleGenerate() {
    if (!brandProfile || !selectedStory) return
    const cta = customCta.trim() || selectedCta
    if (!cta) return

    setGenerating(true)
    setGenError('')
    setFinalVideoDataUrl('')
    try {
      const token = await getToken()
      let demoVideoBase64: string | undefined
      if (demoFile) {
        demoVideoBase64 = await fileToBase64(demoFile)
      }

      const res = await fetch('/api/generate/influencer/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ brandProfile, story: selectedStory, demoVideoBase64, cta }),
      })
      const data = await res.json()
      if (isAiQuotaExceededResponse(res, data)) { setAiQuotaBlocked(true); return }
      if (!res.ok) { setGenError(data.error || 'Generation failed'); return }
      setFinalVideoDataUrl(`data:${data.mimeType || 'video/mp4'};base64,${data.base64}`)
    } catch {
      setGenError('Request failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  function downloadVideo() {
    const a = document.createElement('a')
    a.href = finalVideoDataUrl
    a.download = `ugc-${brandProfile?.productName?.replace(/\s+/g, '-').toLowerCase() ?? 'video'}.mp4`
    a.click()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loadingBrand) {
    return (
      <>
        <Header title="AI Influencers" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </main>
      </>
    )
  }

  if (!brandProfile) {
    return (
      <>
        <Header title="AI Influencers" />
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <p className="text-gray-500 text-sm mb-3">No brand profile found.</p>
            <Link href="/settings/brand" className="text-blue-600 text-sm font-medium hover:underline">
              Set up your brand profile →
            </Link>
          </div>
        </main>
      </>
    )
  }

  const activeCta = customCta.trim() || selectedCta

  return (
    <>
      <Header title="AI Influencers" />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">

        {/* Quota banner */}
        {aiQuotaBlocked && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 leading-relaxed">
              <span className="font-semibold text-amber-900">You&apos;ve hit your monthly AI limit.</span>{' '}
              Upgrade your plan to keep generating.
            </p>
            <Link
              href="/settings/billing"
              className="shrink-0 inline-flex items-center justify-center rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
            >
              View plans &amp; upgrade
            </Link>
          </div>
        )}

        {/* Header card */}
        <div className="flex items-center gap-3 mb-6 bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-violet-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{brandProfile.productName}</p>
            <p className="text-xs text-gray-400 truncate">UGC video factory — hook + demo + CTA</p>
          </div>
        </div>

        <StepIndicator current={step} />

        {/* ── Step 1: Brief ── */}
        {step === 'brief' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">What makes your app great?</h2>
              <p className="text-sm text-gray-500">
                We&apos;ll generate viral value propositions. Pick up to 3 that resonate most.
              </p>
            </div>

            {/* Brand snapshot */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 space-y-1">
              <p><span className="font-medium text-gray-800">App:</span> {brandProfile.productName}</p>
              <p><span className="font-medium text-gray-800">Audience:</span> {brandProfile.targetAudience}</p>
            </div>

            {valueProps.length === 0 ? (
              <button
                onClick={handleGenerateProps}
                disabled={generatingProps}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
              >
                {generatingProps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generatingProps ? 'Generating…' : 'Generate value props'}
              </button>
            ) : (
              <>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  Select up to 3 ({selectedProps.length}/3)
                </p>
                <div className="flex flex-wrap gap-2">
                  {valueProps.map((p) => (
                    <button
                      key={p}
                      onClick={() => toggleProp(p)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium border transition',
                        selectedProps.includes(p)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:text-blue-700'
                      )}
                    >
                      {selectedProps.includes(p) && <Check className="inline w-3 h-3 mr-1" />}
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerateProps}
                  disabled={generatingProps}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </>
            )}

            {propsError && <p className="text-red-500 text-sm">{propsError}</p>}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setStep('stories')}
                disabled={selectedProps.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
              >
                Next: Story &amp; Persona
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Stories ── */}
        {step === 'stories' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Story &amp; Persona</h2>
              <p className="text-sm text-gray-500">
                AI creates viral hooks and matching influencer personas based on your chosen value props.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedProps.map((p) => (
                <span key={p} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  {p}
                </span>
              ))}
            </div>

            {stories.length === 0 ? (
              <button
                onClick={handleGenerateStories}
                disabled={generatingStories || aiQuotaBlocked}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
              >
                {generatingStories ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generatingStories ? 'Generating stories…' : 'Generate stories'}
              </button>
            ) : (
              <>
                <div className="space-y-3">
                  {stories.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedStory(s)}
                      className={cn(
                        'w-full text-left rounded-xl border p-4 transition',
                        selectedStory === s
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                          selectedStory === s ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                        )}>
                          {selectedStory === s && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 mb-1 italic">
                            &ldquo;{s.story}&rdquo;
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {s.persona}
                            </span>
                            <span className="flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              Reaction: {s.emotion}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerateStories}
                  disabled={generatingStories || aiQuotaBlocked}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </>
            )}

            {storiesError && <p className="text-red-500 text-sm">{storiesError}</p>}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep('brief')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep('demo')}
                disabled={!selectedStory}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
              >
                Next: App Demo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Demo ── */}
        {step === 'demo' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">App Demo Video</h2>
              <p className="text-sm text-gray-500">
                Upload a short demo of your app (15–60 sec recommended), or request production.
              </p>
            </div>

            {!demoFile && !requestProduction && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Upload card */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition"
                >
                  <Upload className="w-6 h-6 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Upload your demo</p>
                    <p className="text-xs text-gray-400 mt-0.5">MP4, MOV · max 200 MB</p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Production card */}
                <button
                  onClick={() => setRequestProduction(true)}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center hover:border-violet-400 hover:bg-violet-50 transition"
                >
                  <Sparkles className="w-6 h-6 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Produce it for me</p>
                    <p className="text-xs text-gray-400 mt-0.5">We record your demo · add-on fee</p>
                  </div>
                </button>
              </div>
            )}

            {/* Uploaded preview */}
            {demoFile && demoPreviewUrl && (
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-black relative">
                <video
                  src={demoPreviewUrl}
                  controls
                  className="w-full max-h-64 object-contain"
                />
                <button
                  onClick={handleRemoveDemo}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="px-4 py-2 bg-white">
                  <p className="text-xs text-gray-500 truncate">{demoFile.name}</p>
                </div>
              </div>
            )}

            {/* Production requested */}
            {requestProduction && (
              <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-violet-900">Demo production requested</p>
                  <p className="text-xs text-violet-700 mt-1">
                    Our team will reach out to arrange a custom app demo recording. The final video will be assembled once the demo is ready.
                  </p>
                  <button
                    onClick={() => setRequestProduction(false)}
                    className="mt-2 text-xs text-violet-600 hover:underline"
                  >
                    Cancel — I&apos;ll upload my own
                  </button>
                </div>
              </div>
            )}

            {/* Skip hint */}
            {!demoFile && !requestProduction && (
              <p className="text-xs text-gray-400 text-center">
                You can also skip — the video will be generated without a demo segment.
              </p>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep('stories')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => { setStep('cta'); if (ctaSuggestions.length === 0) handleGenerateCtas() }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                Next: CTA
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: CTA ── */}
        {step === 'cta' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Call to Action</h2>
              <p className="text-sm text-gray-500">
                How should the video close? Pick a suggestion or write your own.
              </p>
            </div>

            {generatingCta ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating CTA suggestions…
              </div>
            ) : (
              <>
                {ctaSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Suggestions</p>
                    {ctaSuggestions.map((cta) => (
                      <button
                        key={cta}
                        onClick={() => { setSelectedCta(cta); setCustomCta('') }}
                        className={cn(
                          'w-full text-left px-4 py-3 rounded-xl border text-sm transition',
                          selectedCta === cta && !customCta.trim()
                            ? 'border-blue-500 bg-blue-50 font-medium text-blue-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                        )}
                      >
                        {selectedCta === cta && !customCta.trim() && (
                          <Check className="inline w-3.5 h-3.5 mr-2 text-blue-600" />
                        )}
                        {cta}
                      </button>
                    ))}
                    <button
                      onClick={handleGenerateCtas}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate suggestions
                    </button>
                  </div>
                )}

                {ctaError && <p className="text-red-500 text-sm">{ctaError}</p>}

                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">
                    Or write your own
                  </p>
                  <input
                    type="text"
                    value={customCta}
                    onChange={(e) => setCustomCta(e.target.value)}
                    placeholder="e.g. Link in bio — try it free tonight."
                    className="w-full border border-gray-300 rounded-lg bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep('demo')}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={() => setStep('generate')}
                disabled={!activeCta}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
              >
                Review &amp; Generate
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Generate ── */}
        {step === 'generate' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-1">Ready to generate</h2>
              <p className="text-sm text-gray-500">
                Review your selections, then generate the UGC video.
              </p>
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
              {selectedStory && (
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-400 font-medium mb-1">Hook story</p>
                  <p className="text-sm text-gray-900 italic">&ldquo;{selectedStory.story}&rdquo;</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Persona: {selectedStory.persona} · Reaction: {selectedStory.emotion}
                  </p>
                </div>
              )}
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 font-medium mb-1">App demo</p>
                <p className="text-sm text-gray-700">
                  {demoFile ? demoFile.name : requestProduction ? 'Production requested' : 'Skipped'}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 font-medium mb-1">CTA</p>
                <p className="text-sm text-gray-900">{activeCta}</p>
              </div>
            </div>

            {/* Video structure diagram */}
            <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
              <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded font-medium">Reaction clip</span>
              <ChevronRight className="w-3 h-3 shrink-0" />
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">Story text overlay</span>
              <ChevronRight className="w-3 h-3 shrink-0" />
              {(demoFile || requestProduction) && (
                <>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">App demo</span>
                  <ChevronRight className="w-3 h-3 shrink-0" />
                </>
              )}
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">CTA card</span>
            </div>

            {!finalVideoDataUrl ? (
              <>
                {genError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {genError}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setStep('cta')}
                    disabled={generating}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || aiQuotaBlocked}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating video… (up to 5 min)
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Generate UGC Video
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-black">
                  <video
                    src={finalVideoDataUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full max-h-[480px] object-contain"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={downloadVideo}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    Download MP4
                  </button>
                  <button
                    onClick={() => {
                      setFinalVideoDataUrl('')
                      setGenerating(false)
                      setGenError('')
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </button>
                  <button
                    onClick={() => { setStep('brief'); setFinalVideoDataUrl('') }}
                    className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition"
                  >
                    Start new video
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
