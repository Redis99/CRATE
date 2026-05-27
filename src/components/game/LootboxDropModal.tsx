'use client'

import type { DropResultType } from '@/lib/lootbox'
import { ActionButton } from '@/components/ui/ActionButton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function dropIcon(drop: DropResultType): string {
  switch (drop.kind) {
    case 'robot':       return '🤖'
    case 'equipment':   return '⚙️'
    case 'baseUpgrade': return '🏗️'
    case 'part':        return '🔩'
    case 'consumable':  return '🔧'
  }
}

export function dropLabel(drop: DropResultType): string {
  switch (drop.kind) {
    case 'robot':       return drop.name
    case 'equipment':   return drop.name
    case 'baseUpgrade': return drop.name
    case 'part':        return `${drop.partType} ×${drop.quantity}`
    case 'consumable':  return `Repair Kit +${drop.value}% ×${drop.quantity}`
  }
}

export function dropSubLabel(drop: DropResultType): string {
  switch (drop.kind) {
    case 'robot':       return `${drop.rarity} Robot · ${drop.hashPower} ER base`
    case 'equipment':   return `${drop.rarity} Equipment · +${drop.effectValue} ${drop.effectType.replace(/_/g, ' ')}`
    case 'baseUpgrade': return `${drop.rarity} Base Upgrade · +${drop.effectValue} ${drop.effectType.replace(/_/g, ' ')}`
    case 'part':        return `${drop.rarity} · ${drop.category}`
    case 'consumable':  return 'Consumable'
  }
}

export function dropRarity(drop: DropResultType): string {
  return 'rarity' in drop ? drop.rarity : 'COMMON'
}

// ─── Rarity config ────────────────────────────────────────────────────────────

interface RarityConfig {
  labelClass: string
  borderStyle: React.CSSProperties
  bgStyle: React.CSSProperties
  isSpecial: boolean
}

function getRarityConfig(rarity: string): RarityConfig {
  switch (rarity) {
    case 'LEGENDARY':
      return {
        labelClass: 'text-legendary font-bold',
        borderStyle: { border: '1px solid rgba(250,204,21,0.40)' },
        bgStyle: {
          background: 'linear-gradient(135deg, rgba(250,204,21,0.08) 0%, rgba(251,191,36,0.04) 100%)',
          boxShadow: '0 0 20px rgba(250,204,21,0.10), inset 0 0 20px rgba(250,204,21,0.04)',
        },
        isSpecial: true,
      }
    case 'EPIC':
      return {
        labelClass: 'text-purple-300 font-semibold',
        borderStyle: { border: '1px solid rgba(192,132,252,0.35)' },
        bgStyle: {
          background: 'rgba(139,92,246,0.08)',
          boxShadow: '0 0 14px rgba(192,132,252,0.10)',
        },
        isSpecial: false,
      }
    case 'RARE':
      return {
        labelClass: 'text-blue-400 font-medium',
        borderStyle: { border: '1px solid rgba(96,165,250,0.30)' },
        bgStyle: { background: 'rgba(59,130,246,0.07)' },
        isSpecial: false,
      }
    case 'UNCOMMON':
      return {
        labelClass: 'text-green-400 font-medium',
        borderStyle: { border: '1px solid rgba(74,222,128,0.25)' },
        bgStyle: { background: 'rgba(34,197,94,0.06)' },
        isSpecial: false,
      }
    default: // COMMON
      return {
        labelClass: 'text-gray-300',
        borderStyle: { border: '1px solid rgba(255,255,255,0.08)' },
        bgStyle: { background: 'rgba(255,255,255,0.03)' },
        isSpecial: false,
      }
  }
}

// ─── DropRow ──────────────────────────────────────────────────────────────────

function DropRow({ drop, index }: { drop: DropResultType; index: number }) {
  const rarity = dropRarity(drop)
  const config = getRarityConfig(rarity)

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl animate-drop-in"
      style={{
        ...config.bgStyle,
        ...config.borderStyle,
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Icon */}
      <span
        className="text-xl shrink-0 w-9 h-9 flex items-center justify-center rounded-lg"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        {dropIcon(drop)}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${config.labelClass}`}>
          {dropLabel(drop)}
        </p>
        <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {dropSubLabel(drop)}
        </p>
      </div>

      {/* Rarity chip */}
      {'rarity' in drop && (
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide shrink-0 ${config.labelClass}`}
          style={{
            ...config.borderStyle,
            background: 'rgba(0,0,0,0.3)',
          }}
        >
          {rarity === 'LEGENDARY' ? <span className="text-legendary">{rarity}</span> : rarity}
        </span>
      )}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface LootboxDropModalProps {
  drops: DropResultType[]
  stoppedEarly?: boolean
  onClose: () => void
}

export function LootboxDropModal({ drops, stoppedEarly, onClose }: LootboxDropModalProps) {
  const single = drops.length === 1
  const hasLegendary = drops.some((d) => dropRarity(d) === 'LEGENDARY')
  const hasEpic      = drops.some((d) => dropRarity(d) === 'EPIC')

  // Header color based on best rarity in drop
  const headerGlow = hasLegendary
    ? 'rgba(250,204,21,0.12)'
    : hasEpic
    ? 'rgba(192,132,252,0.10)'
    : 'transparent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl flex flex-col animate-fade-slide-up"
        style={{
          background: 'var(--surface-3)',
          border: hasLegendary
            ? '1px solid rgba(250,204,21,0.25)'
            : hasEpic
            ? '1px solid rgba(192,132,252,0.25)'
            : '1px solid var(--border-strong)',
          boxShadow: hasLegendary
            ? '0 0 60px rgba(250,204,21,0.12), 0 24px 64px rgba(0,0,0,0.7)'
            : '0 24px 64px rgba(0,0,0,0.7)',
          maxHeight: '82vh',
        }}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 rounded-t-2xl"
          style={{ background: `radial-gradient(ellipse at top, ${headerGlow}, transparent 70%)` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              {/* Crate icon */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">📦</span>
                <span className="text-[11px] uppercase tracking-widest font-semibold"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  Lootbox Result
                </span>
              </div>
              <h3 className="text-white font-bold text-lg leading-tight">
                {single
                  ? 'You received an item!'
                  : `You received ${drops.length} items!`}
              </h3>
              {hasLegendary && (
                <p className="text-legendary text-xs font-semibold mt-1 animate-pulse">
                  ✦ Legendary drop!
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 transition-colors mt-0.5"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.background = '' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {stoppedEarly && (
            <div
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.20)',
                color: '#fbbf24',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              Inventory full — stopped early
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 20px' }} />

        {/* Drops list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {drops.map((drop, i) => (
            <DropRow key={i} drop={drop} index={i} />
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <ActionButton
            variant="purple"
            size="lg"
            fullWidth
            onClick={onClose}
          >
            {drops.length === 1 ? 'Collect' : 'Collect All'}
          </ActionButton>
        </div>
      </div>
    </div>
  )
}
