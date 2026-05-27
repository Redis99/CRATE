'use client'

import type { RobotCardData } from '@/components/game/RobotCard'
import { OutpostInventoryItem } from './OutpostInventoryItem'

interface Props {
  robots: RobotCardData[]
  outpostFull: boolean
  selectedRobot: RobotCardData | null
  actionLoading: string | null
  onSelectRobot: (robot: RobotCardData) => void
  onCancelSelect: () => void
  onOpenEquip: (robot: RobotCardData) => void
  onOpenRepair: (robot: RobotCardData) => void
  title?: string
  className?: string
  /** Componente customizado por item — permite skins sazonais */
  ItemComponent?: typeof OutpostInventoryItem
}

/**
 * Grade do inventário de robôs não-deployados.
 *
 * Sazonais: passar `ItemComponent` custom (ex: cards com moldura natalina,
 * cards com aspecto de ovo de Páscoa, etc.).
 */
export function OutpostInventory({
  robots, outpostFull, selectedRobot, actionLoading,
  onSelectRobot, onCancelSelect, onOpenEquip, onOpenRepair,
  title = 'Robot Inventory',
  className,
  ItemComponent = OutpostInventoryItem,
}: Props) {
  return (
    <div className={className ?? 'bg-[#111118] border border-gray-800/60 rounded-xl p-5'}>
      <h3 className="text-white font-semibold text-sm mb-4">
        {title} <span className="text-gray-600 font-normal">({robots.length})</span>
      </h3>

      {robots.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-600 text-sm">No robots in inventory.</p>
          <p className="text-gray-700 text-xs mt-1">Open lootboxes or visit the shop to get robots.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {robots.map((robot) => (
            <ItemComponent
              key={robot.id}
              robot={robot}
              isSelected={selectedRobot?.id === robot.id}
              outpostFull={outpostFull}
              actionLoading={actionLoading}
              onSelect={() => onSelectRobot(robot)}
              onCancelSelect={onCancelSelect}
              onEquip={() => onOpenEquip(robot)}
              onRepair={() => onOpenRepair(robot)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
