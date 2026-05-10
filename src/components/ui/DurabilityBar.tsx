interface DurabilityBarProps {
  value: number
  height?: 'sm' | 'md'
}

export function DurabilityBar({ value, height = 'md' }: DurabilityBarProps) {
  const color = value > 50 ? 'bg-green-500' : value > 20 ? 'bg-yellow-500' : 'bg-red-500'
  const h     = height === 'sm' ? 'h-1' : 'h-1.5'
  return (
    <div className={`w-full bg-gray-800 rounded-full ${h}`}>
      <div className={`${color} ${h} rounded-full transition-all`} style={{ width: `${value}%` }} />
    </div>
  )
}
