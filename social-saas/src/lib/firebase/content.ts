import {
  addDoc,
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { getDb, getAuth_ } from './config'
import type { ContentAngle, Platform, ApprovalStatus, AssetType } from '@/types'

async function videoDataUrlToBlob(videoDataUrl: string): Promise<Blob> {
  try {
    return await (await fetch(videoDataUrl)).blob()
  } catch {
    const comma = videoDataUrl.indexOf(',')
    if (comma < 0) throw new Error('Invalid video data URL')
    const meta = videoDataUrl.slice(0, comma)
    const base64 = videoDataUrl.slice(comma + 1)
    const mimeMatch = meta.match(/^data:([^;]+)/)
    const mime = mimeMatch?.[1]?.trim() || 'video/mp4'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
  }
}

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
  data: {
    platform: Platform
    type: AssetType
    content: Record<string, unknown>
    /** data:video/mp4;base64,... — uploaded to Storage, download URL stored on the asset */
    videoDataUrl?: string
  }
): Promise<string> {
  const db = getDb()
  const ref = doc(collection(db, 'workspaces', workspaceId, 'assets'))
  const assetId = ref.id

  let downloadUrl: string | undefined
  let storageRef: string | undefined
  if (data.videoDataUrl) {
    const videoDataUrl = data.videoDataUrl
    const authUser = getAuth_().currentUser
    let serverOk = false
    if (authUser && typeof window !== 'undefined') {
      try {
        const token = await authUser.getIdToken()
        const blob = await videoDataUrlToBlob(videoDataUrl)
        const res = await fetch('/api/approvals/upload-video', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': blob.type || 'video/mp4',
            'X-Workspace-Id': workspaceId,
            'X-Asset-Id': assetId,
          },
          body: blob,
        })
        if (res.ok) {
          const j = (await res.json()) as { downloadUrl?: string; storagePath?: string }
          if (j.downloadUrl && j.storagePath) {
            downloadUrl = j.downloadUrl
            storageRef = j.storagePath
            serverOk = true
          }
        } else if (res.status === 501) {
          /* Admin not configured — only case we fall back to client SDK */
        } else {
          const errBody = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(errBody.error || `Video upload failed (${res.status})`)
        }
      } catch (e) {
        if (e instanceof TypeError) {
          /* Network error — try client upload as last resort */
        } else {
          throw e
        }
      }
    }
    if (!serverOk) {
      const { uploadApprovalVideoMp4 } = await import('./approval-video-upload')
      const up = await uploadApprovalVideoMp4(workspaceId, assetId, videoDataUrl)
      downloadUrl = up.downloadUrl
      storageRef = up.storagePath
    }
  }

  await setDoc(ref, {
    id: assetId,
    workspaceId,
    ideaId,
    platform: data.platform,
    type: data.type,
    content: data.content,
    ...(downloadUrl ? { downloadUrl, storageRef } : {}),
    status: 'pending_approval' as ApprovalStatus,
    createdAt: serverTimestamp(),
  })
  await addDoc(collection(db, 'workspaces', workspaceId, 'approvalTasks'), {
    workspaceId,
    assetId: ref.id,
    assignedTo: '',
    status: 'pending' as const,
    createdAt: serverTimestamp(),
  })
  return ref.id
}
