import { NextRequest, NextResponse } from 'next/server'
import { authUsageErrorResponse } from '@/lib/api-error-response'
import type { BrandProfile, Platform } from '@/types'
import {
  buildVideoPrompt,
  VIDEO_GEN_HOOKS,
  type VideoGenHook,
} from '@/lib/ai/media-hooks'

/**
 * Returns the default Veo text prompt (no video generation, no usage charge).
 */
export async function POST(req: NextRequest) {
  try {
    const { getAuthUid } = await import('@/lib/api-auth')
    await getAuthUid(req)
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
    }

    if (!body.idea || !body.brandProfile || !body.platform || !body.videoHook) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!(body.videoHook in VIDEO_GEN_HOOKS)) {
      return NextResponse.json({ error: 'Invalid videoHook' }, { status: 400 })
    }

    const prompt = buildVideoPrompt({
      brandName: body.brandProfile.productName,
      brandDescription: body.brandProfile.productDescription,
      ideaTitle: body.idea.title,
      ideaHook: body.idea.hook,
      hookKey: body.videoHook,
      scriptExcerpt: body.scriptExcerpt,
    })

    return NextResponse.json({ prompt })
  } catch (err) {
    console.error('generate/video/prompt error', err)
    return NextResponse.json({ error: 'Failed to build prompt' }, { status: 500 })
  }
}
