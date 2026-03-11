import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore'
import { getDb } from './config'
import type { Workspace, BrandProfile } from '@/types'

export async function createWorkspace(uid: string, name: string): Promise<string> {
  const db = getDb()
  const ref = doc(collection(db, 'workspaces'))
  await setDoc(ref, {
    id: ref.id,
    name,
    ownerUid: uid,
    memberIds: [uid],
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'users', uid), {
    workspaceIds: arrayUnion(ref.id),
  })
  return ref.id
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const snap = await getDoc(doc(getDb(), 'workspaces', workspaceId))
  return snap.exists() ? (snap.data() as Workspace) : null
}

export async function saveBrandProfile(
  workspaceId: string,
  data: Omit<BrandProfile, 'id' | 'workspaceId' | 'updatedAt'>
): Promise<string> {
  const db = getDb()
  const ref = doc(collection(db, 'workspaces', workspaceId, 'brandProfiles'))
  await setDoc(ref, {
    ...data,
    id: ref.id,
    workspaceId,
    updatedAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'workspaces', workspaceId), {
    brandProfileId: ref.id,
  })
  return ref.id
}

export async function getBrandProfile(workspaceId: string): Promise<BrandProfile | null> {
  const workspace = await getWorkspace(workspaceId)
  if (!workspace?.brandProfileId) return null
  const snap = await getDoc(
    doc(getDb(), 'workspaces', workspaceId, 'brandProfiles', workspace.brandProfileId)
  )
  return snap.exists() ? (snap.data() as BrandProfile) : null
}
