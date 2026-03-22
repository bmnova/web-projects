import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getStorage_ } from './config'

/**
 * Uploads an MP4 for an approval asset (data URL from Studio, or https URL when re-saving from Approvals).
 * Path must stay under workspaces/{workspaceId}/ so Storage rules apply.
 */
export async function uploadApprovalVideoMp4(
  workspaceId: string,
  assetId: string,
  dataUrlOrHttps: string
): Promise<{ storagePath: string; downloadUrl: string }> {
  let blob: Blob
  if (dataUrlOrHttps.startsWith('data:')) {
    const comma = dataUrlOrHttps.indexOf(',')
    if (comma < 0) throw new Error('Invalid data URL')
    const meta = dataUrlOrHttps.slice(0, comma)
    const base64 = dataUrlOrHttps.slice(comma + 1)
    const mimeMatch = meta.match(/^data:([^;]+)/)
    const mime = mimeMatch?.[1]?.trim() || 'video/mp4'
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    blob = new Blob([bytes], { type: mime })
  } else if (/^https?:\/\//i.test(dataUrlOrHttps)) {
    const res = await fetch(dataUrlOrHttps)
    if (!res.ok) throw new Error(`Could not fetch existing video (${res.status})`)
    blob = await res.blob()
  } else {
    throw new Error('Video must be a data: URL or http(s) URL')
  }

  const storagePath = `workspaces/${workspaceId}/approvalVideos/${assetId}.mp4`
  const storage = getStorage_()
  const r = ref(storage, storagePath)
  await uploadBytes(r, blob, { contentType: 'video/mp4' })
  const downloadUrl = await getDownloadURL(r)
  return { storagePath, downloadUrl }
}
