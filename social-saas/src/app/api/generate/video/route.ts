import { NextRequest, NextResponse } from 'next/server'
import { authUsageErrorResponse } from '@/lib/api-error-response'
import type { BrandProfile, Platform } from '@/types'
import {
  aspectRatioForPlatform,
  buildVideoPrompt,
  VIDEO_GEN_HOOKS,
  type VideoGenHook,
} from '@/lib/ai/media-hooks'
import { generateVeoMp4Base64 } from '@/lib/ai/media'
import { isMockVideoGenerationEnabled } from '@/lib/video/mock-sample-mp4'

export const runtime = 'nodejs'
/** Veo can run a long time; requires Vercel Pro (or similar) for extended timeouts. */
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { getAuthUid } = await import('@/lib/api-auth')
    const { checkAndIncrementUsage } = await import('@/lib/firebase/usage')
    const uid = await getAuthUid(req)
    if (!isMockVideoGenerationEnabled()) {
      await checkAndIncrementUsage(uid)
    }
  } catch (err: unknown) {
    return authUsageErrorResponse(err)
  }

  try {
    const body = (await req.json()) as {
      idea: { title: string; hook: string }
      brandProfile: BrandProfile
      platform: Platform
      videoHook: VideoGenHook
      scriptExcerpt?: string
      /** If non-empty, sent to Veo as-is (user-edited). Otherwise built from hook + brand + script. */
      veoPrompt?: string
    }

    if (!body.idea || !body.brandProfile || !body.platform || !body.videoHook) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!(body.videoHook in VIDEO_GEN_HOOKS)) {
      return NextResponse.json({ error: 'Invalid videoHook' }, { status: 400 })
    }

    const custom =
      typeof body.veoPrompt === 'string' ? body.veoPrompt.trim() : ''
    const prompt =
      custom.length > 0
        ? custom
        : buildVideoPrompt({
            brandName: body.brandProfile.productName,
            brandDescription: body.brandProfile.productDescription,
            ideaTitle: body.idea.title,
            ideaHook: body.idea.hook,
            hookKey: body.videoHook,
            scriptExcerpt: body.scriptExcerpt,
          })

    if (prompt.length < 20) {
      return NextResponse.json(
        { error: 'Video prompt is too short. Edit the prompt or rebuild from script.' },
        { status: 400 }
      )
    }

    const aspect = aspectRatioForPlatform(body.platform)
    const { base64, mimeType } = await generateVeoMp4Base64(prompt, aspect)

    return NextResponse.json({ base64, mimeType })
  } catch (err) {
    console.error('generate/video error', err)
    const message = err instanceof Error ? err.message : 'Video generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
