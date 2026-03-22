import { NextRequest, NextResponse } from 'next/server'
import { firebaseAdminConfigured, getAuthUid } from '@/lib/api-auth'
import { getAdminDb } from '@/lib/firebase/admin'
import { uploadApprovalVideoFromReadable } from '@/lib/firebase/approval-video-admin'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_BYTES = 50 * 1024 * 1024

/** Firestore-style ids (workspace + auto asset id). */
function isSafeDocId(s: string): boolean {
  return /^[a-zA-Z0-9_-]{1,128}$/.test(s)
}

export async function POST(req: NextRequest) {
  if (!firebaseAdminConfigured()) {
    return NextResponse.json(
      { error: 'Server video upload unavailable', code: 'ADMIN_NOT_CONFIGURED' },
      { status: 501 }
    )
  }

  let uid: string
  try {
    uid = await getAuthUid(req)
  } catch (e) {
    const status = typeof e === 'object' && e !== null && 'status' in e ? (e as { status: number }).status : 401
    return NextResponse.json({ error: 'Unauthorized' }, { status: status === 401 ? 401 : 500 })
  }

  const workspaceId = req.headers.get('x-workspace-id')?.trim() ?? ''
  const assetId = req.headers.get('x-asset-id')?.trim() ?? ''
  if (!isSafeDocId(workspaceId) || !isSafeDocId(assetId)) {
    return NextResponse.json(
      { error: 'Invalid or missing X-Workspace-Id / X-Asset-Id' },
      { status: 400 }
    )
  }

  const rawLen = req.headers.get('content-length')
  let contentLength: number | undefined
  if (rawLen) {
    const n = parseInt(rawLen, 10)
    if (!Number.isNaN(n)) contentLength = n
  }
  if (contentLength !== undefined && contentLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Video exceeds 50MB limit' }, { status: 413 })
  }
  if (contentLength === 0) {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 })
  }

  if (!req.body) {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 })
  }

  if (uid !== 'dev-user') {
    const ws = await getAdminDb().collection('workspaces').doc(workspaceId).get()
    if (!ws.exists) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }
    const memberIds: string[] = ws.data()?.memberIds ?? []
    if (!memberIds.includes(uid)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const contentType = req.headers.get('content-type') || 'video/mp4'

  try {
    const { downloadUrl, storagePath } = await uploadApprovalVideoFromReadable({
      workspaceId,
      assetId,
      body: req.body,
      contentType,
      contentLength,
    })
    return NextResponse.json({ downloadUrl, storagePath })
  } catch (e) {
    console.error('approvals/upload-video', e)
    const msg = e instanceof Error ? e.message : 'Upload failed'
    if (msg.includes('50MB')) {
      return NextResponse.json({ error: msg }, { status: 413 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
