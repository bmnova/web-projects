import { NextRequest, NextResponse } from 'next/server'
import { authUsageErrorResponse } from '@/lib/api-error-response'
import { generateText } from '@/lib/ai/gemini'
import type { BrandProfile } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { getAuthUid } = await import('@/lib/api-auth')
    await getAuthUid(req)
  } catch (err: unknown) {
    return authUsageErrorResponse(err)
  }

  try {
    const { brandProfile } = (await req.json()) as { brandProfile: BrandProfile }

    if (!brandProfile?.productName) {
      return NextResponse.json({ error: 'Missing brandProfile' }, { status: 400 })
    }

    const prompt = `You are a conversion copywriter for short-form video.

App: ${brandProfile.productName}
Description: ${brandProfile.productDescription}
Target Audience: ${brandProfile.targetAudience}
CTA Style: ${brandProfile.ctaStyle || 'direct and compelling'}

Generate 3 short, high-converting CTAs for the end of a UGC video about this app.
Each CTA should:
- Be 5-10 words max
- Create urgency or curiosity
- Be specific (avoid generic "Download now")
- Feel natural coming from an influencer

Examples of good CTAs: "Link in bio — thank me later.", "First week is free, try it tonight.", "I'll leave the link, you won't regret it."

Return ONLY a valid JSON array of strings:
["cta 1", "cta 2", "cta 3"]`

    const raw = await generateText(prompt)
    const match = raw.match(/\[[\s\S]*?\]/)
    if (!match) return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    const ctas = JSON.parse(match[0]) as string[]
    return NextResponse.json({ ctas })
  } catch (err) {
    console.error('influencer/cta error', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
