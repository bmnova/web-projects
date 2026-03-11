import { z } from 'zod'

export const BrandProfileSchema = z.object({
  productName: z.string().min(2, 'En az 2 karakter').max(100),
  productDescription: z.string().min(50, 'En az 50 karakter').max(2000),
  website: z.string().url('Geçerli bir URL girin'),
  targetAudience: z.string().min(20, 'En az 20 karakter').max(1000),
  toneOfVoice: z.enum(['professional', 'casual', 'humorous', 'educational']),
  competitors: z.array(z.string()).max(10),
  examplePosts: z.array(z.string()).max(5),
  forbiddenTerms: z.array(z.string()).max(50),
  ctaStyle: z.string().max(500),
})

export type BrandProfileFormData = z.infer<typeof BrandProfileSchema>
