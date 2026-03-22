import type { Platform } from '@/types'

/** Image prompts are English (Imagen recommends English-only input). */
export const IMAGE_GEN_HOOKS = {
  product_hero:
    'Premium product hero shot for paid social: product as the clear focal subject, soft studio lighting, subtle shadow, minimal background, high-end commercial look, sharp detail.',
  lifestyle:
    'Authentic lifestyle photograph: product in believable real-world use, natural daylight, candid feel, relatable for short-form social audiences.',
  bold_canvas:
    'Graphic-friendly composition: strong negative space, high contrast, suitable for a bold headline overlay; eye-catching thumbnail energy.',
  ugc:
    'UGC creator aesthetic: slight handheld imperfection, warm practical or ring-light feel, authentic non-studio vibe.',
} as const

/**
 * Short-form marketing visuals: first-1–3s retention, curiosity gap, pattern interrupt,
 * problem–solution feel (voiceover handles script; no on-screen text in prompts).
 */
export const VIDEO_GEN_HOOKS = {
  hook_broll:
    'Vertical short-form clip: attention-grabbing motion in the first second, dynamic camera movement, no readable on-screen text, energetic b-roll suitable for a spoken hook voiceover.',
  showcase:
    'Smooth product showcase: slow elegant camera motion, clean desk or studio environment, professional ad spot pacing.',
  kinetic:
    'Fast energetic motion, punchy movement, saturated colors, trend-native short-form feel in a single continuous take.',
  /** Scroll-stop: unexpected angle/motion, then clear product-related scene */
  pattern_interrupt:
    'Pattern-interrupt open: unexpected camera angle or jarring tasteful motion in the first second to stop scrolling, then settle into a clear product-relevant vertical scene. No on-screen text.',
  /** Pain-point visual: friction, empathy; pairs with VO problem setup */
  problem_relate:
    'Relatable pain-point visual: everyday friction or mild frustration in authentic setting, empathy-first; subtle shift toward hope or solution direction by end of clip. No readable text.',
  /** Curiosity gap: partial reveal, pull-back or uncover */
  curiosity_reveal:
    'Curiosity-gap visual: extreme close-up partial reveal, slow pull-back or uncovering so viewer needs to see more; resolve toward clearer product or payoff context. No text.',
  /** Contrarian: breaks expected pattern, mild cognitive dissonance */
  contrarian_visual:
    'Contrarian juxtaposition: one element breaks the expected pattern (wrong object in right place or bold reversal), mild cognitive dissonance, then coherent brand-related framing. No on-screen text.',
  /** Three visual beats for listicle-style VO (no on-screen numbers) */
  list_beats:
    'Three-beat listicle pacing for voiceover: three distinct compositions in one vertical clip, clear visual separation between beats, same subject thread, no numbers or words on screen.',
  /** Social proof / demo: usage, outcome, trust */
  proof_demo:
    'Demonstration and proof energy: hands-on usage, credible real-world test feel, before-during-after impression in one continuous take. No on-screen text.',
} as const

export type ImageGenHook = keyof typeof IMAGE_GEN_HOOKS
export type VideoGenHook = keyof typeof VIDEO_GEN_HOOKS

export function aspectRatioForPlatform(platform: Platform): '1:1' | '9:16' | '16:9' {
  if (platform === 'youtube_shorts' || platform === 'tiktok') return '9:16'
  if (platform === 'youtube') return '16:9'
  return '1:1'
}

export function buildImagePrompt(params: {
  brandName: string
  brandDescription: string
  audience: string
  ideaTitle: string
  ideaHook: string
  hookKey: ImageGenHook
  scriptExcerpt?: string
}): string {
  const style = IMAGE_GEN_HOOKS[params.hookKey]
  return [
    style,
    `Brand or product: ${params.brandName}.`,
    `Offer / value: ${params.brandDescription}.`,
    `Audience: ${params.audience}.`,
    `Campaign title: ${params.ideaTitle}.`,
    `Hook line: ${params.ideaHook}.`,
    params.scriptExcerpt
      ? `Spoken script context (excerpt): ${params.scriptExcerpt.slice(0, 400)}`
      : '',
    'Describe the image in English only (model input). No readable text or logos in the frame.',
  ]
    .filter(Boolean)
    .join(' ')
}

export function buildVideoPrompt(params: {
  brandName: string
  brandDescription: string
  ideaTitle: string
  ideaHook: string
  hookKey: VideoGenHook
  scriptExcerpt?: string
}): string {
  const style = VIDEO_GEN_HOOKS[params.hookKey]
  return [
    style,
    `Brand or product: ${params.brandName}.`,
    `Context: ${params.brandDescription}.`,
    `Video theme from campaign: ${params.ideaTitle}.`,
    `Opening hook: ${params.ideaHook}.`,
    params.scriptExcerpt
      ? `Align pacing with this narration (excerpt): ${params.scriptExcerpt.slice(0, 400)}`
      : '',
    'Full prompt in English only. No readable on-screen text.',
  ]
    .filter(Boolean)
    .join(' ')
}
