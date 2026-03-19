import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini'
import type { BrandProfile } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { idea, brandProfile } = (await req.json()) as {
      idea: { title: string; hook: string }
      brandProfile: BrandProfile
    }

    const prompt = `You are a Twitter/X copywriter for startups.

Brand: ${brandProfile.productName}
Description: ${brandProfile.productDescription}
Target Audience: ${brandProfile.targetAudience}
Tone: ${brandProfile.toneOfVoice}
CTA Style: ${brandProfile.ctaStyle || 'subtle, non-pushy'}

Content Idea:
Title: ${idea.title}
Hook: ${idea.hook}

Write a Twitter thread of 5-7 tweets. Rules:
- Tweet 1: Strong hook that makes people want to read the thread (end with ↓ or 🧵)
- Tweets 2-5: Each covers one key point clearly and concisely
- Last tweet: Summary + CTA (follow, reply, or link)
- Each tweet MUST be ≤ 260 characters
- No hashtags
- Number each tweet like "1/" "2/" etc.

Return ONLY valid JSON:
{"tweets": ["1/ hook tweet...", "2/ point...", "3/ point...", "4/ point...", "5/ cta tweet..."]}`

    const raw = await generateText(prompt)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    const result = JSON.parse(match[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('generate/thread error', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
