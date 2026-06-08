'use client'

import { useState, useEffect, useRef } from 'react'
import type { DropResultType } from '@/lib/lootbox'
import { dropRarity } from './LootboxDropModal'

// ═══════════════════════════════════════════════════════════════════════════════
//  TEMPLATE SYSTEM
//  Each crate type registers a CrateTemplate.
//  The animation engine (glow, beam, particles, phases) is always the same.
//  Only the visual SVG of the lid + body changes.
// ═══════════════════════════════════════════════════════════════════════════════

export interface CrateTemplateProps {
  /** Rarity glow color — use it for the inner seal / lock element */
  glowColor: string
  /** True while the crate is waiting/opening — animate the inner light */
  innerGlowing: boolean
}

export interface CrateTemplate {
  /** Total canvas dimensions */
  width:  number
  height: number
  /** How tall the lid is (measured from the top of the canvas) */
  lidHeight: number
  /** SVG/JSX for the lid — this element will rotate/fly upward */
  renderLid:  (props: CrateTemplateProps) => React.ReactNode
  /** SVG/JSX for the body — stays in place, can show inner glow */
  renderBody: (props: CrateTemplateProps) => React.ReactNode
}

// ─── Default template (generic sci-fi crate) ──────────────────────────────────

const defaultTemplate: CrateTemplate = {
  width:     160,
  height:    200,
  lidHeight:  68,

  renderLid: () => (
    <svg viewBox="0 0 160 68" width="160" height="68"
      style={{ display: 'block', overflow: 'visible' }}>
      <rect x="4" y="10" width="152" height="52" rx="4"
        fill="#12121e" stroke="rgba(99,102,241,0.55)" strokeWidth="1.5" />
      <rect x="4" y="10" width="152" height="10" rx="4"
        fill="rgba(99,102,241,0.15)" />
      <line x1="54"  y1="10" x2="54"  y2="62" stroke="rgba(99,102,241,0.22)" strokeWidth="1" />
      <line x1="106" y1="10" x2="106" y2="62" stroke="rgba(99,102,241,0.22)" strokeWidth="1" />
      <rect x="2"   y="8"  width="10" height="10" rx="1" fill="rgba(99,102,241,0.35)" />
      <rect x="148" y="8"  width="10" height="10" rx="1" fill="rgba(99,102,241,0.35)" />
      <rect x="2"   y="54" width="10" height="10" rx="1" fill="rgba(99,102,241,0.35)" />
      <rect x="148" y="54" width="10" height="10" rx="1" fill="rgba(99,102,241,0.35)" />
      {/* Handle */}
      <rect x="65" y="3" width="30" height="10" rx="5"
        fill="#12121e" stroke="rgba(99,102,241,0.6)" strokeWidth="1.5" />
      <circle cx="80" cy="8" r="2" fill="rgba(99,102,241,0.8)" />
    </svg>
  ),

  renderBody: ({ glowColor, innerGlowing }) => (
    <svg viewBox="0 0 160 132" width="160" height="132"
      style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <radialGradient id="innerGlowGrad" cx="50%" cy="0%" r="70%">
          <stop offset="0%"   stopColor={glowColor} stopOpacity={innerGlowing ? 0.55 : 0} />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="4" y="2" width="152" height="126" rx="4"
        fill="#0e0e1a" stroke="rgba(99,102,241,0.50)" strokeWidth="1.5" />
      {/* Inner glow */}
      <rect x="4" y="2" width="152" height="60" rx="4"
        fill="url(#innerGlowGrad)"
        style={{ transition: 'opacity 0.4s' }} />
      {/* Planks */}
      <line x1="4"   y1="44"  x2="156" y2="44"  stroke="rgba(99,102,241,0.20)" strokeWidth="1" />
      <line x1="4"   y1="86"  x2="156" y2="86"  stroke="rgba(99,102,241,0.20)" strokeWidth="1" />
      <line x1="54"  y1="2"   x2="54"  y2="128" stroke="rgba(99,102,241,0.20)" strokeWidth="1" />
      <line x1="106" y1="2"   x2="106" y2="128" stroke="rgba(99,102,241,0.20)" strokeWidth="1" />
      {/* Corner brackets */}
      <rect x="2"   y="0"   width="12" height="12" rx="1" fill="rgba(99,102,241,0.30)" />
      <rect x="146" y="0"   width="12" height="12" rx="1" fill="rgba(99,102,241,0.30)" />
      <rect x="2"   y="118" width="12" height="12" rx="1" fill="rgba(99,102,241,0.30)" />
      <rect x="146" y="118" width="12" height="12" rx="1" fill="rgba(99,102,241,0.30)" />
      {/* Mid strip */}
      <rect x="4" y="60" width="152" height="6" rx="1"
        fill="rgba(99,102,241,0.12)" stroke="rgba(99,102,241,0.25)" strokeWidth="0.5" />
      {/* Center seal */}
      <circle cx="80" cy="65" r="14" fill="#0c0c18" stroke="rgba(99,102,241,0.50)" strokeWidth="1.5" />
      <circle cx="80" cy="65" r="8"  fill="rgba(99,102,241,0.10)" stroke="rgba(99,102,241,0.40)" strokeWidth="1" />
      <circle cx="80" cy="62" r="3"  fill="rgba(99,102,241,0.70)" />
      <rect x="78" y="64" width="4" height="5" rx="1" fill="rgba(99,102,241,0.70)" />
      {/* Top seam glow */}
      <line x1="4" y1="3" x2="156" y2="3" stroke="rgba(99,102,241,0.55)" strokeWidth="1.5" />
    </svg>
  ),
}

// ─── Template registry ────────────────────────────────────────────────────────
// Add new templates here when user provides SVGs.
// Key must match the animationTemplate field in LootboxConfig.

export const CRATE_TEMPLATES: Record<string, CrateTemplate> = {
  default: defaultTemplate,
  // supply:  supplyTemplate,   ← add when user sends SVG
  // robot:   robotTemplate,
  // halloween: halloweenTemplate,
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RARITY COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON']

export const RARITY_ANIM_COLORS: Record<string, {
  glow:     string  // main color (glow, beam edge)
  beam:     string  // bright beam core
  particle: string  // particle dots
  label:    string  // text shown after opening
}> = {
  LEGENDARY: { glow: '#facc15', beam: '#fef9c3', particle: '#fde68a', label: '✦ LEGENDARY DROP!' },
  EPIC:      { glow: '#c084fc', beam: '#f3e8ff', particle: '#d8b4fe', label: '✦ EPIC DROP!'      },
  RARE:      { glow: '#60a5fa', beam: '#dbeafe', particle: '#93c5fd', label: 'RARE DROP'         },
  UNCOMMON:  { glow: '#4ade80', beam: '#dcfce7', particle: '#86efac', label: 'Uncommon drop'     },
  COMMON:    { glow: '#9ca3af', beam: '#f3f4f6', particle: '#d1d5db', label: 'Common drop'       },
}

function getBestRarity(drops: DropResultType[]): string {
  for (const r of RARITY_ORDER) {
    if (drops.some((d) => dropRarity(d) === r)) return r
  }
  return 'COMMON'
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PARTICLES
// ═══════════════════════════════════════════════════════════════════════════════

interface Particle {
  id: number; x: number; y: number
  size: number; duration: number; delay: number
  color: string; shape: 'circle' | 'diamond'
}

function generateParticles(color: string, count = 20): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + (Math.random() - 0.5) * 22
    const dist  = 80 + Math.random() * 110
    const rad   = (angle * Math.PI) / 180
    return {
      id: i,
      x: Math.cos(rad) * dist,
      y: Math.sin(rad) * dist - 30,
      size:     2.5 + Math.random() * 4.5,
      duration: 650 + Math.random() * 450,
      delay:    Math.random() * 180,
      color,
      shape: Math.random() > 0.5 ? 'circle' : 'diamond',
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANIMATION PHASES
//  falling  → crate enters from above with bounce      (0–700 ms)
//  waiting  → floats + shakes while API loads          (700 ms …)
//  opening  → lid flies off, beam expands              (+600 ms after API)
//  bursting → glow flood + particles scatter           (+600–1300 ms)
//  done     → onReveal() fired
// ═══════════════════════════════════════════════════════════════════════════════

type Phase = 'falling' | 'waiting' | 'opening' | 'bursting' | 'done'

// ═══════════════════════════════════════════════════════════════════════════════
//  PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface LootboxOpeningAnimationProps {
  drops:     DropResultType[] | null
  onReveal:  (drops: DropResultType[]) => void
  /** Key from CRATE_TEMPLATES — defaults to 'default' (used when no webpUrl is set) */
  template?: string
  /**
   * Admin-uploaded WebP/GIF of the crate falling + opening (LootboxConfig.openingWebpUrl).
   * When present, the engine plays this clip instead of the built-in SVG crate and
   * times the rarity glow/burst to it. When absent (null/undefined), the engine
   * falls back to the universal built-in animation — no asset required.
   */
  webpUrl?:   string | null
  /**
   * Moment (ms from clip start) at which the crate visually opens in the WebP —
   * the rarity-colored glow burst is synced to fire at max(revealMs, API response time).
   * Maps to LootboxConfig.openingRevealMs. Ignored in fallback (SVG) mode.
   */
  revealMs?:  number
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LootboxOpeningAnimation({
  drops,
  onReveal,
  template = 'default',
  webpUrl  = null,
  revealMs = 900,
}: LootboxOpeningAnimationProps) {
  const usingWebp = !!webpUrl

  const [phase, setPhase]           = useState<Phase>(usingWebp ? 'waiting' : 'falling')
  const [particles, setParticles]   = useState<Particle[]>([])
  const [glowOpacity, setGlowOpacity] = useState(0)

  const onRevealRef    = useRef(onReveal)
  onRevealRef.current  = onReveal
  const dropsRef       = useRef(drops)
  dropsRef.current     = drops
  const openingStarted = useRef(false)
  const timeoutsRef    = useRef<ReturnType<typeof setTimeout>[]>([])

  // Resolve template (only relevant for the built-in/fallback engine)
  const tpl = CRATE_TEMPLATES[template] ?? CRATE_TEMPLATES.default
  const { width, height, lidHeight } = tpl
  const bodyHeight = height - lidHeight

  // ─── SVG fallback engine: phase 1 — fall → waiting ───────────────────────────
  useEffect(() => {
    if (usingWebp) return
    const t = setTimeout(() => setPhase('waiting'), 700)
    return () => clearTimeout(t)
  }, [usingWebp])

  // ─── SVG fallback engine: phase 2+ — trigger opening when drops arrive ───────
  useEffect(() => {
    if (usingWebp)              return
    if (drops === null)         return
    if (phase === 'falling')    return
    if (phase !== 'waiting')    return
    if (openingStarted.current) return

    openingStarted.current = true
    setPhase('opening')

    const bestRarity   = getBestRarity(drops)
    const colors       = RARITY_ANIM_COLORS[bestRarity] ?? RARITY_ANIM_COLORS.COMMON
    const dropsCapture = drops

    const t1 = setTimeout(() => {
      setParticles(generateParticles(colors.particle))
      setGlowOpacity(1)
      setPhase('bursting')
    }, 600)

    const t2 = setTimeout(() => {
      setPhase('done')
      onRevealRef.current(dropsCapture)
    }, 1300)

    timeoutsRef.current.push(t1, t2)
  }, [usingWebp, drops, phase])

  // ─── WebP engine: glow burst synced to the clip's opening moment ─────────────
  // Fires at max(revealMs, time the API drops actually arrive) — the clip plays
  // on its own, we just time the colored overlay/reveal to it.
  useEffect(() => {
    if (!usingWebp)             return
    if (openingStarted.current) return
    openingStarted.current = true

    const fireBurst = () => {
      const d = dropsRef.current
      if (!d) {
        // API hasn't responded yet — keep waiting briefly without delaying past it
        const poll = setTimeout(fireBurst, 80)
        timeoutsRef.current.push(poll)
        return
      }
      const bestRarity = getBestRarity(d)
      const colors     = RARITY_ANIM_COLORS[bestRarity] ?? RARITY_ANIM_COLORS.COMMON
      setParticles(generateParticles(colors.particle))
      setGlowOpacity(1)
      setPhase('bursting')

      const t2 = setTimeout(() => {
        setPhase('done')
        onRevealRef.current(d)
      }, 650)
      timeoutsRef.current.push(t2)
    }

    const t1 = setTimeout(fireBurst, Math.max(0, revealMs))
    timeoutsRef.current.push(t1)
  }, [usingWebp, revealMs])

  useEffect(() => {
    return () => { timeoutsRef.current.forEach(clearTimeout) }
  }, [])

  // Derived state
  const bestRarity  = drops ? getBestRarity(drops) : 'COMMON'
  const colors      = RARITY_ANIM_COLORS[bestRarity] ?? RARITY_ANIM_COLORS.COMMON
  const isSpecial   = bestRarity === 'LEGENDARY' || bestRarity === 'EPIC'
  const lidOpen     = !usingWebp && (phase === 'opening' || phase === 'bursting' || phase === 'done')
  const beamVisible = phase === 'bursting' || (!usingWebp && phase === 'opening')
  const innerGlowing = !usingWebp && (phase === 'waiting' || phase === 'opening')
  const burst        = phase === 'bursting'

  const templateProps: CrateTemplateProps = {
    glowColor:   colors.glow,
    innerGlowing,
  }

  return (
    <>
      <style>{`
        @keyframes _crateFall {
          0%   { transform: translateY(-240px); opacity: 0; }
          60%  { opacity: 1; }
          78%  { transform: translateY(14px); }
          90%  { transform: translateY(-7px); }
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
          55%  { transform: rotateX(-75deg) translateY(-24px); opacity: 1; }
          100% { transform: rotateX(-140deg) translateY(-70px); opacity: 0; }
        }
        @keyframes _beamRise {
          0%   { transform: scaleY(0); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes _glowBreathe {
          0%,100% { opacity: 0.40; }
          50%     { opacity: 0.85; }
        }
        @keyframes _burstRing {
          0%   { transform: scale(0.1); opacity: 1; }
          100% { transform: scale(7);   opacity: 0; }
        }
        @keyframes _screenFlash {
          0%,100% { opacity: 0; }
          18%     { opacity: 0.22; }
        }
        @keyframes _particleFly {
          0%   { opacity: 1; transform: translate(0,0) scale(1) rotate(0deg); }
          75%  { opacity: 0.5; }
          100% { opacity: 0;   transform: translate(var(--px),var(--py)) scale(0.15) rotate(200deg); }
        }
        @keyframes _labelIn {
          0%   { opacity: 0; transform: translateY(10px) scale(0.90); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes _floatCrate {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-6px); }
        }
      `}</style>

      {/* ── Full-screen overlay ───────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        style={{ background: 'rgba(0,0,0,0.88)' }}
      >
        {/* Screen flash */}
        {burst && (
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 55%, ${colors.glow}35, transparent 65%)`,
              animation: '_screenFlash 1s ease-out forwards',
            }}
          />
        )}

        {/* Burst ring */}
        {burst && (
          <div className="absolute pointer-events-none"
            style={{
              width: 220, height: 220,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${colors.glow}55 0%, ${colors.glow}18 45%, transparent 70%)`,
              animation: '_burstRing 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              opacity: glowOpacity,
            }}
          />
        )}

        {/* ── Crate group ───────────────────────── */}
        <div style={{
          position: 'relative',
          width:  usingWebp ? 240 : width,
          height: usingWebp ? 240 : height,
          animation: usingWebp
            ? undefined // the clip itself carries the fall/open motion
            : phase === 'falling'
            ? '_crateFall 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards'
            : phase === 'waiting'
            ? '_floatCrate 2.5s ease-in-out infinite'
            : undefined,
        }}>

          {/* ── Beam (above the body, full width) ─── */}
          {beamVisible && (
            <>
              {/* Outer soft cone — full box width at base */}
              <div style={{
                position:  'absolute',
                bottom:    bodyHeight - 4,
                left:      '50%',
                transform: 'translateX(-50%)',
                width:     width + 20,
                height:    340,
                background: `linear-gradient(to top,
                  ${colors.glow}cc 0%,
                  ${colors.glow}77 12%,
                  ${colors.glow}33 35%,
                  transparent 75%)`,
                clipPath:  'polygon(8% 100%, 92% 100%, 170% 0%, -70% 0%)',
                filter:    'blur(14px)',
                transformOrigin: 'bottom center',
                animation: '_beamRise 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }} />

              {/* Inner crisp core — narrower, brighter */}
              <div style={{
                position:  'absolute',
                bottom:    bodyHeight - 4,
                left:      '50%',
                transform: 'translateX(-50%)',
                width:     width * 0.65,
                height:    280,
                background: `linear-gradient(to top,
                  ${colors.beam}ff 0%,
                  ${colors.beam}cc 10%,
                  ${colors.beam}55 40%,
                  transparent 80%)`,
                clipPath:  'polygon(18% 100%, 82% 100%, 130% 0%, -30% 0%)',
                filter:    'blur(4px)',
                transformOrigin: 'bottom center',
                animation: '_beamRise 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }} />
            </>
          )}

          {usingWebp ? (
            /* ── Admin-uploaded WebP/GIF clip ──────── */
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={webpUrl ?? undefined}
              alt=""
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
                zIndex: 2,
                filter: burst ? `drop-shadow(0 0 28px ${colors.glow}99)` : undefined,
                transition: 'filter 0.4s ease-out',
              }}
            />
          ) : (
            <>
              {/* ── Lid ──────────────────────────────── */}
              <div style={{
                position:        'absolute',
                top: 0, left: 0, right: 0,
                height:          lidHeight,
                transformOrigin: 'bottom center',
                perspective:     500,
                zIndex:          3,
                animation: lidOpen
                  ? '_lidFly 0.55s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                  : undefined,
              }}>
                {tpl.renderLid(templateProps)}
              </div>

              {/* ── Body ─────────────────────────────── */}
              <div style={{
                position: 'absolute',
                top:      lidHeight,
                left: 0, right: 0, bottom: 0,
                zIndex: 2,
                animation: phase === 'waiting'
                  ? '_crateShake 0.75s ease-in-out infinite'
                  : undefined,
              }}>
                {/* Breathing inner glow at the opening */}
                {innerGlowing && (
                  <div style={{
                    position: 'absolute',
                    top: -2, left: 0, right: 0,
                    height:   Math.round(bodyHeight * 0.38),
                    background: `radial-gradient(ellipse 90% 60% at 50% 0%,
                      ${colors.glow}80 0%,
                      ${colors.glow}30 45%,
                      transparent 100%)`,
                    animation: '_glowBreathe 1.5s ease-in-out infinite',
                    pointerEvents: 'none',
                    zIndex: 5,
                  }} />
                )}

                {tpl.renderBody(templateProps)}
              </div>
            </>
          )}

          {/* ── Particles ────────────────────────── */}
          {particles.map((p) => (
            <div key={p.id} style={{
              position:     'absolute',
              top:  '40%',  left: '50%',
              width:  p.size,
              height: p.size,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              background:   p.color,
              transform:    'rotate(45deg)',
              boxShadow:    `0 0 ${p.size * 2}px ${p.color}`,
              ['--px' as string]: `${p.x}px`,
              ['--py' as string]: `${p.y}px`,
              animation: `_particleFly ${p.duration}ms ease-out ${p.delay}ms forwards`,
              pointerEvents: 'none',
              zIndex: 10,
            }} />
          ))}
        </div>

        {/* ── Status label ─────────────────────── */}
        <div style={{
          position:      'absolute',
          bottom:        '18%',
          textAlign:     'center',
          pointerEvents: 'none',
        }}>
          {phase === 'falling' && (
            <p className="text-gray-600 text-sm tracking-widest uppercase animate-pulse">
              Opening…
            </p>
          )}

          {phase === 'waiting' && (
            <p className="text-sm tracking-widest uppercase"
              style={{
                color:     'rgba(99,102,241,0.55)',
                animation: '_glowBreathe 1.3s ease-in-out infinite',
              }}>
              {drops ? 'Ready…' : 'Searching…'}
            </p>
          )}

          {(phase === 'opening' || phase === 'bursting') && drops && (
            <div style={{ animation: '_labelIn 0.3s ease-out forwards' }}>
              <p
                className={`text-xl font-bold tracking-widest uppercase ${
                  bestRarity === 'LEGENDARY' ? 'text-legendary' :
                  bestRarity === 'EPIC'      ? 'text-purple-300' : ''
                }`}
                style={
                  bestRarity !== 'LEGENDARY' && bestRarity !== 'EPIC'
                    ? { color: colors.glow, textShadow: `0 0 20px ${colors.glow}` }
                    : undefined
                }
              >
                {colors.label}
              </p>
              {isSpecial && (
                <p className="text-xs mt-1.5 tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>
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
