function firebaseAdminConfigured(): boolean {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return true
  const pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY
  const em = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  return Boolean(pk && em && projectId)
}

/**
 * Extracts and verifies the Firebase ID token from the Authorization header.
 * Admin credential yoksa (yerel deneme) doğrulama atlanır, 'dev-user' döner.
 */
export async function getAuthUid(req: Request): Promise<string> {
  if (!firebaseAdminConfigured()) {
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
