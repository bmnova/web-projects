import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  // Support both a full JSON blob and individual env vars
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) })
  }

  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error('Firebase Admin credentials not configured. Set FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_CLIENT_EMAIL, and NEXT_PUBLIC_FIREBASE_PROJECT_ID.')
  }

  return initializeApp({ credential: cert({ privateKey, clientEmail, projectId }) })
}

export function getAdminDb() {
  return getFirestore(getAdminApp())
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}

type GcsBucket = ReturnType<ReturnType<typeof getStorage>['bucket']>

/**
 * Resolves the real GCS bucket for Admin uploads. Console / client config may show
 * `*.firebasestorage.app` while the default bucket is still `*.appspot.com` (or the reverse).
 * Optional `FIREBASE_STORAGE_BUCKET` overrides `NEXT_PUBLIC_*` for server-only (correct gs id).
 */
export async function resolveAdminStorageBucket(): Promise<GcsBucket> {
  const app = getAdminApp()
  const projectId =
    (typeof app.options.projectId === 'string' ? app.options.projectId : undefined) ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()

  const fromServer = process.env.FIREBASE_STORAGE_BUCKET?.trim()
  const fromPublic = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim()
  const explicit = fromServer || fromPublic
  if (!explicit) {
    throw new Error(
      'Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (or FIREBASE_STORAGE_BUCKET on the server) to your Firebase Storage bucket id.'
    )
  }

  const storage = getStorage(app)
  const candidates: string[] = [explicit]
  if (projectId) {
    const appspot = `${projectId}.appspot.com`
    const firebaseHost = `${projectId}.firebasestorage.app`
    if (appspot !== explicit) candidates.push(appspot)
    if (firebaseHost !== explicit) candidates.push(firebaseHost)
  }

  const seen = new Set<string>()
  const ordered = candidates.filter((n) => {
    if (!n || seen.has(n)) return false
    seen.add(n)
    return true
  })

  const details: string[] = []
  for (const name of ordered) {
    const bucket = storage.bucket(name)
    try {
      const [exists] = await bucket.exists()
      if (exists) return bucket
    } catch (e) {
      details.push(`${name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  throw new Error(
    `Firebase Storage bucket not found. Tried: ${ordered.join(', ')}. ` +
      `Open Firebase Console → Build → Storage and use the default bucket id (often ${projectId ?? 'your-project-id'}.appspot.com). ` +
      `You can set FIREBASE_STORAGE_BUCKET in .env.local to override the client value. ` +
      (details.length ? `(${details.join(' ')})` : '')
  )
}
