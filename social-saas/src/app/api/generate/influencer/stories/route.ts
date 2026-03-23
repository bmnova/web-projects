import { NextRequest, NextResponse } from 'next/server'
import { authUsageErrorResponse } from '@/lib/api-error-response'
import { generateText } from '@/lib/ai/gemini'
import type { BrandProfile } from '@/types'

export interface StoryPersona {
  story: string    // e.g. "My partner would break up with me if they knew I did this."
  persona: string  // e.g. "Spanish, 23yo, female"
  emotion: string  // e.g. "laughing", "shocked", "excited" — used for Veo reaction prompt
  reactionDesc: string  // e.g. "laughing girl covering mouth with hand in disbelief"
}

export async function POST(req: NextRequest) {
  try {
    const { getAuthUid } = await import('@/lib/api-auth')
    const { checkAndIncrementUsage } = await import('@/lib/firebase/usage')
    const uid = await getAuthUid(req)
    await checkAndIncrementUsage(uid)
  } catch (err: unknown) {
    return authUsageErrorResponse(err)
  }

  try {
    const { brandProfile, selectedProps } = (await req.json()) as {
      brandProfile: BrandProfile
      selectedProps: string[]
    }

    if (!brandProfile?.productName || !selectedProps?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const prompt = `You are a viral UGC content creator specializing in short-form video hooks for TikTok and Instagram Reels.

App: ${brandProfile.productName}
Description: ${brandProfile.productDescription}
Target Audience: ${brandProfile.targetAudience}
Selected value propositions: ${selectedProps.join(', ')}

Create 3 viral UGC video concepts. Each concept has:
1. A story hook (first-person, emotionally provocative, max 15 words) — the kind that makes people stop scrolling.
   Style examples: "My partner would break up with me if they knew I did this.", "I can't believe I wasted 2 years before finding this.", "My boss still doesn't know I use this every day."
2. A persona (specific: nationality, age, gender — e.g. "Spanish, 23yo, female")
3. The primary emotion the persona shows (one word: laughing, shocked, excited, guilty, proud, amazed)
4. A cinematic reaction description for Veo video generation (3-4 sentences). Must include:
   - Camera: always start with "Handheld selfie shot, slight natural camera shake" or similar
   - Subject: visual description matching the persona (age range, style hint, one clothing detail)
   - Action arc: describe how the emotion builds over time — starts neutral/calm, then the reaction grows, then holds
   - Setting: a real UGC location (e.g. cozy bedroom, bathroom mirror, kitchen, office desk, living room couch)
   - Lighting: natural window light, soft ring light visible, or warm morning light
   - End with: "Authentic and unposed, not staged."
   Example: "Handheld selfie shot, slight natural camera shake. A mid-20s Latina woman in a casual oversized hoodie films herself with her phone in a cozy bedroom. She is initially scrolling with a neutral expression — then her eyebrows slowly raise, her eyes go wide, and she raises her hand to cover her mouth as if in disbelief, holding that expression. Soft natural window light from the side. Authentic and unposed, not staged."

The stories must feel authentic, relatable, and tied to the app's value.

Return ONLY a valid JSON array with no extra text:
[
  {
    "story": "...",
    "persona": "...",
    "emotion": "...",
    "reactionDesc": "..."
  },
  ...
]`

    const raw = await generateText(prompt)
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    const stories = JSON.parse(match[0]) as StoryPersona[]
    return NextResponse.json({ stories })
  } catch (err) {
    console.error('influencer/stories error', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
