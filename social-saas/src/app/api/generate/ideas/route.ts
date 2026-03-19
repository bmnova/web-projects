import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini'
import type { BrandProfile, ContentAngle, Platform } from '@/types'

const ANGLE_LABELS: Record<ContentAngle, string> = {
  pain_point: 'Pain Point / Sorun çözümü',
  feature: 'Özellik tanıtımı',
  educational: 'Eğitici içerik',
  comparison: 'Rakip karşılaştırma',
  founder: 'Kurucu hikayesi',
  launch: 'Lansman / Duyuru',
}

export async function POST(req: NextRequest) {
  try {
    const { getAuthUid } = await import('@/lib/api-auth')
    const { checkAndIncrementUsage } = await import('@/lib/firebase/usage')
    const uid = await getAuthUid(req)
    await checkAndIncrementUsage(uid)
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number }
    return NextResponse.json({ error: e.message ?? 'Unauthorized' }, { status: e.status ?? 401 })
  }

  try {
    const { brandProfile, angle, platforms } = (await req.json()) as {
      brandProfile: BrandProfile
      angle: ContentAngle
      platforms: Platform[]
    }

    const prompt = `You are a social media content strategist for startups.

Brand: ${brandProfile.productName}
Description: ${brandProfile.productDescription}
Target Audience: ${brandProfile.targetAudience}
Tone: ${brandProfile.toneOfVoice}
Platforms: ${platforms.join(', ')}
Content Angle: ${ANGLE_LABELS[angle]}

Generate 5 distinct content ideas. Each idea must be unique and tailored for the given angle.

Return ONLY a valid JSON array with no extra text:
[
  {"title": "short catchy title (max 10 words)", "hook": "compelling first sentence or hook"},
  ...
]`

    const raw = await generateText(prompt)
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    const ideas = JSON.parse(match[0])
    return NextResponse.json({ ideas })
  } catch (err) {
    console.error('generate/ideas error', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
