/**
 * Dev/test: skip Veo and pull random MP4 samples over HTTP, then concat as usual.
 *
 * Enabled when:
 * - MOCK_VIDEO_GENERATION=true|1|yes (e.g. `.env.development` for `next dev`)
 * - Or Vercel Preview (VERCEL_ENV=preview) unless MOCK_VIDEO_GENERATION=false
 *
 * Disable explicitly: MOCK_VIDEO_GENERATION=false
 */

const DEFAULT_SAMPLE_MP4_URLS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  /* Visually distinct from the ad-style samples above */
  'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4',
] as const

export function isMockVideoGenerationEnabled(): boolean {
  const v = process.env.MOCK_VIDEO_GENERATION?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no') return false
  if (v === '1' || v === 'true' || v === 'yes') return true
  return process.env.VERCEL_ENV === 'preview'
}

function sampleUrls(): string[] {
  const custom = process.env.MOCK_VIDEO_SAMPLE_URLS?.trim()
  if (custom) {
    const list = custom.split(',').map((s) => s.trim()).filter(Boolean)
    if (list.length > 0) return list
  }
  return [...DEFAULT_SAMPLE_MP4_URLS]
}

export type FetchRandomSampleOptions = {
  /** Trim each mock clip to this many seconds (full stock files are often very long). */
  trimSeconds?: number
  /** Use a deterministic URL from the pool (scene 0, 1, 2 for montage). Omit for random. */
  sampleIndex?: number
  /** Skip this many seconds into the source before trimming (different slice per scene). */
  startOffsetSeconds?: number
}

/**
 * Downloads one MP4 from the pool (no Veo, no Gemini video).
 */
export async function fetchRandomSampleMp4Base64(
  options?: FetchRandomSampleOptions
): Promise<{
  base64: string
  mimeType: string
}> {
  const urls = sampleUrls()
  const pick =
    options?.sampleIndex !== undefined
      ? Math.abs(options.sampleIndex) % urls.length
      : Math.floor(Math.random() * urls.length)
  const url = urls[pick]!

  const res = await fetch(url, {
    signal: AbortSignal.timeout(120_000),
    headers: { Accept: 'video/mp4,video/*,*/*' },
  })
  if (!res.ok) {
    throw new Error(`Mock video fetch failed (${res.status}): ${url}`)
  }

  let buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 512) {
    throw new Error('Mock video response was too small; check MOCK_VIDEO_SAMPLE_URLS')
  }

  const trim = options?.trimSeconds
  if (trim != null && trim > 0) {
    const { trimMp4BufferSeconds } = await import('@/lib/video/concat-mp4')
    const start = Math.max(0, options?.startOffsetSeconds ?? 0)
    let trimmed = await trimMp4BufferSeconds(buf, trim, start)
    // Seek past EOF (short stock clips) yields tiny/empty output — fall back to t=0.
    if (trimmed.length < 512 && start > 0) {
      trimmed = await trimMp4BufferSeconds(buf, trim, 0)
    }
    buf = Buffer.from(trimmed)
  }

  if (
    process.env.NODE_ENV === 'development' ||
    process.env.VERCEL_ENV === 'preview'
  ) {
    console.info('[MOCK_VIDEO_GENERATION] sample clip:', url)
  }

  return { base64: buf.toString('base64'), mimeType: 'video/mp4' }
}
