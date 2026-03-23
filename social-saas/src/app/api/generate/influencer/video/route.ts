import { NextRequest, NextResponse } from 'next/server'
import { authUsageErrorResponse } from '@/lib/api-error-response'
import { generateVeoMp4Base64 } from '@/lib/ai/media'
import { mkdir, writeFile, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { isMockVideoGenerationEnabled } from '@/lib/video/mock-sample-mp4'
import type { BrandProfile } from '@/types'
import type { StoryPersona } from '../stories/route'

export const runtime = 'nodejs'
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
      brandProfile: BrandProfile
      story: StoryPersona
      demoVideoBase64?: string  // base64 MP4 of the app demo, if user uploaded
      cta: string
    }

    if (!body.brandProfile || !body.story || !body.cta) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { story, brandProfile, cta } = body

    // ── 1. Generate reaction clip via Veo ──────────────────────────────────
    // Persona-specific reaction video: the influencer reacts to the story hook.
    // Future: replace with Nano Banana Pro character generation.
    const reactionPrompt = [
      `${story.reactionDesc}.`,
      `Vertical 9:16 format, close-up on face, natural ambient light, authentic UGC style,`,
      `smartphone selfie aesthetic. No text overlays. Genuine candid reaction.`,
      `The person is ${story.persona}.`,
    ].join(' ')

    const { base64: reactionBase64, mimeType } = await generateVeoMp4Base64(
      reactionPrompt,
      '9:16',
      undefined,
      { durationSeconds: 6 }
    )

    const workDir = join(tmpdir(), `ugc-${randomUUID()}`)
    await mkdir(workDir, { recursive: true })

    const segments: string[] = []

    // Write reaction clip
    const reactionPath = join(workDir, 'reaction.mp4')
    await writeFile(reactionPath, Buffer.from(reactionBase64, 'base64'))
    segments.push(reactionPath)

    // ── 2. App demo clip ───────────────────────────────────────────────────
    if (body.demoVideoBase64) {
      const demoPath = join(workDir, 'demo.mp4')
      await writeFile(demoPath, Buffer.from(body.demoVideoBase64, 'base64'))
      segments.push(demoPath)
    }

    // ── 3. CTA card (static image rendered as short video clip) ───────────
    // Generate a 3-second black card with the CTA text using ffmpeg lavfi.
    // The text overlay is burned in via drawtext filter.
    const ctaPath = join(workDir, 'cta.mp4')
    const safeCta = cta.replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/\[/g, '\\[').replace(/\]/g, '\\]')
    const safeProduct = brandProfile.productName.replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/\[/g, '\\[').replace(/\]/g, '\\]')

    await generateCtaClip(ctaPath, safeCta, safeProduct)
    segments.push(ctaPath)

    // ── 4. Concatenate all segments ────────────────────────────────────────
    const { concatMp4NormalizedStraightConcat } = await import('@/lib/video/concat-mp4')
    const finalBuf = await concatMp4NormalizedStraightConcat(segments)

    await rm(workDir, { recursive: true, force: true })

    const finalBase64 = finalBuf.toString('base64')
    return NextResponse.json({ base64: finalBase64, mimeType: mimeType || 'video/mp4' })
  } catch (err) {
    console.error('influencer/video error', err)
    const message = err instanceof Error ? err.message : 'Video generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function generateCtaClip(outPath: string, ctaText: string, productName: string): Promise<void> {
  const { spawn } = await import('child_process')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath = (process.env.FFMPEG_BIN?.trim() || require('ffmpeg-static')) as string

  const fontsize = 52
  const subfontsize = 30
  const filterComplex = [
    `color=c=0x0a0a0a:s=720x1280:r=30[bg]`,
    `[bg]drawtext=text='${ctaText}':fontcolor=white:fontsize=${fontsize}:x=(w-text_w)/2:y=(h-text_h)/2-40:line_spacing=10:expansion=none[t1]`,
    `[t1]drawtext=text='— ${productName}':fontcolor=0xaaaaaa:fontsize=${subfontsize}:x=(w-text_w)/2:y=(h-text_h)/2+${fontsize + 20}:expansion=none[out]`,
  ].join(';')

  await new Promise<void>((resolve, reject) => {
    const p = spawn(ffmpegPath, [
      '-f', 'lavfi',
      '-i', filterComplex,
      '-t', '3',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-an',
      outPath,
    ], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    p.stderr?.on('data', (c: Buffer) => { stderr += c.toString() })
    p.on('error', reject)
    p.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`CTA clip ffmpeg exited ${code}: ${stderr.slice(-800)}`))
    })
  })
}
