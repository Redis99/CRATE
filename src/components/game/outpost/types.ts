import type { RobotCardData } from '@/components/game/RobotCard'
import type { EquipmentCardData } from '@/components/game/EquipmentCard'

// Base upgrade já aplicado num slot da base do outpost
export interface BaseUpgradeSlot extends EquipmentCardData {
  appliedSlot: number | null
}

// Estrutura completa retornada por GET /api/game/outpost
export interface OutpostData {
  outpostSlots: number
  robots: RobotCardData[]
  baseUpgrades: BaseUpgradeSlot[]
}
