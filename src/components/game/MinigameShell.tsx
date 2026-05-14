'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { GameType, GameControls } from '@/lib/minigame-config'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GameResult {
  won:   boolean
  score: number
}

interface StartData {
  difficulty:   number
  winTarget:    number
  winLabel:     string
  timeLimitSec: number
  controls?:    GameControls
}

interface CompleteData {
  won:           boolean
  score:         number
  winTarget:     number
  difficulty:    number
  cooldownMs:    number
  sessionId:     string | null
  erBoost:       number | null
  drop:          { dropType: string; rarity?: string; partType?: string; kitValue?: number; label?: string } | null
}

interface MinigameShellProps {
  gameType:    GameType
  label:       string
  children: (props: {
    difficulty:   number
    winTarget:    number
    timeLimitSec: number
    running:      boolean
    onResult:     (result: GameResult) => void
  }) => React.ReactNode
}

// ─── Timer Bar ────────────────────────────────────────────────────────────────

function TimerBar({ seconds, total }: { seconds: number; total: number }) {
  const pct  = Math.max(0, (seconds / total) * 100)
  const color = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-mono font-bold w-8 text-right ${
        pct <= 25 ? 'text-red-400' : 'text-gray-300'
      }`}>{seconds}s</span>
    </div>
  )
}

// ─── Ad Slot (placeholder) ────────────────────────────────────────────────────

function AdSlot({ position }: { position: 'top' | 'bottom' | 'left' | 'right' }) {
  const isHorizontal = position === 'top' || position === 'bottom'
  return (
    <div className={`flex items-center justify-center bg-gray-900/30 border border-gray-800/20 rounded text-gray-800 text-xs font-mono ${
      isHorizontal ? 'w-full h-14' : 'h-full w-28 shrink-0'
    }`}>
      AD {position.toUpperCase()}
    </div>
  )
}

// ─── Result Overlay ───────────────────────────────────────────────────────────

function ResultOverlay({ result, onClaim, onBack }: {
  result:  CompleteData
  onClaim: () => Promise<void>
  onBack:  () => void
}) {
  const [claiming, setClaiming] = useState(false)
  const [claimed,  setClaimed]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleClaim() {
    setClaiming(true); setError('')
    try {
      await onClaim()
      setClaimed(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to claim reward.')
    } finally {
      setClaiming(false)
    }
  }

  if (result.won) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
        <div className="bg-[#111118] border border-green-700/40 rounded-2xl p-8 w-full max-w-sm mx-4 text-center shadow-2xl">
          <div className="text-4xl mb-3">🏆</div>
          <h3 className="text-green-400 text-xl font-bold mb-1">Victory!</h3>
          <p className="text-gray-400 text-sm mb-5">
            Score: <span className="text-white font-mono font-bold">{result.score}</span>
            <span className="text-gray-600 mx-2">/</span>
            <span className="text-gray-400">{result.winTarget} needed</span>
          </p>

          {!claimed ? (
            <>
              {/* Preview das recompensas */}
              <div className="space-y-2 mb-5 text-left">
                {result.erBoost && (
                  <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                    <span className="text-orange-400 text-lg">⚡</span>
                    <div>
                      <p className="text-orange-300 text-sm font-medium">+{result.erBoost.toFixed(1)} ER Boost</p>
                      <p className="text-gray-600 text-xs">Temporary extraction rate boost</p>
                    </div>
                  </div>
                )}
                {result.drop ? (
                  <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
                    <span className="text-indigo-400 text-lg">📦</span>
                    <div>
                      <p className="text-indigo-300 text-sm font-medium">
                        {result.drop.dropType === 'part'
                          ? `${result.drop.rarity} Part — ${result.drop.partType}`
                          : result.drop.label}
                      </p>
                      <p className="text-gray-600 text-xs">Item drop</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-800/40 rounded-lg px-3 py-2">
                    <span className="text-gray-600 text-lg">📦</span>
                    <p className="text-gray-600 text-xs">No item drop this time</p>
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium text-sm transition-colors mb-2"
              >
                {claiming ? 'Claiming...' : '✓ Claim Reward'}
              </button>
              <button onClick={onBack} className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors">
                Skip & Back to Games
              </button>
            </>
          ) : (
            <>
              <p className="text-green-400 text-sm mb-5">Rewards added to your inventory!</p>
              <button
                onClick={onBack}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors"
              >
                Back to Games
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Derrota
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
      <div className="bg-[#111118] border border-red-700/40 rounded-2xl p-8 w-full max-w-sm mx-4 text-center shadow-2xl">
        <div className="text-4xl mb-3">💀</div>
        <h3 className="text-red-400 text-xl font-bold mb-1">Defeated</h3>
        <p className="text-gray-500 text-sm mb-2">
          Score: <span className="text-white font-mono">{result.score}</span>
          <span className="text-gray-600 mx-2">/</span>
          <span className="text-gray-400">{result.winTarget} needed</span>
        </p>
        <p className="text-gray-600 text-xs mb-6">No rewards for defeat. Try again!</p>
        <button
          onClick={onBack}
          className="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-medium text-sm transition-colors"
        >
          Back to Games
        </button>
      </div>
    </div>
  )
}

// ─── Main Shell ───────────────────────────────────────────────────────────────

export function MinigameShell({ gameType, label, children }: MinigameShellProps) {
  const [phase,      setPhase]      = useState<'loading' | 'ready' | 'playing' | 'result'>('loading')
  const [startData,  setStartData]  = useState<StartData | null>(null)
  const [result,     setResult]     = useState<CompleteData | null>(null)
  const [timeLeft,   setTimeLeft]   = useState(0)
  const [error,      setError]      = useState('')
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionTokenRef = useRef<string>('')  // token server-side do /start

  // Busca dados iniciais do jogo
  const loadGame = useCallback(async () => {
    try {
      const res  = await fetch('/api/game/minigames/start', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameType }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Could not start game.')
        return
      }
      setStartData(json)
      setTimeLeft(json.timeLimitSec)
      sessionTokenRef.current = json.sessionToken ?? ''
      setPhase('ready')
    } catch (e) {
      setError('Failed to connect. Please try again.')
    }
  }, [gameType])

  useEffect(() => { loadGame() }, [loadGame])

  // Inicia o timer quando o jogo começa
  function startTimer(totalSec: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }

  function handleStartPlaying() {
    setPhase('playing')
    if (startData) startTimer(startData.timeLimitSec)
  }

  // Timer chegou a 0 = derrota automática (o jogo deve chamar onResult)
  // O game component é responsável por detectar timeLeft === 0

  // useCallback com deps estáveis para não recriar a referência a cada render
  const handleResult = useCallback(async (gameResult: GameResult) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('result')
    try {
      const res  = await fetch('/api/game/minigames/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType,
          won:          gameResult.won,
          score:        gameResult.score,
          sessionToken: sessionTokenRef.current,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to submit result.')
        return
      }
      setResult(json)
    } catch {
      setError('Failed to connect. Please try again.')
    }
  }, [gameType])  // gameType é prop estável; setters do useState nunca mudam

  async function handleClaim() {
    if (!result?.sessionId) throw new Error('No session to claim.')
    const res = await fetch('/api/game/minigames/claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: result.sessionId }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Claim failed.')
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/minigames" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
          ← Back to Minigames
        </Link>
      </div>
    )
  }

  if (phase === 'loading' || !startData) {
    return <div className="text-gray-500 text-sm py-8 text-center">Loading {label}...</div>
  }

  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto">
      {/* Anúncio topo */}
      <AdSlot position="top" />

      {/* Header do jogo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/minigames" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← Games</Link>
          <span className="text-gray-700">|</span>
          <h2 className="text-white font-semibold">{label}</h2>
          <span className="text-xs px-2 py-0.5 rounded border border-gray-700 text-gray-500">
            Lv {startData.difficulty}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Target: <span className="text-gray-300">{startData.winTarget} {startData.winLabel}</span>
        </div>
      </div>

      {/* Layout lateral com anúncios */}
      <div className="flex gap-3 items-start">
        {/* Anúncio esquerda — oculto em mobile */}
        <div className="hidden md:flex">
          <AdSlot position="left" />
        </div>

        {/* Game area */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Timer */}
          {phase === 'playing' && (
            <TimerBar seconds={timeLeft} total={startData.timeLimitSec} />
          )}

          {/* Canvas area — max-height para não vazar em telas baixas */}
          <div className="relative bg-[#0a0a12] border border-gray-800/60 rounded-xl overflow-hidden"
               style={{ aspectRatio: '4/3', maxHeight: 'calc(100vh - 210px)' }}>
            {/* Overlay de instruções / início */}
            {phase === 'ready' && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                <div className="w-full max-w-sm">
                  {/* Título e objetivo */}
                  <h2 className="text-white text-xl font-bold text-center mb-1">{label}</h2>
                  <p className="text-gray-400 text-sm text-center mb-4">
                    Reach <span className="text-white font-mono font-bold">{startData.winTarget}</span> {startData.winLabel} in <span className="text-white font-bold">{startData.timeLimitSec}s</span>
                  </p>

                  {/* Controles */}
                  {startData.controls && (
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      {/* Teclado */}
                      <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                            <rect x="2" y="6" width="20" height="12" rx="2"/>
                            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
                          </svg>
                          <p className="text-gray-400 text-xs font-medium">Keyboard</p>
                        </div>
                        <div className="space-y-1.5">
                          {startData.controls.keyboard.map((c, i) => (
                            <div key={i} className="flex items-start justify-between gap-2">
                              <span className="text-indigo-300 text-xs font-mono leading-tight">{c.input}</span>
                              <span className="text-gray-500 text-xs text-right leading-tight">{c.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <svg width="11" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                            <rect x="5" y="2" width="14" height="20" rx="2"/>
                            <circle cx="12" cy="18" r="1" fill="currentColor"/>
                          </svg>
                          <p className="text-gray-400 text-xs font-medium">Mobile</p>
                        </div>
                        <div className="space-y-1.5">
                          {startData.controls.mobile.map((c, i) => (
                            <div key={i} className="flex items-start justify-between gap-2">
                              <span className="text-indigo-300 text-xs font-mono leading-tight">{c.input}</span>
                              <span className="text-gray-500 text-xs text-right leading-tight">{c.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleStartPlaying}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors"
                  >
                    Start Game
                  </button>
                </div>
              </div>
            )}

            {/* Result overlay */}
            {phase === 'result' && result && (
              <ResultOverlay
                result={result}
                onClaim={handleClaim}
                onBack={() => window.location.href = '/minigames'}
              />
            )}

            {/* O jogo em si */}
            {children({
              difficulty:   startData.difficulty,
              winTarget:    startData.winTarget,
              timeLimitSec: startData.timeLimitSec,
              running:      phase === 'playing',
              onResult:     handleResult,
            })}
          </div>
        </div>

        {/* Anúncio direita — oculto em mobile */}
        <div className="hidden md:flex">
          <AdSlot position="right" />
        </div>
      </div>

      {/* Anúncio rodapé */}
      <AdSlot position="bottom" />
    </div>
  )
}
