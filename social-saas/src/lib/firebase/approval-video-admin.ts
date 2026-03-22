import { randomUUID } from 'crypto'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { resolveAdminStorageBucket } from '@/lib/firebase/admin'

const MAX_BYTES = 50 * 1024 * 1024

type WebReadable = import('stream/web').ReadableStream

/**
 * Stream raw video bytes to Storage (no giant JSON / base64 — avoids Next.js body parse limits).
 * Sets `firebaseStorageDownloadTokens` for same URL shape as the client SDK.
 */
export async function uploadApprovalVideoFromReadable(params: {
  workspaceId: string
  assetId: string
  body: ReadableStream<Uint8Array>
  contentType: string
  contentLength?: number
}): Promise<{ storagePath: string; downloadUrl: string }> {
  const { workspaceId, assetId, body, contentType, contentLength } = params
  if (contentLength !== undefined && contentLength > MAX_BYTES) {
    throw new Error('Video exceeds 50MB limit')
  }
  if (contentLength === 0) {
    throw new Error('Empty video')
  }

  const storagePath = `workspaces/${workspaceId}/approvalVideos/${assetId}.mp4`
  const token = randomUUID()
  const bucket = await resolveAdminStorageBucket()
  const file = bucket.file(storagePath)
  const ct = contentType.startsWith('video/') ? contentType : 'video/mp4'

  const source = Readable.fromWeb(body as WebReadable, { highWaterMark: 1024 * 1024 })

  let toUpload: NodeJS.ReadableStream = source
  if (contentLength === undefined) {
    let received = 0
    const limiter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        received += chunk.length
        if (received > MAX_BYTES) {
          cb(new Error('Video exceeds 50MB limit'))
          return
        }
        cb(null, chunk)
      },
    })
    toUpload = source.pipe(limiter)
  }

  const useResumable =
    contentLength === undefined ? true : contentLength > 6 * 1024 * 1024

  const writeStream = file.createWriteStream({
    resumable: useResumable,
    metadata: {
      contentType: ct,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  })

  await pipeline(toUpload, writeStream)

  const bucketName = bucket.name
  const encoded = encodeURIComponent(storagePath)
  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`

  return { storagePath, downloadUrl }
}
