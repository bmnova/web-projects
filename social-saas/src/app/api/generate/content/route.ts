import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/gemini'
import type { BrandProfile, Platform } from '@/types'

const PLATFORM_GUIDE: Record<Platform, string> = {
  reddit: 'Reddit comment/post: no hashtags, conversational tone, lead with value, CTA at the end naturally.',
  instagram: 'Instagram caption: engaging storytelling, 5 relevant hashtags at end, 1-2 emojis max.',
  tiktok: 'TikTok script: punchy 3-second hook, fast-paced, end with question or CTA, 3 hashtags.',
  youtube: 'YouTube: write a video title (max 60 chars) + full description with timestamps placeholder and SEO keywords.',
  twitter: 'Twitter/X post: max 260 chars, punchy insight or hot take, no hashtags unless essential, optional question at end to drive replies.',
  youtube_shorts: 'YouTube Shorts video script: bold 3-second hook (surprising fact or direct challenge), 40-60 second paced spoken narration with 3-4 punchy points, clear sign-off CTA. Write as natural spoken lines, no hashtags.',
}

export async function POST(req: NextRequest) {
  try {
    const { idea, brandProfile, platform } = (await req.json()) as {
      idea: { title: string; hook: string }
      brandProfile: BrandProfile
      platform: Platform
    }

    const prompt = `You are a social media copywriter for startups.

Brand: ${brandProfile.productName}
Description: ${brandProfile.productDescription}
Target Audience: ${brandProfile.targetAudience}
Tone: ${brandProfile.toneOfVoice}
CTA Style: ${brandProfile.ctaStyle || 'subtle, non-pushy'}

Content Idea:
Title: ${idea.title}
Hook: ${idea.hook}

Platform: ${platform.toUpperCase()}
Guide: ${PLATFORM_GUIDE[platform]}

Write the full ready-to-publish content for this platform. Keep it authentic and aligned with the brand tone.

Return ONLY valid JSON:
{"content": "full post content here", "notes": "1-2 tips for this specific post"}`

    const raw = await generateText(prompt)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    const result = JSON.parse(match[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('generate/content error', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
