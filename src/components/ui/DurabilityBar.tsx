interface DurabilityBarProps {
  value:    number
  max?:     number   // valor máximo — default 100 (compatibilidade com sistema antigo %)
  height?:  'sm' | 'md'
}

export function DurabilityBar({ value, max = 100, height = 'md' }: DurabilityBarProps) {
  const pct   = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0))
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'
  const h     = height === 'sm' ? 'h-1' : 'h-1.5'
  return (
    <div className={`w-full bg-gray-800 rounded-full ${h}`}>
      <div className={`${color} ${h} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}
