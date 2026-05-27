'use client'

import type { RobotCardData } from '@/components/game/RobotCard'
import type { FleetERBreakdown, FleetPDBreakdown } from '@/lib/game-math'
import type { BaseUpgradeSlot } from './types'
import { OutpostStatsBar } from './OutpostStatsBar'
import { OutpostBaseConfig } from './OutpostBaseConfig'
import { OutpostSlotsGrid } from './OutpostSlotsGrid'
import { OutpostInventory } from './OutpostInventory'

export interface OutpostLayoutProps {
  totalSlots: number
  deployedRobots: RobotCardData[]
  inventoryRobots: RobotCardData[]
  baseUpgrades: BaseUpgradeSlot[]
  selectedRobot: RobotCardData | null
  actionLoading: string | null
  er: FleetERBreakdown
  pd: FleetPDBreakdown
  onDeploy: (robot: RobotCardData, slot: number) => void
  onRecall: (robot: RobotCardData) => void
  onSelectRobot: (robot: RobotCardData) => void
  onCancelSelect: () => void
  onOpenEquip: (robot: RobotCardData) => void
  onOpenRepair: (robot: RobotCardData) => void
}

/**
 * Layout PADRÃO do outpost. Para eventos sazonais, criar uma versão alternativa
 * que recebe os mesmos `OutpostLayoutProps` e compõe os widgets de forma diferente
 * (ou substitui por skins themed via prop `SlotComponent`/`ItemComponent`).
 *
 * Exemplos futuros:
 *   - OutpostLayoutHalloween.tsx
 *   - OutpostLayoutChristmas.tsx
 *   - OutpostLayoutSolarStorm.tsx
 *
 * No OutpostManager basta importar a versão certa baseado no evento ativo.
 */
export function OutpostLayout(props: OutpostLayoutProps) {
  const outpostFull = props.deployedRobots.length >= props.totalSlots

  return (
    <div className="space-y-6">
      <OutpostStatsBar
        activeCount={props.deployedRobots.length}
        totalSlots={props.totalSlots}
        er={props.er}
        pd={props.pd}
      />

      <OutpostBaseConfig baseUpgrades={props.baseUpgrades} />

      <OutpostSlotsGrid
        totalSlots={props.totalSlots}
        deployedRobots={props.deployedRobots}
        selectedRobot={props.selectedRobot}
        actionLoading={props.actionLoading}
        onDeploy={props.onDeploy}
        onRecall={props.onRecall}
      />

      <OutpostInventory
        robots={props.inventoryRobots}
        outpostFull={outpostFull}
        selectedRobot={props.selectedRobot}
        actionLoading={props.actionLoading}
        onSelectRobot={props.onSelectRobot}
        onCancelSelect={props.onCancelSelect}
        onOpenEquip={props.onOpenEquip}
        onOpenRepair={props.onOpenRepair}
      />
    </div>
  )
}
