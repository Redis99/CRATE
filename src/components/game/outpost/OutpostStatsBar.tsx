import { ERWidget, PDWidget } from '@/components/game/FleetStatsWidget'
import type { FleetERBreakdown, FleetPDBreakdown } from '@/lib/game-math'

interface Props {
  activeCount: number
  totalSlots: number
  er: FleetERBreakdown
  pd: FleetPDBreakdown
  /** Permite skin sazonal sobrescrever cor/borda do card de slots */
  className?: string
}

/**
 * Barra superior do Outpost: contagem de robôs ativos + widgets de ER e PD.
 * Para eventos sazonais, basta passar `className` ou substituir este componente
 * inteiro no layout.
 */
export function OutpostStatsBar({ activeCount, totalSlots, er, pd, className }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className={className ?? 'bg-[#111118] border border-gray-800/60 rounded-xl p-4'}>
        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Active Robots</p>
        <p className="text-white text-xl font-bold">
          {activeCount} <span className="text-gray-600 text-sm font-normal">/ {totalSlots}</span>
        </p>
        <p className="text-gray-600 text-xs mt-1">Outpost slots</p>
      </div>
      <ERWidget er={er} />
      <PDWidget pd={pd} />
    </div>
  )
}
