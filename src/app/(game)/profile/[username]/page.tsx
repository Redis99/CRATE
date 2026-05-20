'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ProfileCard, type ProfileData, type ProfileStats } from '@/components/game/ProfileCard'

type ApiResponse =
  | { private: true; username: string }
  | { profile: ProfileData; stats: ProfileStats }

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const [data,    setData]    = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!username) return
    fetch(`/api/game/profile/${encodeURIComponent(username)}`)
      .then(async (res) => {
        if (res.status === 404) { setNotFound(true); setLoading(false); return }
        const json = await res.json() as ApiResponse
        setData(json)
        setLoading(false)
      })
      .catch(() => { setLoading(false) })
  }, [username])

  if (loading) return <PublicSkeleton />

  if (notFound) return (
    <div className="p-8">
      <p className="text-gray-400 text-sm">Player <span className="text-white font-medium">{username}</span> not found.</p>
    </div>
  )

  if (!data) return (
    <div className="p-8">
      <p className="text-red-400 text-sm">Failed to load profile.</p>
    </div>
  )

  if ('private' in data) return (
    <div className="p-8 max-w-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center space-y-3">
        <div className="text-4xl">🔒</div>
        <h3 className="text-white font-semibold">{data.username}</h3>
        <p className="text-gray-500 text-sm">This profile is private.</p>
      </div>
    </div>
  )

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{data.profile.username}</h2>
        <p className="text-gray-500 text-sm mt-1">Operator profile</p>
      </div>
      <ProfileCard profile={data.profile} stats={data.stats} />
    </div>
  )
}

function PublicSkeleton() {
  return (
    <div className="p-8 max-w-2xl animate-pulse space-y-4">
      <div className="h-8 bg-zinc-800 rounded w-40" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-zinc-800 rounded w-32" />
            <div className="h-3 bg-zinc-800 rounded w-24" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
