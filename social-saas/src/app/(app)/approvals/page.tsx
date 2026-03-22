'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/firebase/auth-context'
import { Header } from '@/components/layout/Header'
import { CheckSquare, Clapperboard, Loader2 } from 'lucide-react'
import type { Asset, Platform, AssetType } from '@/types'

const STUDIO_FROM_APPROVALS_KEY = 'social-saas-studio-from-approvals'

const PLATFORM_LABEL: Record<Platform, string> = {
  reddit: 'Reddit',
  twitter: 'X (Twitter)',
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  youtube_shorts: 'YT Shorts',
}

const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  text: 'Text',
  carousel: 'Carousel',
  image: 'Image',
  video: 'Video',
  reddit_reply: 'Reddit reply',
  thread: 'Thread',
  script: 'Video script',
}

function scriptBodyFromContent(c: Record<string, unknown>): string {
  if (typeof c.scriptText === 'string') return c.scriptText
  if (typeof c.text === 'string') return c.text
  return ''
}

function previewForAsset(asset: Asset): string {
  const c = asset.content as Record<string, unknown>
  if (asset.type === 'thread' && Array.isArray(c.tweets)) {
    return String(c.tweets[0] ?? '').slice(0, 280)
  }
  if (asset.type === 'carousel' && typeof c.cover === 'string') {
    return c.cover.slice(0, 200)
  }
  if (asset.type === 'video') {
    const body = scriptBodyFromContent(c)
    return body ? body.slice(0, 400) : '—'
  }
  if (typeof c.text === 'string') {
    return c.text.slice(0, 400)
  }
  return '—'
}

async function getWorkspaceId(uid: string): Promise<string | null> {
  const { getDoc, doc } = await import('firebase/firestore')
  const { getDb } = await import('@/lib/firebase/config')
  const db = getDb()
  const userSnap = await getDoc(doc(db, 'users', uid))
  if (!userSnap.exists()) return null
  const wids: string[] = userSnap.data().workspaceIds ?? []
  return wids[0] ?? null
}

function ApprovalsRow({
  asset,
  workspaceId,
  openingStudioId,
  onOpenStudio,
}: {
  asset: Asset
  workspaceId: string | null
  openingStudioId: string | null
  onOpenStudio: (asset: Asset, workspaceId: string) => void
}) {
  const busy = openingStudioId === asset.id
  const c = asset.content as Record<string, unknown>
  const montageLabels = Array.isArray(c.montageSceneLabels)
    ? c.montageSceneLabels.filter((x): x is string => typeof x === 'string' && x.length > 0)
    : []
  const showStudioCta =
    workspaceId && (asset.type === 'script' || asset.type === 'video')

  return (
    <li className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
          {PLATFORM_LABEL[asset.platform] ?? asset.platform}
        </span>
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
          {ASSET_TYPE_LABEL[asset.type] ?? asset.type}
        </span>
        {showStudioCta && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenStudio(asset, workspaceId)}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Clapperboard className="w-3.5 h-3.5" />
            )}
            {asset.type === 'video' ? 'Edit in Studio' : 'Open in Studio for video'}
          </button>
        )}
      </div>
      {asset.type === 'video' && asset.downloadUrl && (
        <div className="mb-3">
          {montageLabels.length > 0 && (
            <p className="text-[11px] text-violet-700 font-medium mb-1">
              Montage: {montageLabels.join(' → ')}
            </p>
          )}
          <video
            src={asset.downloadUrl}
            controls
            className="max-w-full max-h-64 rounded-lg border border-gray-200 bg-black"
          />
        </div>
      )}
      <p className="text-sm text-gray-800 whitespace-pre-wrap line-clamp-6">
        {previewForAsset(asset)}
      </p>
      {showStudioCta === false && asset.type === 'script' && !workspaceId && (
        <p className="text-xs text-amber-700 mt-2">Workspace not loaded — refresh the page.</p>
      )}
    </li>
  )
}

export default function ApprovalsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openingStudioId, setOpeningStudioId] = useState<string | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setWorkspaceId(null)
      setLoading(false)
      return
    }

    let unsub: (() => void) | undefined

    ;(async () => {
      try {
        const wid = await getWorkspaceId(user.uid)
        setWorkspaceId(wid)
        if (!wid) {
          setAssets([])
          setLoading(false)
          return
        }

        const { collection, query, where, onSnapshot } = await import('firebase/firestore')
        const { getDb } = await import('@/lib/firebase/config')
        const db = getDb()
        const q = query(
          collection(db, 'workspaces', wid, 'assets'),
          where('status', '==', 'pending_approval')
        )

        unsub = onSnapshot(
          q,
          snap => {
            const rows: Asset[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset))
            rows.sort((a, b) => {
              const ta = a.createdAt && typeof a.createdAt === 'object' && 'toMillis' in a.createdAt
                ? (a.createdAt as { toMillis: () => number }).toMillis()
                : 0
              const tb = b.createdAt && typeof b.createdAt === 'object' && 'toMillis' in b.createdAt
                ? (b.createdAt as { toMillis: () => number }).toMillis()
                : 0
              return tb - ta
            })
            setAssets(rows)
            setError('')
            setLoading(false)
          },
          err => {
            setError(err.message)
            setLoading(false)
          }
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
        setLoading(false)
      }
    })()

    return () => {
      unsub?.()
    }
  }, [user])

  async function openScriptInStudio(asset: Asset, workspaceId: string) {
    const c = asset.content as Record<string, unknown>
    const text = scriptBodyFromContent(c)
    const notes = typeof c.notes === 'string' ? c.notes : ''
    const montageSceneLabels = Array.isArray(c.montageSceneLabels)
      ? c.montageSceneLabels.filter((x): x is string => typeof x === 'string' && x.length > 0)
      : undefined
    setOpeningStudioId(asset.id)
    let title = 'From approvals'
    try {
      const { getDoc, doc } = await import('firebase/firestore')
      const { getDb } = await import('@/lib/firebase/config')
      const db = getDb()
      const ideaSnap = await getDoc(
        doc(db, 'workspaces', workspaceId, 'contentIdeas', asset.ideaId)
      )
      if (ideaSnap.exists()) {
        const t = ideaSnap.data().title
        if (typeof t === 'string' && t.trim()) title = t.trim()
      }
    } catch {
      /* keep default title */
    } finally {
      setOpeningStudioId(null)
    }
    sessionStorage.setItem(
      STUDIO_FROM_APPROVALS_KEY,
      JSON.stringify({
        platform: asset.platform,
        text,
        notes,
        title,
        ...(asset.downloadUrl ? { videoUrl: asset.downloadUrl } : {}),
        ...(montageSceneLabels?.length ? { montageSceneLabels } : {}),
      })
    )
    router.push('/studio')
  }

  return (
    <>
      <Header title="Approvals" />
      <main className="flex-1 p-6">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            {error}
          </div>
        ) : assets.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              Nothing pending. From Studio, use <strong>Send to approvals (video + script)</strong> for video
              posts, or <strong>Send for approval</strong> for text — then review here before publishing.
            </p>
          </div>
        ) : (
          <>
            {assets.some(a => a.type === 'video') && (
              <p className="text-sm text-gray-600 mb-4 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <strong>Video</strong> items include the rendered file for publishing review. Use{' '}
                <strong>Edit in Studio</strong> to tweak script or regenerate, then send again if needed.
              </p>
            )}
            {assets.some(a => a.type === 'script') && !assets.some(a => a.type === 'video') && (
              <p className="text-sm text-gray-600 mb-4 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                Legacy <strong>script-only</strong> rows: open in Studio to add a video, or regenerate from
                Studio with the new flow (video required before approval).
              </p>
            )}
            <ul className="space-y-3">
            {assets.map(asset => (
              <ApprovalsRow
                key={asset.id}
                asset={asset}
                workspaceId={workspaceId}
                openingStudioId={openingStudioId}
                onOpenStudio={openScriptInStudio}
              />
            ))}
            </ul>
          </>
        )}
      </main>
    </>
  )
}
