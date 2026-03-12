'use client'

import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { useAuth } from '@/lib/firebase/auth-context'

export function Header({ title }: { title: string }) {
  const { user, logOut } = useAuth()
  const router = useRouter()

  async function handleLogOut() {
    await logOut()
    router.push('/login')
  }

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <User className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <span className="hidden sm:block">{user?.displayName ?? user?.email}</span>
        </div>
        <button
          onClick={handleLogOut}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          title="Çıkış yap"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
