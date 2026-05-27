import { type Rarity } from '@/lib/rarity'

// ─── Style map ────────────────────────────────────────────────────────────────

const BADGE_STYLE: Record<string, { className: string; style?: React.CSSProperties }> = {
  COMMON: {
    className: 'text-gray-400 bg-gray-400/8 border border-gray-700/40',
  },
  UNCOMMON: {
    className: 'text-green-400 bg-green-400/8 border border-green-700/40',
  },
  RARE: {
    className: 'text-blue-400 bg-blue-400/8 border border-blue-700/40',
  },
  EPIC: {
    className: 'text-purple-300 bg-purple-500/10 border border-purple-500/30',
    style: { boxShadow: '0 0 8px rgba(192,132,252,0.15)' },
  },
  LEGENDARY: {
    className: 'border border-yellow-500/40',
    style: {
      background: 'rgba(250,204,21,0.08)',
      boxShadow: '0 0 10px rgba(250,204,21,0.18)',
    },
  },
}

const RARITY_LABEL: Record<string, string> = {
  COMMON:    'Common',
  UNCOMMON:  'Uncommon',
  RARE:      'Rare',
  EPIC:      'Epic',
  LEGENDARY: 'Legendary',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RarityBadgeProps {
  rarity: Rarity | string
  /** Show as a compact dot-only indicator */
  compact?: boolean
}

export function RarityBadge({ rarity, compact = false }: RarityBadgeProps) {
  const badge = BADGE_STYLE[rarity] ?? BADGE_STYLE.COMMON
  const label = RARITY_LABEL[rarity] ?? rarity

  if (compact) {
    return (
      <span
        className={`inline-flex items-center justify-center w-2 h-2 rounded-full ${badge.className}`}
        style={badge.style}
        title={label}
      />
    )
  }

  return (
    <span
      className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide uppercase ${badge.className}`}
      style={badge.style}
    >
      {rarity === 'LEGENDARY' ? (
        <span className="text-legendary">{label}</span>
      ) : (
        label
      )}
    </span>
  )
}
