import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { getDb } from './config'
import type { ContentAngle, Platform, ApprovalStatus, AssetType } from '@/types'

export async function saveContentIdea(
  workspaceId: string,
  brandProfileId: string,
  data: { title: string; angle: ContentAngle; platforms: Platform[] }
): Promise<string> {
  const db = getDb()
  const ref = doc(collection(db, 'workspaces', workspaceId, 'contentIdeas'))
  await setDoc(ref, {
    id: ref.id,
    workspaceId,
    brandProfileId,
    title: data.title,
    angle: data.angle,
    platforms: data.platforms,
    status: 'ready',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function saveAsset(
  workspaceId: string,
  ideaId: string,
  data: { platform: Platform; type: AssetType; content: Record<string, unknown> }
): Promise<string> {
  const db = getDb()
  const ref = doc(collection(db, 'workspaces', workspaceId, 'assets'))
  await setDoc(ref, {
    id: ref.id,
    workspaceId,
    ideaId,
    platform: data.platform,
    type: data.type,
    content: data.content,
    status: 'pending_approval' as ApprovalStatus,
    createdAt: serverTimestamp(),
  })
  return ref.id
}
