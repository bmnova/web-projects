import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini'
import type { BrandProfile } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { idea, brandProfile } = (await req.json()) as {
      idea: { title: string; hook: string }
      brandProfile: BrandProfile
    }

    const prompt = `You are a social media designer writing carousel content for Instagram.

Brand: ${brandProfile.productName}
Description: ${brandProfile.productDescription}
Target Audience: ${brandProfile.targetAudience}
Tone: ${brandProfile.toneOfVoice}

Content Idea:
Title: ${idea.title}
Hook: ${idea.hook}

Create an Instagram carousel post with 4-6 slides. Each slide should be punchy and scannable.

Return ONLY valid JSON:
{
  "cover": "Cover slide headline (max 8 words, bold statement or question)",
  "slides": [
    {"headline": "Slide point headline (max 6 words)", "body": "2-3 sentence explanation of this point"},
    {"headline": "...", "body": "..."}
  ],
  "cta": "Last slide call-to-action (max 12 words)"
}`

    const raw = await generateText(prompt)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    const result = JSON.parse(match[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('generate/carousel error', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
