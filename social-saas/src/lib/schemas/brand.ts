import { z } from 'zod'

export const BrandProfileSchema = z.object({
  productName: z.string().min(2, 'At least 2 characters').max(100),
  productDescription: z.string().min(50, 'At least 50 characters').max(2000),
  website: z.string().url('Enter a valid URL'),
  targetAudience: z.string().min(20, 'At least 20 characters').max(1000),
  toneOfVoice: z.enum(['professional', 'casual', 'humorous', 'educational']),
  competitors: z.array(z.string()).max(10),
  examplePosts: z.array(z.string()).max(5),
  forbiddenTerms: z.array(z.string()).max(50),
  ctaStyle: z.string().max(500),
})

export type BrandProfileFormData = z.infer<typeof BrandProfileSchema>
