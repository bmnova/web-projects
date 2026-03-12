'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth-context'
import { createWorkspace, saveBrandProfile } from '@/lib/firebase/workspace'
import { Zap } from 'lucide-react'

const STEPS = ['Workspace', 'Ürün Bilgisi', 'Ton & Kitle']

export default function OnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 0
  const [workspaceName, setWorkspaceName] = useState('')

  // Step 1
  const [productName, setProductName] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [website, setWebsite] = useState('')

  // Step 2
  const [targetAudience, setTargetAudience] = useState('')
  const [tone, setTone] = useState<'professional' | 'casual' | 'humorous' | 'educational'>('casual')
  const [ctaStyle, setCtaStyle] = useState('')

  async function handleFinish() {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const workspaceId = await createWorkspace(user.uid, workspaceName || productName)
      await saveBrandProfile(workspaceId, {
        productName,
        productDescription: productDesc,
        website,
        targetAudience,
        toneOfVoice: tone,
        ctaStyle,
        competitors: [],
        examplePosts: [],
        forbiddenTerms: [],
      })
      router.push('/dashboard')
    } catch {
      setError('Bir hata oluştu, tekrar dene.')
      setLoading(false)
    }
  }

  function nextStep() {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else handleFinish()
  }

  const canProceed = [
    workspaceName.trim().length >= 2,
    productName.trim().length >= 2 && productDesc.trim().length >= 20,
    targetAudience.trim().length >= 10,
  ][step]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-gray-900">SocialSaaS</span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition
              ${i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200 hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">

        {step === 0 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Workspace oluştur</h2>
            <p className="text-sm text-gray-500 mb-6">Şirketin veya projenin adını gir.</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Workspace Adı</label>
            <input
              autoFocus
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Örn: Acme Corp"
            />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Ürün bilgisi</h2>
            <p className="text-sm text-gray-500 mb-6">AI içerikleri buna göre üretecek.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün / Startup Adı</label>
                <input
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: Acme SaaS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ne yapıyor? (en az 20 karakter)</label>
                <textarea
                  rows={3}
                  value={productDesc}
                  onChange={e => setProductDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Startupların sosyal medya içeriklerini otomatik oluşturup yayınlamasına yardımcı olan bir SaaS ürünü."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website (opsiyonel)</label>
                <input
                  type="url"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://acme.com"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Ton & Hedef Kitle</h2>
            <p className="text-sm text-gray-500 mb-6">AI bu bilgilere göre içerik tonunu ayarlar.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Kitle (en az 10 karakter)</label>
                <textarea
                  rows={2}
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Erken aşama startup kurucuları, B2B SaaS girişimcileri"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İçerik Tonu</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['professional', 'casual', 'humorous', 'educational'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`py-2 px-3 rounded-lg text-sm border transition capitalize
                        ${tone === t ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                      {t === 'professional' ? 'Profesyonel' :
                       t === 'casual' ? 'Samimi' :
                       t === 'humorous' ? 'Eğlenceli' : 'Eğitici'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CTA Stili (opsiyonel)</label>
                <input
                  value={ctaStyle}
                  onChange={e => setCtaStyle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Örn: Ücretsiz dene, Demo iste"
                />
              </div>
            </div>
          </>
        )}

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Geri
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={!canProceed || loading}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor…' : step === STEPS.length - 1 ? 'Başla →' : 'Devam →'}
          </button>
        </div>
      </div>
    </div>
  )
}
