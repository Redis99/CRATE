'use client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileStats = {
  crateMinedTotal:   number
  robotCount:        number
  currentFleetER:    number
  minigameWins:      number
  missionsCompleted: number
  codexEntries:      number
  memberSince:       string
}

export type ProfileData = {
  username:      string
  avatarUrl:     string | null
  bio:           string | null
  equippedTitle: string | null
  memberSince?:  string
}

type Props = {
  profile: ProfileData
  stats:   ProfileStats
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-green-600',
  'bg-orange-600', 'bg-red-600', 'bg-teal-600',
]

function avatarColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ username, url }: { username: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={username}
        className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
      />
    )
  }
  const initials = username.slice(0, 2).toUpperCase()
  return (
    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white border-2 border-zinc-700 ${avatarColor(username)}`}>
      {initials}
    </div>
  )
}

// ─── Stat item ────────────────────────────────────────────────────────────────

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-zinc-800 rounded-lg p-3 flex flex-col gap-1">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-white font-semibold text-sm">{value}</span>
    </div>
  )
}

// ─── ProfileCard ──────────────────────────────────────────────────────────────

export function ProfileCard({ profile, stats }: Props) {
  const joined = new Date(stats.memberSince).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long',
  })

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar username={profile.username} url={profile.avatarUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-white truncate">{profile.username}</h2>
            {profile.equippedTitle && (
              <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 rounded-full font-medium">
                {profile.equippedTitle}
              </span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-1">Member since {joined}</p>
          {profile.bio && (
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div>
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Stats</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <StatItem
            label="CRATE mined"
            value={stats.crateMinedTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          />
          <StatItem label="Fleet size"    value={stats.robotCount} />
          <StatItem label="Fleet ER"      value={`${stats.currentFleetER} ER`} />
          <StatItem label="Minigame wins" value={stats.minigameWins} />
          <StatItem label="Missions done" value={stats.missionsCompleted} />
          <StatItem label="Codex entries" value={stats.codexEntries} />
        </div>
      </div>
    </div>
  )
}
