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
  it('geçerli veriyi kabul eder', () => {
    const result = BrandProfileSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('kısa productName reddeder', () => {
    const result = BrandProfileSchema.safeParse({ ...validData, productName: 'X' })
    expect(result.success).toBe(false)
  })

  it('kısa productDescription reddeder (min 50 karakter)', () => {
    const result = BrandProfileSchema.safeParse({ ...validData, productDescription: 'Kısa.' })
    expect(result.success).toBe(false)
  })

  it('geçersiz URL reddeder', () => {
    const result = BrandProfileSchema.safeParse({ ...validData, website: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('geçersiz toneOfVoice reddeder', () => {
    const result = BrandProfileSchema.safeParse({ ...validData, toneOfVoice: 'aggressive' })
    expect(result.success).toBe(false)
  })

  it('10\'dan fazla competitor reddeder', () => {
    const result = BrandProfileSchema.safeParse({
      ...validData,
      competitors: Array.from({ length: 11 }, (_, i) => `Competitor${i}`),
    })
    expect(result.success).toBe(false)
  })

  it('tüm geçerli toneOfVoice değerlerini kabul eder', () => {
    const tones = ['professional', 'casual', 'humorous', 'educational'] as const
    tones.forEach(tone => {
      const result = BrandProfileSchema.safeParse({ ...validData, toneOfVoice: tone })
      expect(result.success).toBe(true)
    })
  })
})
