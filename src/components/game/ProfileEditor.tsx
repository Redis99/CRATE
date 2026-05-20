'use client'

import { useState } from 'react'

type Title = {
  id:       string
  title:    string
  source:   string
  earnedAt: string
}

type Props = {
  initial: {
    bio:           string | null
    avatarUrl:     string | null
    equippedTitle: string | null
    profilePublic: boolean
    titles:        Title[]
  }
  onSaved?: () => void
}

const SOURCE_LABEL: Record<string, string> = {
  MISSION: 'Mission',
  CODEX:   'Codex',
}

export function ProfileEditor({ initial, onSaved }: Props) {
  const [bio,           setBio]           = useState(initial.bio ?? '')
  const [equippedTitle, setEquippedTitle] = useState(initial.equippedTitle ?? '')
  const [profilePublic, setProfilePublic] = useState(initial.profilePublic)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [saved,         setSaved]         = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/game/profile', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        bio:           bio.trim() || null,
        equippedTitle: equippedTitle || null,
        profilePublic,
      }),
    })

    const data = await res.json() as { error?: string }
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to save.')
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
    onSaved?.()
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
      <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Edit Profile</h3>

      {/* Bio */}
      <div className="space-y-1.5">
        <label className="text-xs text-gray-400 block">Bio <span className="text-gray-600">({bio.length}/200)</span></label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 200))}
          placeholder="Tell other operators about yourself..."
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-zinc-500"
        />
      </div>

      {/* Equipped title */}
      <div className="space-y-1.5">
        <label className="text-xs text-gray-400 block">Equipped Title</label>
        {initial.titles.length === 0 ? (
          <p className="text-xs text-gray-600 italic">No titles earned yet. Complete missions or Codex collections to earn titles.</p>
        ) : (
          <select
            value={equippedTitle}
            onChange={(e) => setEquippedTitle(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="">— No title —</option>
            {initial.titles.map((t) => (
              <option key={t.id} value={t.title}>
                {t.title} ({SOURCE_LABEL[t.source] ?? t.source})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Profile visibility */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Public profile</p>
          <p className="text-xs text-gray-500 mt-0.5">Other players can view your profile page</p>
        </div>
        <button
          onClick={() => setProfilePublic((v) => !v)}
          className={`relative w-11 h-6 rounded-full transition-colors ${profilePublic ? 'bg-blue-600' : 'bg-zinc-700'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${profilePublic ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>

      {/* Error / feedback */}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
