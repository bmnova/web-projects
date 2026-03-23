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
    // PNG frame generated via sharp+SVG (no drawtext/libfreetype required).
    const ctaPath = join(workDir, 'cta.mp4')
    await generateCtaClip(ctaPath, cta, brandProfile.productName)
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

/** Wrap plain text into lines that fit within `maxChars` characters. */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

async function generateCtaClip(outPath: string, ctaText: string, productName: string): Promise<void> {
  const { spawn } = await import('child_process')
  const { writeFile: wf } = await import('fs/promises')
  const { join: pjoin } = await import('path')
  const { dirname } = await import('path')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegPath = (process.env.FFMPEG_BIN?.trim() || require('ffmpeg-static')) as string

  // ── 1. Render CTA frame as PNG via sharp + SVG ──────────────────────────
  // This avoids the drawtext filter (requires libfreetype) entirely.
  const W = 720, H = 1280
  const lines = wrapText(ctaText, 22)
  const lineHeight = 62
  const totalTextH = lines.length * lineHeight
  const startY = (H - totalTextH) / 2 - 40

  const textRows = lines
    .map((line, i) => {
      const y = startY + i * lineHeight + lineHeight * 0.75
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<text x="50%" y="${y}" font-family="sans-serif" font-size="52" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="auto">${escaped}</text>`
    })
    .join('\n')

  const subY = startY + totalTextH + 40 + 30 * 0.75
  const safeProd = productName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0a0a0a"/>
  ${textRows}
  <text x="50%" y="${subY}" font-family="sans-serif" font-size="30" fill="#aaaaaa" text-anchor="middle" dominant-baseline="auto">— ${safeProd}</text>
</svg>`

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharp = require('sharp') as typeof import('sharp')
  const pngBuf = await sharp(Buffer.from(svg)).png().toBuffer()

  const pngPath = pjoin(dirname(outPath), 'cta_frame.png')
  await wf(pngPath, pngBuf)

  // ── 2. Loop the PNG into a 3-second H.264 clip ─────────────────────────
  // Only requires libx264 — no drawtext / libfreetype needed.
  await new Promise<void>((resolve, reject) => {
    const p = spawn(ffmpegPath, [
      '-loop', '1',
      '-i', pngPath,
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
