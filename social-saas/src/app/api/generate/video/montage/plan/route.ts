import { NextRequest, NextResponse } from 'next/server'
import { authUsageErrorResponse } from '@/lib/api-error-response'
import type { BrandProfile, Platform } from '@/types'
import { VIDEO_GEN_HOOKS, type VideoGenHook } from '@/lib/ai/media-hooks'
import { planMontageScenes } from '@/lib/ai/video-montage'
import { clampMontageSceneCount } from '@/lib/ai/montage-shared'

export const runtime = 'nodejs'
export const maxDuration = 120

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
    const body = (await req.json()) as {
      idea: { title: string; hook: string }
      brandProfile: BrandProfile
      platform: Platform
      videoHook: VideoGenHook
      scriptExcerpt?: string
      sceneCount?: number
    }

    if (!body.idea || !body.brandProfile || !body.platform || !body.videoHook) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!(body.videoHook in VIDEO_GEN_HOOKS)) {
      return NextResponse.json({ error: 'Invalid videoHook' }, { status: 400 })
    }

    const script =
      typeof body.scriptExcerpt === 'string' ? body.scriptExcerpt : ''

    const sceneCount = clampMontageSceneCount(
      typeof body.sceneCount === 'number' ? body.sceneCount : 3
    )

    const plan = await planMontageScenes({
      videoHook: body.videoHook,
      brandName: body.brandProfile.productName,
      brandDescription: body.brandProfile.productDescription,
      audience: body.brandProfile.targetAudience,
      ideaTitle: body.idea.title,
      ideaHook: body.idea.hook,
      scriptExcerpt: script,
      sceneCount,
    })

    return NextResponse.json({
      scenes: plan.scenes,
      mergeTransition: plan.mergeTransition,
      audioDirection: plan.audioDirection,
      pacingNote: plan.pacingNote,
    })
  } catch (err) {
    console.error('generate/video/montage/plan error', err)
    const message = err instanceof Error ? err.message : 'Scene planning failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
