import { NextRequest, NextResponse } from 'next/server'
import { authUsageErrorResponse } from '@/lib/api-error-response'
import type { BrandProfile, Platform } from '@/types'
import {
  aspectRatioForPlatform,
  buildImagePrompt,
  IMAGE_GEN_HOOKS,
  type ImageGenHook,
} from '@/lib/ai/media-hooks'
import { generateImagenPngBase64 } from '@/lib/ai/media'

export const runtime = 'nodejs'

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
      imageHook: ImageGenHook
      scriptExcerpt?: string
    }

    if (!body.idea || !body.brandProfile || !body.platform || !body.imageHook) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!(body.imageHook in IMAGE_GEN_HOOKS)) {
      return NextResponse.json({ error: 'Invalid imageHook' }, { status: 400 })
    }

    const prompt = buildImagePrompt({
      brandName: body.brandProfile.productName,
      brandDescription: body.brandProfile.productDescription,
      audience: body.brandProfile.targetAudience,
      ideaTitle: body.idea.title,
      ideaHook: body.idea.hook,
      hookKey: body.imageHook,
      scriptExcerpt: body.scriptExcerpt,
    })

    const aspect = aspectRatioForPlatform(body.platform)
    const { base64, mimeType } = await generateImagenPngBase64(prompt, aspect)

    return NextResponse.json({ base64, mimeType })
  } catch (err) {
    console.error('generate/image error', err)
    const message = err instanceof Error ? err.message : 'Image generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
