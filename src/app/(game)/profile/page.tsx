'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProfileCard, type ProfileData, type ProfileStats } from '@/components/game/ProfileCard'
import { ProfileEditor } from '@/components/game/ProfileEditor'

type Title = { id: string; title: string; source: string; earnedAt: string }

type ApiResponse = {
  profile: ProfileData & {
    id:            string
    balanceCrate:  number
    balanceSol:    number
    balanceLc:     number
    profilePublic: boolean
    titles:        Title[]
  }
  stats: ProfileStats
}

export default function ProfilePage() {
  const [data,    setData]    = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/game/profile')
    if (!res.ok) {
      setError('Failed to load profile.')
      setLoading(false)
      return
    }
    const json = await res.json() as ApiResponse
    setData(json)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <ProfileSkeleton />
  if (error || !data) return (
    <div className="p-8">
      <p className="text-red-400 text-sm">{error ?? 'Something went wrong.'}</p>
    </div>
  )

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">My Profile</h2>
        <p className="text-gray-500 text-sm mt-1">Your public operator card visible to other players.</p>
      </div>

      <ProfileCard profile={data.profile} stats={data.stats} />

      <ProfileEditor
        initial={{
          bio:           data.profile.bio,
          avatarUrl:     data.profile.avatarUrl,
          equippedTitle: data.profile.equippedTitle,
          profilePublic: data.profile.profilePublic,
          titles:        data.profile.titles,
        }}
        onSaved={load}
      />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="p-8 max-w-2xl space-y-6 animate-pulse">
      <div className="h-8 bg-zinc-800 rounded w-40" />
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <div className="flex gap-4">
          <div className="w-20 h-20 rounded-full bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-zinc-800 rounded w-32" />
            <div className="h-3 bg-zinc-800 rounded w-24" />
            <div className="h-3 bg-zinc-800 rounded w-48" />
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
