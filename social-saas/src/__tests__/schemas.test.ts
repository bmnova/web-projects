import { BrandProfileSchema } from '@/lib/schemas/brand'

const validData = {
  productName: 'MyStartup',
  productDescription: 'A tool that helps founders automate their social media content creation and publishing across multiple platforms.',
  website: 'https://mystartup.com',
  targetAudience: 'Early-stage startup founders who want to grow their audience without hiring a social media manager.',
  toneOfVoice: 'casual' as const,
  competitors: ['Buffer', 'Hootsuite'],
  examplePosts: [],
  forbiddenTerms: ['spam', 'fake'],
  ctaStyle: 'Try for free',
}

describe('BrandProfileSchema', () => {
  it('accepts valid data', () => {
    const result = BrandProfileSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects short productName', () => {
    const result = BrandProfileSchema.safeParse({ ...validData, productName: 'X' })
    expect(result.success).toBe(false)
  })

  it('rejects short productDescription (min 50 chars)', () => {
    const result = BrandProfileSchema.safeParse({ ...validData, productDescription: 'Too short.' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid URL', () => {
    const result = BrandProfileSchema.safeParse({ ...validData, website: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid toneOfVoice', () => {
    const result = BrandProfileSchema.safeParse({ ...validData, toneOfVoice: 'aggressive' })
    expect(result.success).toBe(false)
  })

  it('rejects more than 10 competitors', () => {
    const result = BrandProfileSchema.safeParse({
      ...validData,
      competitors: Array.from({ length: 11 }, (_, i) => `Competitor${i}`),
    })
    expect(result.success).toBe(false)
  })

  it('accepts all valid toneOfVoice values', () => {
    const tones = ['professional', 'casual', 'humorous', 'educational'] as const
    tones.forEach(tone => {
      const result = BrandProfileSchema.safeParse({ ...validData, toneOfVoice: tone })
      expect(result.success).toBe(true)
    })
  })
})
