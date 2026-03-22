import { NextRequest, NextResponse } from 'next/server'
import { authUsageErrorResponse } from '@/lib/api-error-response'
import { mkdir, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import type { Platform } from '@/types'
import { aspectRatioForPlatform } from '@/lib/ai/media-hooks'
import { generateVeoMp4Base64, DEFAULT_VIDEO_MODEL } from '@/lib/ai/media'
import { mergeMontageMp4Segments } from '@/lib/video/concat-mp4'
import { isMockVideoGenerationEnabled } from '@/lib/video/mock-sample-mp4'
import {
  MONTAGE_SCENE_MAX,
  MONTAGE_SCENE_MIN,
  parseMontageMergeTransition,
  resolveMontageMerge,
} from '@/lib/ai/montage-shared'

export const runtime = 'nodejs'
export const maxDuration = 300

const CLIP_DURATION_SECONDS = 4
/** Visible beat between montage scenes (real + mock). */
const SCENE_GAP_SECONDS = 0.35

type SceneIn = { label?: string; veoPrompt?: string }

function stripToRawBase64(s: string): string {
  const t = s.trim()
  const comma = t.indexOf(',')
  if (t.startsWith('data:') && comma >= 0) return t.slice(comma + 1)
  return t
}

export async function POST(req: NextRequest) {
  let body: {
    platform: Platform
    scenes: SceneIn[]
    /** If 0–2, only this scene is re-generated; others must be sent in segmentBase64s. */
    regenerateIndex?: number
    segmentBase64s?: string[]
    /** Clip join style: `black` (default) or xfade id e.g. `swipe_left`. */
    mergeTransition?: string
    /** Crossfade / swipe length in seconds (xfade only; clamped server-side). */
    transitionSeconds?: number
  }

  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.platform || !Array.isArray(body.scenes)) {
    return NextResponse.json({ error: 'Missing platform or scenes' }, { status: 400 })
  }

  const sceneCount = body.scenes.length
  if (sceneCount < MONTAGE_SCENE_MIN || sceneCount > MONTAGE_SCENE_MAX) {
    return NextResponse.json(
      { error: `Between ${MONTAGE_SCENE_MIN} and ${MONTAGE_SCENE_MAX} scenes are required` },
      { status: 400 }
    )
  }

  const regenIdx =
    typeof body.regenerateIndex === 'number' &&
    body.regenerateIndex >= 0 &&
    body.regenerateIndex < sceneCount
      ? body.regenerateIndex
      : undefined

  if (regenIdx !== undefined) {
    if (!Array.isArray(body.segmentBase64s) || body.segmentBase64s.length !== sceneCount) {
      return NextResponse.json(
        {
          error: `segmentBase64s (length ${sceneCount}) is required when regenerating one scene`,
        },
        { status: 400 }
      )
    }
    for (let i = 0; i < sceneCount; i++) {
      if (i === regenIdx) continue
      const raw = stripToRawBase64(typeof body.segmentBase64s[i] === 'string' ? body.segmentBase64s[i] : '')
      try {
        const buf = Buffer.from(raw, 'base64')
        if (buf.length < 256) {
          return NextResponse.json(
            { error: `Invalid existing segment data for scene ${i + 1}` },
            { status: 400 }
          )
        }
      } catch {
        return NextResponse.json(
          { error: `Invalid base64 for scene ${i + 1}` },
          { status: 400 }
        )
      }
    }
  }

  const scenes = body.scenes.map((s, i) => ({
    label:
      typeof s.label === 'string' && s.label.trim()
        ? s.label.trim()
        : `Scene ${i + 1}`,
    veoPrompt: typeof s.veoPrompt === 'string' ? s.veoPrompt.trim() : '',
  }))

  if (scenes.some((s) => s.veoPrompt.length < 20)) {
    return NextResponse.json(
      { error: 'Each scene needs a Veo prompt (at least 20 characters).' },
      { status: 400 }
    )
  }

  try {
    const { getAuthUid } = await import('@/lib/api-auth')
    const { checkAndIncrementUsage } = await import('@/lib/firebase/usage')
    const uid = await getAuthUid(req)
    if (!isMockVideoGenerationEnabled()) {
      const n = regenIdx !== undefined ? 1 : sceneCount
      for (let i = 0; i < n; i++) {
        await checkAndIncrementUsage(uid)
      }
    }
  } catch (err: unknown) {
    return authUsageErrorResponse(err)
  }

  const workDir = join(tmpdir(), `montage-${randomUUID()}`)

  try {
    await mkdir(workDir, { recursive: true })
    const segmentPaths: string[] = []
    const segmentBase64s: string[] = []
    const aspect = aspectRatioForPlatform(body.platform)
    const model = DEFAULT_VIDEO_MODEL

    /** Mock samples are often ~15–30s; large seeks (e.g. 22s × index) pass EOF → 0s clips. */
    const mockRegenJitter = regenIdx !== undefined ? Math.floor(Math.random() * 8) : 0

    for (let i = 0; i < scenes.length; i++) {
      let b64: string
      if (regenIdx !== undefined && i !== regenIdx) {
        b64 = stripToRawBase64(body.segmentBase64s![i]!)
      } else {
        const stagger = Math.min(i * 3, 9)
        const regenSkew =
          regenIdx !== undefined && i === regenIdx ? mockRegenJitter : 0
        const { base64 } = await generateVeoMp4Base64(
          scenes[i].veoPrompt,
          aspect,
          model,
          {
            durationSeconds: CLIP_DURATION_SECONDS,
            mockSampleIndex: i,
            mockStartOffsetSeconds: Math.min(stagger + regenSkew, 12),
          }
        )
        b64 = base64
      }
      segmentBase64s.push(b64)
      const segPath = join(workDir, `seg-${i}.mp4`)
      await writeFile(segPath, Buffer.from(b64, 'base64'))
      segmentPaths.push(segPath)
    }

    const transId = parseMontageMergeTransition(body.mergeTransition)
    const mergeSpec = resolveMontageMerge(transId)
    let xfadeDuration = 0.45
    if (typeof body.transitionSeconds === 'number' && Number.isFinite(body.transitionSeconds)) {
      xfadeDuration = Math.min(0.9, Math.max(0.15, body.transitionSeconds))
    }
    const fallbackGap = SCENE_GAP_SECONDS
    const merged = await mergeMontageMp4Segments(
      segmentPaths,
      mergeSpec.mergeMode === 'black'
        ? { mergeMode: 'black', blackGapSeconds: SCENE_GAP_SECONDS }
        : mergeSpec.mergeMode === 'straight'
          ? { mergeMode: 'straight', fallbackBlackGapSeconds: fallbackGap }
          : {
              mergeMode: 'xfade',
              xfadeName: mergeSpec.xfadeName,
              transitionSeconds: xfadeDuration,
              fallbackBlackGapSeconds: fallbackGap,
            }
    )
    const base64 = merged.toString('base64')

    return NextResponse.json({
      base64,
      mimeType: 'video/mp4',
      segmentBase64s,
      scenes: scenes.map((s) => ({ label: s.label })),
    })
  } catch (err) {
    console.error('generate/video/montage/render error', err)
    const message = err instanceof Error ? err.message : 'Montage render failed'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}
