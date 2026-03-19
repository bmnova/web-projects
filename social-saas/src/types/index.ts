import type { Timestamp } from 'firebase/firestore'
import type { Plan } from '@/lib/firebase/billing-shared'

export type Platform = 'reddit' | 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'youtube_shorts'

export type Format = 'post' | 'thread' | 'carousel' | 'script'

export type ApprovalStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'published'

export type ToneOfVoice = 'professional' | 'casual' | 'humorous' | 'educational'

export type ContentAngle =
  | 'pain_point'
  | 'feature'
  | 'educational'
  | 'comparison'
  | 'founder'
  | 'launch'

export type AssetType = 'text' | 'carousel' | 'image' | 'video' | 'reddit_reply' | 'thread' | 'script'

export type PublishMode = 'direct' | 'draft' | 'scheduled'

export type JobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'retrying'

export type AccountStatus = 'connected' | 'expired' | 'error'

export type RedditIntent = 'question' | 'complaint' | 'recommendation' | 'discussion'

export type { Plan } from '@/lib/firebase/billing-shared'

export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  workspaceIds: string[]
  plan?: Plan
  paddleSubscriptionId?: string
  paddleCustomerId?: string
  createdAt: Timestamp
}

export interface Workspace {
  id: string
  name: string
  ownerUid: string
  memberIds: string[]
  brandProfileId?: string
  createdAt: Timestamp
}

export interface BrandProfile {
  id: string
  workspaceId: string
  productName: string
  productDescription: string
  website: string
  targetAudience: string
  toneOfVoice: ToneOfVoice
  competitors: string[]
  examplePosts: string[]
  forbiddenTerms: string[]
  ctaStyle: string
  updatedAt: Timestamp
}

export interface ConnectedAccount {
  id: string
  workspaceId: string
  platform: Platform
  accountName: string
  accountId: string
  scopes: string[]
  tokenRef: string
  refreshTokenRef: string
  expiresAt: Timestamp
  status: AccountStatus
}

export interface ContentIdea {
  id: string
  workspaceId: string
  brandProfileId: string
  title: string
  angle: ContentAngle
  platforms: Platform[]
  status: 'draft' | 'generating' | 'ready'
  createdAt: Timestamp
}

export interface Asset {
  id: string
  workspaceId: string
  ideaId: string
  platform: Platform
  type: AssetType
  content: Record<string, unknown>
  status: ApprovalStatus
  storageRef?: string
  downloadUrl?: string
  createdAt: Timestamp
}

export interface ApprovalTask {
  id: string
  workspaceId: string
  assetId: string
  assignedTo: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: Timestamp
  notes?: string
}

export interface PublishJob {
  id: string
  workspaceId: string
  platform: Platform
  assetId: string
  accountId: string
  mode: PublishMode
  scheduledAt?: Timestamp
  status: JobStatus
  externalPostId?: string
  error?: string
  attemptCount: number
  createdAt: Timestamp
}

export interface RedditLead {
  id: string
  workspaceId: string
  subreddit: string
  postId: string
  postTitle: string
  postUrl: string
  snippet: string
  summary: string
  intent: RedditIntent
  riskScore: number
  suggestedReply: string
  status: 'pending' | 'approved' | 'skipped' | 'published'
  publishedAt?: Timestamp
}

export interface PostAnalytics {
  id: string
  assetId: string
  platform: Platform
  externalPostId: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  collectedAt: Timestamp
}
