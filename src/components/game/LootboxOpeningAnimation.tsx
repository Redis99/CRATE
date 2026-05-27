'use client'

import { useState, useEffect, useRef } from 'react'
import type { DropResultType } from '@/lib/lootbox'
import { dropRarity } from './LootboxDropModal'

// ─── Rarity config ────────────────────────────────────────────────────────────

const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON']

const RARITY_COLORS: Record<string, { glow: string; beam: string; particle: string; label: string }> = {
  LEGENDARY: { glow: '#facc15', beam: '#fef08a', particle: '#fde68a', label: '✦ LEGENDARY DROP!' },
  EPIC:      { glow: '#c084fc', beam: '#e9d5ff', particle: '#d8b4fe', label: '✦ EPIC DROP!'      },
  RARE:      { glow: '#60a5fa', beam: '#bfdbfe', particle: '#93c5fd', label: 'RARE DROP'         },
  UNCOMMON:  { glow: '#4ade80', beam: '#bbf7d0', particle: '#86efac', label: 'Uncommon drop'     },
  COMMON:    { glow: '#9ca3af', beam: '#e5e7eb', particle: '#d1d5db', label: 'Common drop'       },
}

function getBestRarity(drops: DropResultType[]): string {
  for (const r of RARITY_ORDER) {
    if (drops.some((d) => dropRarity(d) === r)) return r
  }
  return 'COMMON'
}

// ─── Particle helpers ─────────────────────────────────────────────────────────

interface Particle {
  id: number; x: number; y: number
  size: number; duration: number; delay: number
  color: string; shape: 'circle' | 'diamond'
}

function generateParticles(color: string, count = 18): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + (Math.random() - 0.5) * 20
    const dist  = 70 + Math.random() * 100
    const rad   = (angle * Math.PI) / 180
    return {
      id: i,
      x: Math.cos(rad) * dist,
      y: Math.sin(rad) * dist - 20,
      size:     2.5 + Math.random() * 4,
      duration: 600 + Math.random() * 400,
      delay:    Math.random() * 150,
      color,
      shape: Math.random() > 0.5 ? 'circle' : 'diamond',
    }
  })
}

// ─── Animation phases ─────────────────────────────────────────────────────────
// falling  → crate drops with bounce           (0–700 ms)
// waiting  → crate floats, shakes, waits       (700 ms …)
// opening  → lid flies off, beam shoots up     (when drops arrive +600 ms)
// bursting → glow expands, particles scatter   (+600–1300 ms)
// done     → onReveal fired                    (+1300 ms)

type Phase = 'falling' | 'waiting' | 'opening' | 'bursting' | 'done'

// ─── Props ────────────────────────────────────────────────────────────────────

interface LootboxOpeningAnimationProps {
  drops: DropResultType[] | null  // null while API is loading
  onReveal: (drops: DropResultType[]) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LootboxOpeningAnimation({ drops, onReveal }: LootboxOpeningAnimationProps) {
  const [phase, setPhase]           = useState<Phase>('falling')
  const [particles, setParticles]   = useState<Particle[]>([])
  const [glowOpacity, setGlowOpacity] = useState(0)

  // ── Refs ─────────────────────────────────────────────────────────────────────
  // Always point to latest onReveal so stale closures never misfire
  const onRevealRef    = useRef(onReveal)
  onRevealRef.current  = onReveal

  // Guard: opening sequence must only start once
  const openingStarted = useRef(false)

  // Persistent timeout store — cleared only on unmount (not on re-render)
  const timeoutsRef    = useRef<ReturnType<typeof setTimeout>[]>([])

  // ── Phase 1: fall → waiting (700 ms) ─────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setPhase('waiting'), 700)
    return () => clearTimeout(t)
  }, [])

  // ── Phase 2+: open when drops arrive ─────────────────────────────────────────
  // This effect watches for the combination (waiting phase + drops available).
  // openingStarted ref prevents re-entry if the effect re-fires.
  // Timeouts are stored in timeoutsRef so cleanup does NOT cancel them on re-render.
  useEffect(() => {
    if (drops === null)          return  // API still loading
    if (phase === 'falling')     return  // wait for settled state
    if (phase !== 'waiting')     return  // already past this point
    if (openingStarted.current)  return  // guard against double-fire

    openingStarted.current = true
    setPhase('opening')

    // Snapshot values for closures — drops will not change after this point
    const bestRarity   = getBestRarity(drops)
    const colors       = RARITY_COLORS[bestRarity] ?? RARITY_COLORS.COMMON
    const dropsCapture = drops

    // t1: lid has flown off — show burst
    const t1 = setTimeout(() => {
      setParticles(generateParticles(colors.particle))
      setGlowOpacity(1)
      setPhase('bursting')
    }, 600)

    // t2: animation done — hand off to drop modal
    const t2 = setTimeout(() => {
      setPhase('done')
      onRevealRef.current(dropsCapture)
    }, 1300)

    // Store in ref — cleaned up on unmount only
    timeoutsRef.current.push(t1, t2)
  }, [drops, phase])  // re-runs if drops arrives late (after waiting starts)

  // ── Unmount cleanup only ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => { timeoutsRef.current.forEach(clearTimeout) }
  }, [])

  // ── Derived visual state ──────────────────────────────────────────────────────
  const bestRarity  = drops ? getBestRarity(drops) : 'COMMON'
  const colors      = RARITY_COLORS[bestRarity] ?? RARITY_COLORS.COMMON
  const isSpecial   = bestRarity === 'LEGENDARY' || bestRarity === 'EPIC'
  const lidOpen     = phase === 'opening' || phase === 'bursting' || phase === 'done'
  const beamVisible = phase === 'opening' || phase === 'bursting'
  const burst       = phase === 'bursting'

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── CSS keyframes ──────────────────────────── */}
      <style>{`
        @keyframes _crateFall {
          0%   { transform: translateY(-220px); opacity: 0; }
          60%  { opacity: 1; }
          78%  { transform: translateY(12px); }
          90%  { transform: translateY(-6px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes _crateShake {
          0%,100% { transform: rotate(0deg) translateX(0); }
          15%     { transform: rotate(-2.5deg) translateX(-3px); }
          30%     { transform: rotate(2.5deg) translateX(3px); }
          45%     { transform: rotate(-2deg) translateX(-2px); }
          60%     { transform: rotate(2deg) translateX(2px); }
          75%     { transform: rotate(-1deg) translateX(-1px); }
        }
        @keyframes _lidFly {
          0%   { transform: rotateX(0deg) translateY(0); opacity: 1; }
          60%  { transform: rotateX(-80deg) translateY(-20px); opacity: 1; }
          100% { transform: rotateX(-135deg) translateY(-60px); opacity: 0; }
        }
        @keyframes _beamRise {
          0%   { transform: scaleY(0); opacity: 0; }
          30%  { opacity: 1; }
          100% { transform: scaleY(1); opacity: 0.75; }
        }
        @keyframes _glowPulse {
          0%,100% { opacity: 0.35; transform: scale(1); }
          50%     { opacity: 0.75; transform: scale(1.08); }
        }
        @keyframes _burstExpand {
          0%   { transform: scale(0.1); opacity: 0.9; }
          100% { transform: scale(6);   opacity: 0; }
        }
        @keyframes _particleFly {
          0%   { opacity: 1; transform: translate(0,0) scale(1) rotate(0deg); }
          80%  { opacity: 0.5; }
          100% { opacity: 0;   transform: translate(var(--px),var(--py)) scale(0.2) rotate(180deg); }
        }
        @keyframes _screenFlash {
          0%   { opacity: 0; }
          20%  { opacity: 0.18; }
          100% { opacity: 0; }
        }
        @keyframes _labelIn {
          0%   { opacity: 0; transform: translateY(8px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes _floatCrate {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-5px); }
        }
      `}</style>

      {/* ── Full-screen overlay ───────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.88)' }}
      >
        {/* Screen flash on burst */}
        {burst && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${colors.glow}40, transparent 60%)`,
              animation: '_screenFlash 0.9s ease-out forwards',
            }}
          />
        )}

        {/* Expanding ring */}
        {burst && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: 200, height: 200,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${colors.glow}50 0%, ${colors.glow}10 50%, transparent 70%)`,
              animation: '_burstExpand 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              opacity: glowOpacity,
            }}
          />
        )}

        {/* ── Crate group ─────────────────────────── */}
        <div
          style={{
            position: 'relative',
            width: 160, height: 200,
            animation: phase === 'falling'
              ? '_crateFall 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards'
              : phase === 'waiting'
              ? '_floatCrate 2.4s ease-in-out infinite'
              : undefined,
          }}
        >
          {/* Light beam */}
          {beamVisible && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 70,
                width: 28,
                height: 220,
                background: `linear-gradient(to top, ${colors.beam}cc 0%, ${colors.beam}33 60%, transparent 100%)`,
                clipPath: 'polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)',
                animation: '_beamRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                transformOrigin: 'bottom center',
                transform: 'translateX(-50%)',
                filter: `blur(2px) drop-shadow(0 0 8px ${colors.beam})`,
              }}
            />
          )}

          {/* ── Lid ───────────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 68,
              transformOrigin: 'bottom center',
              perspective: 400,
              animation: lidOpen ? '_lidFly 0.55s cubic-bezier(0.4, 0, 0.2, 1) forwards' : undefined,
              zIndex: 3,
            }}
          >
            <svg viewBox="0 0 160 68" width="160" height="68" style={{ display: 'block', overflow: 'visible' }}>
              <rect x="4" y="10" width="152" height="52" rx="4"
                fill="#12121e" stroke="rgba(99,102,241,0.55)" strokeWidth="1.5" />
              <rect x="4" y="10" width="152" height="10" rx="4"
                fill="rgba(99,102,241,0.15)" />
              <line x1="54" y1="10" x2="54" y2="62" stroke="rgba(99,102,241,0.22)" strokeWidth="1" />
              <line x1="106" y1="10" x2="106" y2="62" stroke="rgba(99,102,241,0.22)" strokeWidth="1" />
              <rect x="2"  y="8"  width="10" height="10" rx="1" fill="rgba(99,102,241,0.35)" />
              <rect x="148" y="8"  width="10" height="10" rx="1" fill="rgba(99,102,241,0.35)" />
              <rect x="2"  y="54" width="10" height="10" rx="1" fill="rgba(99,102,241,0.35)" />
              <rect x="148" y="54" width="10" height="10" rx="1" fill="rgba(99,102,241,0.35)" />
              {/* Handle */}
              <rect x="65" y="3" width="30" height="10" rx="5"
                fill="#12121e" stroke="rgba(99,102,241,0.6)" strokeWidth="1.5" />
              <circle cx="80" cy="8" r="2" fill="rgba(99,102,241,0.8)" />
            </svg>
          </div>

          {/* ── Body ──────────────────────────────── */}
          <div
            style={{
              position: 'absolute',
              top: 60, left: 0, right: 0, bottom: 0,
              zIndex: 2,
              animation: phase === 'waiting' ? '_crateShake 0.7s ease-in-out infinite' : undefined,
            }}
          >
            {/* Inner glow (breathes while waiting) */}
            {(phase === 'waiting' || phase === 'opening') && (
              <div
                style={{
                  position: 'absolute',
                  top: 0, left: 10, right: 10,
                  height: 20,
                  background: `radial-gradient(ellipse at center, ${colors.glow}60 0%, transparent 70%)`,
                  animation: '_glowPulse 1.4s ease-in-out infinite',
                }}
              />
            )}

            <svg viewBox="0 0 160 132" width="160" height="132" style={{ display: 'block', overflow: 'visible' }}>
              <rect x="4" y="2" width="152" height="126" rx="4"
                fill="#0e0e1a" stroke="rgba(99,102,241,0.50)" strokeWidth="1.5" />
              <line x1="4" y1="44"  x2="156" y2="44"  stroke="rgba(99,102,241,0.20)" strokeWidth="1" />
              <line x1="4" y1="86"  x2="156" y2="86"  stroke="rgba(99,102,241,0.20)" strokeWidth="1" />
              <line x1="54"  y1="2" x2="54"  y2="128" stroke="rgba(99,102,241,0.20)" strokeWidth="1" />
              <line x1="106" y1="2" x2="106" y2="128" stroke="rgba(99,102,241,0.20)" strokeWidth="1" />
              <rect x="2"   y="0"   width="12" height="12" rx="1" fill="rgba(99,102,241,0.30)" />
              <rect x="146" y="0"   width="12" height="12" rx="1" fill="rgba(99,102,241,0.30)" />
              <rect x="2"   y="118" width="12" height="12" rx="1" fill="rgba(99,102,241,0.30)" />
              <rect x="146" y="118" width="12" height="12" rx="1" fill="rgba(99,102,241,0.30)" />
              <rect x="4" y="60" width="152" height="6" rx="1"
                fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.25)" strokeWidth="0.5" />
              {/* Center seal */}
              <circle cx="80" cy="65" r="14" fill="#0c0c18" stroke="rgba(99,102,241,0.50)" strokeWidth="1.5" />
              <circle cx="80" cy="65" r="8"  fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.40)" strokeWidth="1" />
              <circle cx="80" cy="62" r="3"  fill="rgba(99,102,241,0.70)" />
              <rect x="78" y="64" width="4" height="5" rx="1" fill="rgba(99,102,241,0.70)" />
              {/* Top glow seam */}
              <line x1="4" y1="3" x2="156" y2="3" stroke="rgba(99,102,241,0.55)" strokeWidth="1.5" />
            </svg>
          </div>

          {/* ── Particles ─────────────────────────── */}
          {particles.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                width: p.size, height: p.size,
                borderRadius: p.shape === 'circle' ? '50%' : '2px',
                background: p.color,
                transform: 'rotate(45deg)',
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                ['--px' as string]: `${p.x}px`,
                ['--py' as string]: `${p.y}px`,
                animation: `_particleFly ${p.duration}ms ease-out ${p.delay}ms forwards`,
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          ))}
        </div>

        {/* ── Status label ────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: '20%',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {phase === 'falling' && (
            <p className="text-gray-600 text-sm tracking-widest uppercase animate-pulse">
              Opening…
            </p>
          )}

          {phase === 'waiting' && (
            <p
              className="text-sm tracking-widest uppercase"
              style={{
                color: 'rgba(99,102,241,0.6)',
                animation: '_glowPulse 1.2s ease-in-out infinite',
              }}
            >
              {drops ? 'Ready…' : 'Searching…'}
            </p>
          )}

          {(phase === 'opening' || phase === 'bursting') && drops && (
            <div style={{ animation: '_labelIn 0.3s ease-out forwards' }}>
              <p
                className={`text-lg font-bold tracking-widest uppercase ${
                  bestRarity === 'LEGENDARY' ? 'text-legendary' :
                  bestRarity === 'EPIC'      ? 'text-purple-300' : ''
                }`}
                style={
                  bestRarity !== 'LEGENDARY' && bestRarity !== 'EPIC'
                    ? { color: colors.glow }
                    : undefined
                }
              >
                {colors.label}
              </p>
              {isSpecial && (
                <p className="text-xs mt-1 tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {drops.length} item{drops.length !== 1 ? 's' : ''} received
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
