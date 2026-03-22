import { spawn } from 'child_process'
import { mkdir, writeFile, readFile, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

function getFfmpegPath(): string {
  const env = process.env.FFMPEG_BIN?.trim()
  if (env) return env
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegStatic = require('ffmpeg-static') as string | null
  if (!ffmpegStatic) {
    throw new Error(
      'ffmpeg not found. Install ffmpeg-static or set FFMPEG_BIN to your ffmpeg executable.'
    )
  }
  return ffmpegStatic
}

function runFfmpeg(args: string[]): Promise<void> {
  const ff = getFfmpegPath()
  return new Promise((resolve, reject) => {
    const p = spawn(ff, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    p.stderr?.on('data', (c: Buffer) => {
      stderr += c.toString()
    })
    p.on('error', reject)
    p.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-1200)}`))
    })
  })
}

/**
 * Concatenate MP4 segments (same codec) with stream copy. Falls back to H.264/AAC re-encode if copy fails.
 */
export async function concatMp4FilesToBuffer(inputAbsPaths: string[]): Promise<Buffer> {
  if (inputAbsPaths.length === 0) {
    throw new Error('No video segments to concatenate')
  }

  const dir = join(tmpdir(), `concat-${randomUUID()}`)
  await mkdir(dir, { recursive: true })
  const listPath = join(dir, 'list.txt')
  const outPath = join(dir, 'merged.mp4')

  const lines = inputAbsPaths
    .map((p) => {
      const normalized = p.replace(/\\/g, '/')
      const escaped = normalized.replace(/'/g, "'\\''")
      return `file '${escaped}'`
    })
    .join('\n')
  await writeFile(listPath, lines, 'utf8')

  try {
    await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath])
  } catch {
    await runFfmpeg([
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listPath,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outPath,
    ])
  }

  const buf = await readFile(outPath)
  await rm(dir, { recursive: true, force: true })
  return buf
}

/**
 * Shorten an MP4 in memory (mock samples are often full-length files).
 * @param startSeconds seek into source before taking maxSeconds (mock montage = different slices).
 */
export async function trimMp4BufferSeconds(
  input: Buffer,
  maxSeconds: number,
  startSeconds: number = 0
): Promise<Buffer> {
  if (maxSeconds <= 0) return input

  const dir = join(tmpdir(), `trim-${randomUUID()}`)
  await mkdir(dir, { recursive: true })
  const inPath = join(dir, 'in.mp4')
  const outPath = join(dir, 'out.mp4')
  await writeFile(inPath, input)

  const ss = Math.max(0, startSeconds)
  const baseBefore = ['-ss', String(ss), '-i', inPath, '-t', String(maxSeconds)] as const

  try {
    await runFfmpeg([...baseBefore, '-c', 'copy', outPath])
  } catch {
    await runFfmpeg([
      ...baseBefore,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outPath,
    ])
  }

  const buf = await readFile(outPath)
  await rm(dir, { recursive: true, force: true })
  return buf
}

async function probeVideoSizeFromFile(videoPath: string): Promise<{ w: number; h: number }> {
  const ff = getFfmpegPath()
  return new Promise((resolve, reject) => {
    const p = spawn(ff, ['-i', videoPath, '-hide_banner'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let err = ''
    p.stderr?.on('data', (c: Buffer) => {
      err += c.toString()
    })
    p.on('error', reject)
    p.on('close', () => {
      // ffmpeg stderr format varies (codec parentheticals, pixel format, SAR). Scan any "Video:" line for NxN.
      for (const line of err.split('\n')) {
        if (!line.includes('Video:')) continue
        const sizes = [...line.matchAll(/(\d{2,})x(\d{2,})/g)]
        if (sizes.length > 0) {
          const last = sizes[sizes.length - 1]!
          resolve({ w: parseInt(last[1], 10), h: parseInt(last[2], 10) })
          return
        }
      }
      reject(new Error('Could not read video dimensions for concat gaps'))
    })
  })
}

async function writeBlackSegmentMp4(
  outPath: string,
  w: number,
  h: number,
  durationSec: number
): Promise<void> {
  await runFfmpeg([
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${w}x${h}:r=30`,
    '-t',
    String(durationSec),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'ultrafast',
    '-movflags',
    '+faststart',
    outPath,
  ])
}

/**
 * Concatenate segments with short black frames between them so cuts read as separate scenes.
 */
export async function concatMp4FilesWithBlackBetween(
  segmentAbsPaths: string[],
  gapSeconds: number
): Promise<Buffer> {
  if (segmentAbsPaths.length === 0) {
    throw new Error('No video segments to concatenate')
  }
  if (segmentAbsPaths.length === 1) {
    return readFile(segmentAbsPaths[0]!)
  }

  const { w, h } = await probeVideoSizeFromFile(segmentAbsPaths[0]!)
  const dir = join(tmpdir(), `concat-gap-${randomUUID()}`)
  await mkdir(dir, { recursive: true })
  const listPath = join(dir, 'list.txt')
  const outPath = join(dir, 'merged.mp4')

  const interleaved: string[] = []
  for (let i = 0; i < segmentAbsPaths.length; i++) {
    interleaved.push(segmentAbsPaths[i]!)
    if (i < segmentAbsPaths.length - 1) {
      const gapPath = join(dir, `gap-${i}.mp4`)
      await writeBlackSegmentMp4(gapPath, w, h, gapSeconds)
      interleaved.push(gapPath)
    }
  }

  const lines = interleaved
    .map((p) => {
      const normalized = p.replace(/\\/g, '/')
      const escaped = normalized.replace(/'/g, "'\\''")
      return `file '${escaped}'`
    })
    .join('\n')
  await writeFile(listPath, lines, 'utf8')

  // Always re-encode: stream copy across Veo segments + black gaps often glitches mid-playback
  // (timebase / keyframe mismatch) even when codecs match.
  await runFfmpeg([
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listPath,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-an',
    '-movflags',
    '+faststart',
    outPath,
  ])

  const buf = await readFile(outPath)
  await rm(dir, { recursive: true, force: true })
  return buf
}

async function probeVideoDurationSeconds(videoPath: string): Promise<number> {
  const ff = getFfmpegPath()
  return new Promise((resolve, reject) => {
    const p = spawn(ff, ['-i', videoPath, '-hide_banner'], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let err = ''
    p.stderr?.on('data', (c: Buffer) => {
      err += c.toString()
    })
    p.on('error', reject)
    p.on('close', () => {
      const m = err.match(/Duration:\s*(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)/)
      if (m) {
        const hh = parseInt(m[1], 10)
        const mm = parseInt(m[2], 10)
        const ss = parseFloat(m[3])
        resolve(hh * 3600 + mm * 60 + ss)
        return
      }
      reject(new Error('Could not read video duration for transitions'))
    })
  })
}

/**
 * xfade requires identical WxH and a stable frame rate; Veo/mock clips can differ slightly.
 * Normalize each input, then chain xfade on [x0],[x1],...
 */
function buildNormalizedXfadeFilterGraph(
  segmentCount: number,
  durations: number[],
  xfadeName: string,
  transitionSec: number,
  targetW: number,
  targetH: number
): string {
  if (segmentCount < 2 || durations.length !== segmentCount) {
    throw new Error('xfade requires duration per segment')
  }
  const minD = Math.min(...durations)
  const T = Math.min(Math.max(transitionSec, 0.12), minD * 0.4, 0.85)

  const safeName = xfadeName.replace(/[^a-z0-9_]/gi, '')
  if (safeName.length === 0) {
    throw new Error('Invalid xfade transition name')
  }

  const W = Math.max(2, targetW - (targetW % 2))
  const H = Math.max(2, targetH - (targetH % 2))
  const norm = normalizeVideoFilterChain(W, H)

  const prep: string[] = []
  for (let i = 0; i < segmentCount; i++) {
    prep.push(`[${i}:v]${norm}[x${i}]`)
  }

  let lastLabel = 'x0'
  let accDur = durations[0]!
  const fades: string[] = []

  for (let i = 1; i < segmentCount; i++) {
    const outLabel = i === segmentCount - 1 ? 'vout' : `vx${i}`
    const offset = Math.max(0, accDur - T)
    fades.push(
      `[${lastLabel}][x${i}]xfade=transition=${safeName}:duration=${T.toFixed(4)}:offset=${offset.toFixed(4)}[${outLabel}]`
    )
    accDur = accDur + durations[i]! - T
    lastLabel = outLabel
  }

  return [...prep, ...fades].join(';')
}

function normalizeVideoFilterChain(W: number, H: number): string {
  return `scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=bicubic,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=30,format=yuv420p`
}

async function evenTargetSizeFromFirstSegment(firstPath: string): Promise<{ W: number; H: number }> {
  let tw = 720
  let th = 1280
  try {
    const sz = await probeVideoSizeFromFile(firstPath)
    tw = sz.w
    th = sz.h
  } catch {
    /* vertical default */
  }
  return {
    W: Math.max(2, tw - (tw % 2)),
    H: Math.max(2, th - (th % 2)),
  }
}

/**
 * Join clips back-to-back (no overlap). Duration ≈ sum of clip lengths. Same normalize as xfade path.
 */
export async function concatMp4NormalizedStraightConcat(segmentAbsPaths: string[]): Promise<Buffer> {
  if (segmentAbsPaths.length === 0) {
    throw new Error('No video segments to concatenate')
  }
  if (segmentAbsPaths.length === 1) {
    return readFile(segmentAbsPaths[0]!)
  }

  const { W, H } = await evenTargetSizeFromFirstSegment(segmentAbsPaths[0]!)
  const norm = normalizeVideoFilterChain(W, H)
  const n = segmentAbsPaths.length
  const prep = segmentAbsPaths.map((_, i) => `[${i}:v]${norm}[x${i}]`).join(';')
  const concatInputs = segmentAbsPaths.map((_, i) => `[x${i}]`).join('')
  const filterComplex = `${prep};${concatInputs}concat=n=${n}:v=1:a=0[vout]`

  const dir = join(tmpdir(), `straight-${randomUUID()}`)
  await mkdir(dir, { recursive: true })
  const outPath = join(dir, 'merged.mp4')

  const args: string[] = []
  for (const p of segmentAbsPaths) {
    args.push('-i', p)
  }
  args.push(
    '-filter_complex',
    filterComplex,
    '-map',
    '[vout]',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    outPath
  )

  try {
    await runFfmpeg(args)
  } catch (e) {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
    throw e
  }

  const buf = await readFile(outPath)
  await rm(dir, { recursive: true, force: true })
  return buf
}

/**
 * Join montage segments with ffmpeg `xfade` (crossfade / swipe / wipe). Video-only output (-an).
 */
export async function concatMp4WithXfade(
  segmentAbsPaths: string[],
  xfadeTransitionName: string,
  transitionSeconds: number = 0.45
): Promise<Buffer> {
  if (segmentAbsPaths.length === 0) {
    throw new Error('No video segments to concatenate')
  }
  if (segmentAbsPaths.length === 1) {
    return readFile(segmentAbsPaths[0]!)
  }

  const durations: number[] = []
  for (const p of segmentAbsPaths) {
    durations.push(await probeVideoDurationSeconds(p))
  }

  const { W: tw, H: th } = await evenTargetSizeFromFirstSegment(segmentAbsPaths[0]!)

  const filterComplex = buildNormalizedXfadeFilterGraph(
    segmentAbsPaths.length,
    durations,
    xfadeTransitionName,
    transitionSeconds,
    tw,
    th
  )

  const dir = join(tmpdir(), `xfade-${randomUUID()}`)
  await mkdir(dir, { recursive: true })
  const outPath = join(dir, 'merged.mp4')

  const args: string[] = []
  for (const p of segmentAbsPaths) {
    args.push('-i', p)
  }
  args.push(
    '-filter_complex',
    filterComplex,
    '-map',
    '[vout]',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-an',
    outPath
  )

  try {
    await runFfmpeg(args)
  } catch (e) {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
    throw e
  }

  const buf = await readFile(outPath)
  await rm(dir, { recursive: true, force: true })
  return buf
}

export type MergeMontageSegmentsOptions =
  | { mergeMode: 'black'; blackGapSeconds: number }
  | { mergeMode: 'straight'; fallbackBlackGapSeconds?: number }
  | {
      mergeMode: 'xfade'
      xfadeName: string
      transitionSeconds?: number
      fallbackBlackGapSeconds?: number
    }

const DEFAULT_FALLBACK_GAP = 0.35

/**
 * Montage merge: straight concat (full summed duration), black gaps, or xfade (shorter output).
 */
export async function mergeMontageMp4Segments(
  segmentAbsPaths: string[],
  opts: MergeMontageSegmentsOptions
): Promise<Buffer> {
  if (opts.mergeMode === 'black') {
    return concatMp4FilesWithBlackBetween(segmentAbsPaths, opts.blackGapSeconds)
  }
  const gapForFallback = opts.fallbackBlackGapSeconds ?? DEFAULT_FALLBACK_GAP
  if (opts.mergeMode === 'straight') {
    try {
      return await concatMp4NormalizedStraightConcat(segmentAbsPaths)
    } catch (err) {
      console.warn('[mergeMontageMp4Segments] straight concat failed, falling back to black gaps:', err)
      return concatMp4FilesWithBlackBetween(segmentAbsPaths, gapForFallback)
    }
  }
  try {
    return await concatMp4WithXfade(
      segmentAbsPaths,
      opts.xfadeName,
      opts.transitionSeconds ?? 0.45
    )
  } catch (err) {
    console.warn('[mergeMontageMp4Segments] xfade failed, falling back to black gaps:', err)
    return concatMp4FilesWithBlackBetween(segmentAbsPaths, gapForFallback)
  }
}
