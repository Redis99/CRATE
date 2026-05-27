interface DurabilityBarProps {
  value:    number
  max?:     number   /** default 100 */
  height?:  'sm' | 'md'
}

export function DurabilityBar({ value, max = 100, height = 'md' }: DurabilityBarProps) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0))

  const h = height === 'sm' ? 'h-1' : 'h-1.5'

  // Color + glow based on health
  let barColor: string
  let glowStyle: React.CSSProperties = {}

  if (pct > 60) {
    barColor = 'bg-emerald-500'
    glowStyle = { boxShadow: '0 0 6px rgba(16,185,129,0.35)' }
  } else if (pct > 25) {
    barColor = 'bg-amber-400'
    glowStyle = { boxShadow: '0 0 6px rgba(251,191,36,0.30)' }
  } else {
    barColor = 'bg-red-500'
    glowStyle = {
      boxShadow: '0 0 8px rgba(239,68,68,0.45)',
      animation: 'pulseGlow 1.6s ease-in-out infinite',
    }
  }

  return (
    <div
      className={`w-full rounded-full ${h}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    >
      <div
        className={`${barColor} ${h} rounded-full transition-all duration-300`}
        style={{ width: `${pct}%`, ...glowStyle }}
      />
    </div>
  )
}
