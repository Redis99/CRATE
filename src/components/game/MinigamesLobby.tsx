'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameStatus {
  gameType:        string
  label:           string
  description:     string
  reference:       string
  slug:            string
  timeLimitSec:    number
  dropChance:      number
  difficulty:      number
  winTarget:       number
  winLabel:        string
  cooldownMs:      number
  nextPlayableAt:  string | null
  gamesPlayedToday: number
  dailyWins:       number
}

interface ActiveBoost {
  erFlat:     number
  expiresAt:  string
  totalWins:  number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCooldown(ms: number): string {
  if (ms <= 0) return ''
  const s = Math.ceil(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r > 0 ? `${m}m ${r}s` : `${m}m`
}

function formatTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'text-green-400 border-green-700/40',
  2: 'text-yellow-400 border-yellow-700/40',
  3: 'text-orange-400 border-orange-700/40',
  4: 'text-red-400 border-red-700/40',
}

const GAME_ICONS: Record<string, string> = {
  SPACE_DRIFT:  '🚀',
  BLOCK_FALL:   '🧱',
  SERPENTINE:   '🐍',
  ORBITAL_JUMP: '🪐',
  SPACE_FROG:   '🐸',
}

// ─── Boost Banner ─────────────────────────────────────────────────────────────

function BoostBanner({ boost }: { boost: ActiveBoost }) {
  const [timeLeft, setTimeLeft] = useState(formatTimeLeft(boost.expiresAt))

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(formatTimeLeft(boost.expiresAt)), 30_000)
    return () => clearInterval(id)
  }, [boost.expiresAt])

  return (
    <div className="mb-6 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="text-orange-400 shrink-0">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      <div className="flex-1">
        <p className="text-orange-400 text-sm font-medium">
          Active ER Boost: <span className="font-bold">+{boost.erFlat.toFixed(1)} ER</span>
        </p>
        <p className="text-orange-300/60 text-xs mt-0.5">
          Expires in {timeLeft} · {boost.totalWins} lifetime wins
        </p>
      </div>
    </div>
  )
}

// ─── Game Card ────────────────────────────────────────────────────────────────

function GameCard({ game, now }: { game: GameStatus; now: number }) {
  const [cooldown, setCooldown] = useState(
    game.nextPlayableAt ? Math.max(0, new Date(game.nextPlayableAt).getTime() - now) : 0
  )

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const canPlay  = cooldown <= 0
  const diffColor = DIFFICULTY_COLORS[game.difficulty] ?? DIFFICULTY_COLORS[1]
  const icon     = GAME_ICONS[game.gameType] ?? '🎮'

  return (
    <div className={`bg-[#111118] border rounded-xl p-5 flex flex-col gap-3 transition-all ${
      canPlay ? 'border-gray-800/60 hover:border-indigo-700/40' : 'border-gray-800/40 opacity-70'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-white font-semibold text-sm">{game.label}</p>
            <p className="text-gray-500 text-xs">{game.reference}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${diffColor}`}>
          Lv {game.difficulty}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-400 text-xs leading-relaxed">{game.description}</p>

      {/* Stats row */}
      <div className="flex gap-3 text-xs">
        <div className="flex-1 bg-[#0d0d15] rounded-lg px-2.5 py-2">
          <p className="text-gray-600 mb-0.5">Win target</p>
          <p className="text-white font-mono font-medium">{game.winTarget} <span className="text-gray-500">{game.winLabel}</span></p>
        </div>
        <div className="flex-1 bg-[#0d0d15] rounded-lg px-2.5 py-2">
          <p className="text-gray-600 mb-0.5">Item drop</p>
          <p className="text-white font-mono font-medium">{(game.dropChance * 100).toFixed(0)}%</p>
        </div>
        <div className="flex-1 bg-[#0d0d15] rounded-lg px-2.5 py-2">
          <p className="text-gray-600 mb-0.5">Time limit</p>
          <p className="text-white font-mono font-medium">{game.timeLimitSec}s</p>
        </div>
      </div>

      {/* Daily progress */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>Today: <span className="text-gray-400">{game.dailyWins} wins · {game.gamesPlayedToday} played</span></span>
      </div>

      {/* Action — mt-auto garante botão sempre no fundo do card */}
      <div className="mt-auto">
      {canPlay ? (
        <Link
          href={`/minigames/${game.slug}`}
          className="block w-full text-center py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          Play →
        </Link>
      ) : (
        <div className="w-full py-2 rounded-lg bg-gray-800/60 text-gray-500 text-sm text-center">
          Cooldown: {formatCooldown(cooldown)}
        </div>
      )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MinigamesLobby() {
  const [games, setGames]     = useState<GameStatus[]>([])
  const [boost, setBoost]     = useState<ActiveBoost | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow]         = useState(Date.now())

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/minigames')
    if (res.ok) {
      const json = await res.json()
      setGames(json.games)
      setBoost(json.activeBoost)
    }
    setLoading(false)
    setNow(Date.now())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="text-gray-500 text-sm py-8">Loading minigames...</div>

  return (
    <div>
      {boost && <BoostBanner boost={boost} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <GameCard key={game.gameType} game={game} now={now} />
        ))}
      </div>

      {/* Info footer */}
      <div className="mt-6 bg-[#111118] border border-gray-800/40 rounded-xl px-4 py-3 text-xs text-gray-600 space-y-1">
        <p>🏆 <span className="text-gray-500">Win to earn ER boost (+5 flat, level 1) and a chance at item drops.</span></p>
        <p>⏱️ <span className="text-gray-500">Cooldown increases with each game played (resets every 24h).</span></p>
        <p>📈 <span className="text-gray-500">Difficulty increases every 3 daily wins — higher difficulty = bigger boost.</span></p>
      </div>
    </div>
  )
}
