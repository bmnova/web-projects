import Link from 'next/link'
import { Zap, Sparkles, CheckCircle, FileText, List, LayoutGrid, Video, ArrowRight } from 'lucide-react'

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Format-first studio',
    desc: 'Post, Thread, Carousel, and Script — AI output tuned for each format.',
  },
  {
    icon: Zap,
    title: 'Platform-native copy',
    desc: 'Reddit, X, Instagram, TikTok, YouTube Shorts — tone and limits per platform.',
  },
  {
    icon: CheckCircle,
    title: 'Review & publish',
    desc: 'Review with your team, approve, then publish directly or on a schedule.',
  },
]

const FORMAT_EXAMPLES = [
  { icon: FileText, label: 'Post',     desc: 'Reddit, X, Instagram, YouTube' },
  { icon: List,     label: 'Thread',   desc: 'Twitter / X threads' },
  { icon: LayoutGrid, label: 'Carousel', desc: 'Instagram carousels' },
  { icon: Video,    label: 'Script',   desc: 'TikTok & YouTube Shorts' },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    desc: 'To get started',
    limit: '15 generations / month',
    features: ['1 workspace', 'All formats', 'Core platforms'],
    cta: 'Start free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$19',
    period: '/mo',
    desc: 'For solo founders',
    limit: '150 generations / month',
    features: ['1 workspace', 'All formats & platforms', 'Approvals', 'Scheduler'],
    cta: 'Choose Starter',
    href: '/signup?plan=starter',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/mo',
    desc: 'For growing teams',
    limit: 'Unlimited generations',
    features: ['3 workspaces', 'Team seats', 'Approvals + scheduler', 'Analytics', 'Priority support'],
    cta: 'Choose Pro',
    href: '/signup?plan=pro',
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900">SocialSaaS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition">
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI content in minutes
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Generate on-brand social content{' '}
          <span className="text-blue-600">for your startup</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Threads, carousels, video scripts, Reddit posts — optimized per platform and aligned with your voice.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/signup"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition text-sm"
          >
            Start free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-gray-900 font-medium transition"
          >
            Already have an account? Log in
          </Link>
        </div>

        {/* Format badges */}
        <div className="flex items-center justify-center gap-3 mt-10 flex-wrap">
          {FORMAT_EXAMPLES.map(f => {
            const Icon = f.icon
            return (
              <div key={f.label} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <Icon className="w-4 h-4 text-gray-500" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-800">{f.label}</p>
                  <p className="text-xs text-gray-400">{f.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Why SocialSaaS?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Set up your brand', desc: 'Add product name, audience, and tone in about two minutes.' },
            { step: '2', title: 'Pick format & angle', desc: 'Choose Post, Thread, Carousel, or Script and the story you want to tell.' },
            { step: '3', title: 'Generate & ship', desc: 'AI drafts copy. Edit, approve, and publish when you are ready.' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 bg-gray-50" id="pricing">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Pricing</h2>
          <p className="text-gray-500 text-sm text-center mb-10">No credit card required. Cancel anytime.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-blue-500 shadow-lg shadow-blue-100 relative'
                    : 'border-gray-200'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-500 mb-1">{plan.name}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-400 text-sm">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{plan.desc}</p>
                </div>

                <div className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-lg text-center mb-4">
                  {plan.limit}
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`block w-full text-center text-sm font-semibold py-2.5 rounded-xl transition ${
                    plan.highlight
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">SocialSaaS</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 SocialSaaS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
