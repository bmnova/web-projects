'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'

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
    // Firebase'i yalnızca tarayıcıda dynamic import ile yükle (SSR sırasında çalışmaz)
    let unsubscribe: (() => void) | undefined

    async function initAuth() {
      const { onAuthStateChanged } = await import('firebase/auth')
      const { getAuth_ } = await import('@/lib/firebase/config')
      unsubscribe = onAuthStateChanged(getAuth_(), (u) => {
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
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth')
    const { getAuth_, getDb } = await import('@/lib/firebase/config')
    const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore')
    const provider = new GoogleAuthProvider()
    const { user: u } = await signInWithPopup(getAuth_(), provider)
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
