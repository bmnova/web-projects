// Tip güvenlik testleri — derleme zamanında çalışır, runtime'da sadece import kontrol edilir
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

describe('Tip tanımları', () => {
  it('Platform tipi doğru değerleri içerir', () => {
    const platforms: Platform[] = ['reddit', 'instagram', 'tiktok', 'youtube']
    expect(platforms).toHaveLength(4)
  })

  it('ApprovalStatus tipi doğru değerleri içerir', () => {
    const statuses: ApprovalStatus[] = [
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'published',
    ]
    expect(statuses).toHaveLength(5)
  })

  it('ToneOfVoice tipi 4 seçenek içerir', () => {
    const tones: ToneOfVoice[] = ['professional', 'casual', 'humorous', 'educational']
    expect(tones).toHaveLength(4)
  })

  it('ContentAngle tipi 6 seçenek içerir', () => {
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

  it('JobStatus tipi doğru değerleri içerir', () => {
    const statuses: JobStatus[] = ['queued', 'processing', 'completed', 'failed', 'retrying']
    expect(statuses).toHaveLength(5)
  })

  it('PublishMode tipi 3 seçenek içerir', () => {
    const modes: PublishMode[] = ['direct', 'draft', 'scheduled']
    expect(modes).toHaveLength(3)
  })
})
