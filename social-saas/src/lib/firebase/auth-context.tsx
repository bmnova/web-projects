'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { FirebaseError } from 'firebase/app'
import type { User } from 'firebase/auth'

function googleSignInErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.'
      case 'auth/operation-not-allowed':
        return 'Google sign-in is disabled. Enable Google under Firebase Console → Authentication → Sign-in method.'
      case 'auth/account-exists-with-different-credential':
        return 'This email is already registered with a different sign-in method.'
      case 'auth/popup-closed-by-user':
        return 'The Google sign-in popup was closed.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and any ad blockers.'
      case 'auth/internal-error':
        return 'Firebase internal error. Try clearing cache or another browser.'
      case 'invalid-api-key':
      case 'auth/invalid-api-key':
        return 'Invalid or missing API key. Ensure all NEXT_PUBLIC_FIREBASE_* env vars are set at build time (e.g. on Vercel).'
      case 'permission-denied':
        return 'Profile write was denied by Firestore. Check that firestore.rules are deployed.'
      default:
        break
    }
    if (err.message) return err.message
  }
  if (err instanceof Error && err.message) return err.message
  return 'Google sign-in failed.'
}

async function ensureUserFirestoreProfile(u: User): Promise<void> {
  const { getDb } = await import('@/lib/firebase/config')
  const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore')
  const ref = doc(getDb(), 'users', u.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      id: u.uid,
      email: u.email,
      displayName: u.displayName ?? '',
      photoURL: u.photoURL ?? null,
      workspaceIds: [],
      createdAt: serverTimestamp(),
    })
  }
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load Firebase only in the browser via dynamic import (not during SSR)
    let unsubscribe: (() => void) | undefined

    async function initAuth() {
      const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth')
      const { getAuth_ } = await import('@/lib/firebase/config')
      const auth = getAuth_()
      try {
        const result = await getRedirectResult(auth)
        if (result?.user) await ensureUserFirestoreProfile(result.user)
      } catch (e) {
        if (process.env.NODE_ENV === 'development') console.warn('[auth] getRedirectResult:', e)
      }
      unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      })
    }

    initAuth()
    return () => unsubscribe?.()
  }, [])

  async function signIn(email: string, password: string) {
    const { signInWithEmailAndPassword } = await import('firebase/auth')
    const { getAuth_ } = await import('@/lib/firebase/config')
    await signInWithEmailAndPassword(getAuth_(), email, password)
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { createUserWithEmailAndPassword } = await import('firebase/auth')
    const { getAuth_, getDb } = await import('@/lib/firebase/config')
    const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore')
    const { user: u } = await createUserWithEmailAndPassword(getAuth_(), email, password)
    const ref = doc(getDb(), 'users', u.uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        id: u.uid,
        email: u.email,
        displayName,
        photoURL: null,
        workspaceIds: [],
        createdAt: serverTimestamp(),
      })
    }
  }

  async function signInWithGoogle() {
    const { signInWithPopup, signInWithRedirect, GoogleAuthProvider } = await import('firebase/auth')
    const { getAuth_ } = await import('@/lib/firebase/config')
    if (
      typeof process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'string' ||
      !process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
      typeof process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN !== 'string' ||
      !process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ) {
      throw new Error('Firebase is not configured: set NEXT_PUBLIC_FIREBASE_* in .env.local.')
    }
    const auth = getAuth_()
    const provider = new GoogleAuthProvider()
    try {
      const { user: u } = await signInWithPopup(auth, provider)
      try {
        await ensureUserFirestoreProfile(u)
      } catch (profileErr) {
        throw new Error(googleSignInErrorMessage(profileErr))
      }
    } catch (e: unknown) {
      const code = e instanceof FirebaseError ? e.code : (e as { code?: string }).code
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        await signInWithRedirect(auth, provider)
        return
      }
      throw new Error(googleSignInErrorMessage(e))
    }
  }

  async function logOut() {
    const { signOut } = await import('firebase/auth')
    const { getAuth_ } = await import('@/lib/firebase/config')
    await signOut(getAuth_())
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
