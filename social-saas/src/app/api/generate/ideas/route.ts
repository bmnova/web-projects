import { NextRequest, NextResponse } from 'next/server'
import { authUsageErrorResponse } from '@/lib/api-error-response'
import { generateText } from '@/lib/ai/gemini'
import type { BrandProfile, ContentAngle, Platform } from '@/types'

const ANGLE_LABELS: Record<ContentAngle, string> = {
  pain_point: 'Pain point / problem–solution',
  feature: 'Feature highlight',
  educational: 'Educational content',
  comparison: 'Competitor comparison',
  founder: 'Founder story',
  launch: 'Launch / announcement',
}

export async function POST(req: NextRequest) {
  try {
    const { getAuthUid } = await import('@/lib/api-auth')
    await getAuthUid(req)
  } catch (err: unknown) {
    return authUsageErrorResponse(err)
  }

  // Ideas skip monthly quota (lightweight); quota applies to content / image / video routes.
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
