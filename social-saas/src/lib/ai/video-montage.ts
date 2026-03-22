import { generateText } from '@/lib/ai/gemini'
import { VIDEO_GEN_HOOKS, type VideoGenHook } from '@/lib/ai/media-hooks'
import {
  clampMontageSceneCount,
  parseAiPlanMergeTransition,
  AI_PLAN_MERGE_TRANSITION_IDS,
  type MontageMergeTransitionId,
} from '@/lib/ai/montage-shared'

export interface MontageScene {
  label: string
  veoPrompt: string
}

export interface MontagePlanResult {
  scenes: MontageScene[]
  /** How the final montage should join clips (server maps to ffmpeg). */
  mergeTransition: MontageMergeTransitionId
  /** How a future voiceover / VO should sound (we do not generate audio yet). */
  audioDirection: string
  /** One line on rhythm / energy between scenes. */
  pacingNote: string
}

export { MONTAGE_SCENE_MIN, MONTAGE_SCENE_MAX, clampMontageSceneCount } from '@/lib/ai/montage-shared'

/**
 * LLM plans shots + edit/join strategy as a senior marketing video creative.
 */
export async function planMontageScenes(params: {
  videoHook: VideoGenHook
  brandName: string
  brandDescription: string
  audience: string
  ideaTitle: string
  ideaHook: string
  scriptExcerpt: string
  sceneCount: number
}): Promise<MontagePlanResult> {
  const n = clampMontageSceneCount(params.sceneCount)
  const style = VIDEO_GEN_HOOKS[params.videoHook]
  const script = params.scriptExcerpt.slice(0, 2000)

  const arcHint =
    n === 2
      ? 'Scene 1 = scroll-stopping hook. Scene 2 = payoff, proof, or strong CTA *energy* (still no readable text on screen).'
      : n === 3
        ? 'Scene 1 = scroll-stopping hook. Scene 2 = core value or product in context. Scene 3 = resolution, proof, or strong CTA *energy*.'
        : `Scene 1 = hook. Scenes 2–${n - 1} = build value, context, and momentum. Scene ${n} = resolution, proof, or strong CTA *energy*.`

  const mergeIds = AI_PLAN_MERGE_TRANSITION_IDS.join(' | ')

  const prompt = `You are a senior performance marketing creative: you produce short-form vertical ads (9:16) like a lead at a top D2C or SaaS studio. You decide BOTH what each shot should look like AND how the edit should feel when clips are stitched (pacing, join style, and how a voiceover should eventually sound — we generate silent video only for now, but teams will add VO later).

Visual hook already chosen for this piece (must inform scene energy AND your join-style choice):
${style}

Brand / product: ${params.brandName}
What it does: ${params.brandDescription}
Audience: ${params.audience}
Campaign title: ${params.ideaTitle}
Hook line: ${params.ideaHook}

Script / spoken line context (align visuals so VO could match later):
${script}

Shot requirements:
- Exactly ${n} scenes. ${arcHint}
- Each veoPrompt must be English, self-contained, under 450 characters, cinematic b-roll / product visuals only — NO readable text, letters, logos, or subtitles in the frame.
- Visual continuity: same implied product/subject thread across scenes where possible.

Edit & marketing decisions (you must output these fields):
- mergeTransition: Pick ONE id from exactly this set (no other strings): ${mergeIds}
  • straight = hard cuts, full summed clip length, confident / raw UGC feel
  • black = short beat between clips, ad-like pause, emphasis
  • fade = soft crossfade, premium / calm
  • swipe_left | swipe_right | swipe_up | swipe_down = kinetic, TikTok/Reels energy (pick direction that matches motion in the script and hook)
  • wipe_left | wipe_right = sharper, broadcast-style wipes
  Let the chosen visual hook + brand tone drive this; do not pick randomly.

- audioDirection: 1–3 sentences. Describe how a professional VO should sound when added later (gender/tone optional, pace, energy, where to pause, music vibe if any). Be specific for editors.

- pacingNote: One short sentence on how the montage should feel as a whole (e.g. "Front-load tension, open up in scene 3").

Return ONLY valid JSON with keys: scenes (array of ${n} objects with "label" and "veoPrompt"), "mergeTransition" (string), "audioDirection" (string), "pacingNote" (string).`

  const raw = await generateText(prompt)
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) {
    throw new Error('Could not parse scene plan JSON from model output')
  }

  const parsed = JSON.parse(m[0]) as {
    scenes?: { label?: unknown; veoPrompt?: unknown }[]
    mergeTransition?: unknown
    audioDirection?: unknown
    pacingNote?: unknown
  }
  const scenes = parsed.scenes
  if (!Array.isArray(scenes) || scenes.length < n) {
    throw new Error(`Model must return at least ${n} scenes`)
  }

  const out: MontageScene[] = scenes.slice(0, n).map((s, i) => ({
    label: typeof s.label === 'string' && s.label.trim() ? s.label.trim() : `Scene ${i + 1}`,
    veoPrompt: typeof s.veoPrompt === 'string' ? s.veoPrompt.trim() : '',
  }))

  if (out.length !== n) {
    throw new Error(`Expected ${n} scenes after trim`)
  }

  if (out.some((s) => s.veoPrompt.length < 20)) {
    throw new Error('Each scene needs a substantive veoPrompt')
  }

  const mergeTransition = parseAiPlanMergeTransition(parsed.mergeTransition)
  const audioDirection =
    typeof parsed.audioDirection === 'string' && parsed.audioDirection.trim()
      ? parsed.audioDirection.trim().slice(0, 1200)
      : 'Match the script energy; clear articulation; leave space after the hook for emphasis.'
  const pacingNote =
    typeof parsed.pacingNote === 'string' && parsed.pacingNote.trim()
      ? parsed.pacingNote.trim().slice(0, 400)
      : 'Build momentum across scenes toward a strong final beat.'

  return {
    scenes: out,
    mergeTransition,
    audioDirection,
    pacingNote,
  }
}
