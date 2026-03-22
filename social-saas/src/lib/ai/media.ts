import { GoogleGenAI } from '@google/genai'
import { readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import {
  fetchRandomSampleMp4Base64,
  isMockVideoGenerationEnabled,
} from '@/lib/video/mock-sample-mp4'

/** Cost-effective default; override with `GEMINI_IMAGE_MODEL`. */
export const DEFAULT_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL?.trim() || 'imagen-4.0-fast-generate-001'

/** Veo 2 is silent and cheaper for testing; override e.g. `veo-3.1-fast-generate-preview` via `GEMINI_VIDEO_MODEL`. */
export const DEFAULT_VIDEO_MODEL =
  process.env.GEMINI_VIDEO_MODEL?.trim() || 'veo-2.0-generate-001'

function normalizeGeminiKey(): string {
  const raw = process.env.GEMINI_API_KEY
  if (!raw?.trim()) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }
  return raw.trim().replace(/^["']|["']$/g, '')
}

function getMediaClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: normalizeGeminiKey() })
}

export async function generateImagenPngBase64(
  prompt: string,
  aspectRatio: string,
  model: string = DEFAULT_IMAGE_MODEL
): Promise<{ base64: string; mimeType: string }> {
  const ai = getMediaClient()
  const res = await ai.models.generateImages({
    model,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio,
      outputMimeType: 'image/png',
    },
  })
  const first = res.generatedImages?.[0]
  const img = first?.image
  if (!img?.imageBytes) {
    const reason = first?.raiFilteredReason
    throw new Error(reason || 'Image generation returned empty response.')
  }
  return { base64: img.imageBytes, mimeType: img.mimeType || 'image/png' }
}

function operationErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') return 'Video generation failed.'
  const rec = error as Record<string, unknown>
  if (typeof rec.message === 'string') return rec.message
  return 'Video generation failed.'
}

export type VeoClipOptions = {
  /** Per-clip length; montage uses shorter segments to save cost. Default 6. */
  durationSeconds?: number
  /** Mock mode: fixed sample URL index so montage scenes use different stock clips. */
  mockSampleIndex?: number
  /** Mock mode: different time window into each file so scenes don’t look like one take. */
  mockStartOffsetSeconds?: number
}

export async function generateVeoMp4Base64(
  prompt: string,
  aspectRatio: string,
  model: string = DEFAULT_VIDEO_MODEL,
  clipOptions?: VeoClipOptions
): Promise<{ base64: string; mimeType: string }> {
  if (isMockVideoGenerationEnabled()) {
    void prompt
    void aspectRatio
    void model
    return fetchRandomSampleMp4Base64({
      trimSeconds: clipOptions?.durationSeconds ?? 6,
      sampleIndex: clipOptions?.mockSampleIndex,
      startOffsetSeconds: clipOptions?.mockStartOffsetSeconds,
    })
  }

  const ai = getMediaClient()
  let op = await ai.models.generateVideos({
    model,
    source: { prompt },
    config: {
      numberOfVideos: 1,
      aspectRatio,
      resolution: '720p',
      durationSeconds: clipOptions?.durationSeconds ?? 6,
    },
  })

  const maxWaitMs = 8 * 60 * 1000
  const intervalMs = 8000
  const deadline = Date.now() + maxWaitMs

  while (!op.done) {
    if (Date.now() > deadline) {
      throw new Error('Video generation timed out (this can take several minutes).')
    }
    await new Promise((r) => setTimeout(r, intervalMs))
    op = await ai.operations.getVideosOperation({ operation: op })
  }

  if (op.error) {
    throw new Error(operationErrorMessage(op.error))
  }

  const video = op.response?.generatedVideos?.[0]?.video
  if (!video) {
    throw new Error('No video in API response.')
  }

  if (video.videoBytes) {
    return { base64: video.videoBytes, mimeType: video.mimeType || 'video/mp4' }
  }

  const tmp = join(tmpdir(), `veo-${randomUUID()}.mp4`)
  try {
    await ai.files.download({ file: video, downloadPath: tmp })
    const buf = await readFile(tmp)
    return { base64: buf.toString('base64'), mimeType: video.mimeType || 'video/mp4' }
  } finally {
    await unlink(tmp).catch(() => {})
  }
}
