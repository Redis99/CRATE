'use client'

import { RobotCard } from '@/components/game/RobotCard'
import type { RobotCardData } from '@/components/game/RobotCard'
import { RARITY_CARD_COLOR } from '@/lib/rarity'

interface Props {
  robot: RobotCardData
  isSelected: boolean
  outpostFull: boolean
  actionLoading: string | null
  onSelect: () => void
  onCancelSelect: () => void
  onEquip: () => void
  onRepair: () => void
  className?: string
}

/**
 * Um card de robô no inventário do outpost.
 * Mostra:
 * - RobotCard mini com equipamentos
 * - Botões: Deploy (flex-1), ⚙ Equip, ♻ Repair
 *
 * Skins sazonais podem passar `className` ou substituir o componente todo
 * via prop `ItemComponent` em OutpostInventory.
 */
export function OutpostInventoryItem({
  robot, isSelected, outpostFull, actionLoading,
  onSelect, onCancelSelect, onEquip, onRepair, className,
}: Props) {
  const isEmpty     = robot.durability === 0
  const maxDur      = robot.maxDurability ?? robot.durability
  const needsRepair = maxDur > 0 && (robot.durability / maxDur) < 0.5

  const wrapperClass = className ?? `border rounded-xl p-3 transition-all ${
    isSelected ? 'border-blue-500/60 bg-blue-500/10'
    : isEmpty  ? 'border-red-900/40 bg-red-900/5 opacity-60'
    : `${RARITY_CARD_COLOR[robot.rarity]} border`
  }`

  return (
    <div className={wrapperClass}>
      <RobotCard robot={robot} variant="mini" />

      <div className="mt-2 flex gap-1.5">
        {/* Deploy / Cancel selection */}
        <button
          onClick={() => isSelected ? onCancelSelect() : onSelect()}
          disabled={isEmpty || (outpostFull && !isSelected) || actionLoading === robot.id}
          className={`flex-1 text-xs px-2 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isSelected
              ? 'border-indigo-500/60 text-indigo-300 bg-indigo-500/10'
              : 'border-gray-700 text-gray-300 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5'
          }`}
        >
          {isEmpty ? 'No Energy' : outpostFull && !isSelected ? 'Full' : isSelected ? '✓' : 'Deploy'}
        </button>

        {/* Equip */}
        <button
          onClick={onEquip}
          title="Manage equipment"
          className="text-xs px-2 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:border-purple-500/50 hover:text-purple-400 hover:bg-purple-500/5 transition-colors"
        >
          ⚙
        </button>

        {/* Repair */}
        <button
          onClick={onRepair}
          title="Repair robot"
          className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${
            needsRepair
              ? 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
              : 'border-gray-700 text-gray-400 hover:border-green-500/50 hover:text-green-400 hover:bg-green-500/5'
          }`}
        >
          ♻
        </button>
      </div>
    </div>
  )
}
