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

    const prompt = `You are a UGC (user-generated content) marketing strategist.

App: ${brandProfile.productName}
Description: ${brandProfile.productDescription}
Target Audience: ${brandProfile.targetAudience}

Generate 6 short, punchy value propositions for this app that would resonate emotionally with the target audience.
These will be used to craft viral UGC video hooks.

Rules:
- Each value prop is 2-5 words max (e.g. "fast results", "saves 3 hours a day", "no more stress")
- Focus on emotional benefits, not features
- Make them feel personal and relatable
- Avoid corporate or salesy language

Return ONLY a valid JSON array of strings with no extra text:
["value prop 1", "value prop 2", ...]`

    const raw = await generateText(prompt)
    const match = raw.match(/\[[\s\S]*?\]/)
    if (!match) return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    const valueProps = JSON.parse(match[0]) as string[]
    return NextResponse.json({ valueProps })
  } catch (err) {
    console.error('influencer/brief error', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
