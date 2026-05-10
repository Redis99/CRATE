import { ERIcon } from '@/components/ui/ERIcon'
import type { FleetERBreakdown, FleetPDBreakdown } from '@/lib/game-math'

// ─── ER Widget ────────────────────────────────────────────────────────────────

interface ERWidgetProps {
  er: FleetERBreakdown
}

export function ERWidget({ er }: ERWidgetProps) {
  const hasEquipBonus       = er.equipBonus > 0
  const hasBaseUpgradeBonus = er.baseUpgradePct > 0

  return (
    <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Extraction Rate</p>

      {/* Total prominente */}
      <div className="flex items-center gap-2 mb-2">
        <p className="text-white text-xl font-bold font-mono">
          {er.total.toFixed(1)}
          <span className="text-gray-600 text-sm font-normal ml-1">ER</span>
        </p>
        <ERIcon size={16} className="text-orange-400" />
      </div>

      {/* Breakdown */}
      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between text-gray-600">
          <span>Base robots</span>
          <span className="font-mono">{er.base.toFixed(1)}</span>
        </div>
        {hasEquipBonus && (
          <div className="flex justify-between text-orange-400/70">
            <span>+ Equipment</span>
            <span className="font-mono">+{er.equipBonus.toFixed(1)}</span>
          </div>
        )}
        {hasBaseUpgradeBonus && (
          <div className="flex justify-between text-cyan-400/70">
            <span>+ Base upgrade</span>
            <span className="font-mono">+{er.baseUpgradePct}% (+{er.baseUpgradeBonus.toFixed(1)})</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PD Widget ────────────────────────────────────────────────────────────────

interface PDWidgetProps {
  pd: FleetPDBreakdown
}

export function PDWidget({ pd }: PDWidgetProps) {
  const hasEquipSaving = pd.equipSaving > 0

  return (
    <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
      <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Fleet Power Draw</p>

      {/* Total prominente */}
      <p className="text-white text-xl font-bold font-mono mb-2">
        {pd.total.toFixed(1)}
        <span className="text-gray-600 text-sm font-normal ml-1">PD/hr</span>
      </p>

      {/* Breakdown */}
      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between text-gray-600">
          <span>Base robots</span>
          <span className="font-mono">{pd.base.toFixed(1)}</span>
        </div>
        {hasEquipSaving && (
          <div className="flex justify-between text-teal-400/70">
            <span>− Equipment</span>
            <span className="font-mono">−{pd.equipSaving.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
