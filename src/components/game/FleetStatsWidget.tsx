import { ERIcon } from '@/components/ui/ERIcon'
import type { FleetERBreakdown, FleetPDBreakdown } from '@/lib/game-math'

// Ícone de Power Draw (raio estilizado)
function PDIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M10.5 2L4 10h6l-2.5 6L14 8H8l2.5-6z" />
    </svg>
  )
}

// ─── ER Widget ────────────────────────────────────────────────────────────────

export function ERWidget({ er }: { er: FleetERBreakdown }) {
  const hasEquipBonus       = er.equipBonus > 0
  const hasBaseUpgradeBonus = er.baseUpgradePct > 0

  return (
    <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
      {/* Header com ícone no canto */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-gray-500 text-xs uppercase tracking-wider">Extraction Rate</p>
        <ERIcon size={16} className="text-orange-400" />
      </div>

      {/* Total */}
      <p className="text-white text-xl font-bold font-mono mb-2">
        {er.total.toFixed(1)}
        <span className="text-gray-600 text-sm font-normal ml-1">ER</span>
      </p>

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
        {(er.codexBonusPct ?? 0) > 0 && (
          <div className="flex justify-between text-yellow-500/70">
            <span>🏆 Codex bonus</span>
            <span className="font-mono">+{(er.codexBonusPct ?? 0)}% (+{(er.codexBonus ?? 0).toFixed(1)})</span>
          </div>
        )}
        {(er.minigameBonus ?? 0) > 0 && (
          <div className="flex justify-between text-yellow-400/70">
            <span>⚡ Minigame boost</span>
            <span className="font-mono">+{er.minigameBonus!.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PD Widget ────────────────────────────────────────────────────────────────

export function PDWidget({ pd }: { pd: FleetPDBreakdown }) {
  const hasEquipSaving = pd.equipSaving > 0

  return (
    <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-4">
      {/* Header com ícone no canto */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-gray-500 text-xs uppercase tracking-wider">Fleet Power Draw</p>
        <PDIcon size={16} className="text-teal-400" />
      </div>

      {/* Total */}
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
        {(pd.codexSaving ?? 0) > 0 && (
          <div className="flex justify-between text-yellow-500/70">
            <span>🏆 Codex bonus</span>
            <span className="font-mono">−{(pd.codexSaving ?? 0).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
