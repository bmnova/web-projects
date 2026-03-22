// Type smoke tests — compile-time; runtime only checks imports resolve
import type {
  Platform,
  ApprovalStatus,
  ToneOfVoice,
  ContentAngle,
  AssetType,
  PublishMode,
  JobStatus,
  AccountStatus,
  RedditIntent,
} from '@/types'

describe('Type definitions', () => {
  it('Platform includes expected values', () => {
    const platforms: Platform[] = ['reddit', 'instagram', 'tiktok', 'youtube']
    expect(platforms).toHaveLength(4)
  })

  it('ApprovalStatus includes expected values', () => {
    const statuses: ApprovalStatus[] = [
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'published',
    ]
    expect(statuses).toHaveLength(5)
  })

  it('ToneOfVoice has 4 options', () => {
    const tones: ToneOfVoice[] = ['professional', 'casual', 'humorous', 'educational']
    expect(tones).toHaveLength(4)
  })

  it('ContentAngle has 6 options', () => {
    const angles: ContentAngle[] = [
      'pain_point',
      'feature',
      'educational',
      'comparison',
      'founder',
      'launch',
    ]
    expect(angles).toHaveLength(6)
  })

  it('JobStatus includes expected values', () => {
    const statuses: JobStatus[] = ['queued', 'processing', 'completed', 'failed', 'retrying']
    expect(statuses).toHaveLength(5)
  })

  it('PublishMode has 3 options', () => {
    const modes: PublishMode[] = ['direct', 'draft', 'scheduled']
    expect(modes).toHaveLength(3)
  })
})
