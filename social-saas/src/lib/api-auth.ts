/**
 * Extracts and verifies the Firebase ID token from the Authorization header.
 * In dev mode (no FIREBASE_SERVICE_ACCOUNT_JSON), skips verification and returns 'dev-user'.
 */
export async function getAuthUid(req: Request): Promise<string> {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return 'dev-user'
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }

  try {
    const { getAdminAuth } = await import('./firebase/admin')
    const decoded = await getAdminAuth().verifyIdToken(token)
    return decoded.uid
  } catch {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }
}
