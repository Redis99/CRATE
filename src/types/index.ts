export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
export type Token = 'CRATE' | 'SOL' | 'LC'
export type LootboxType = 'PARTS_CRATE' | 'SUPPLY_CRATE'
export type GameType = 'SPACE_DRIFT' | 'BLOCK_FALL' | 'SERPENTINE' | 'ORBITAL_JUMP' | 'SPACE_FROG'

export interface UserBalance {
  crate: number
  sol: number
  lc: number
}

export interface RobotWithEquipments {
  id: string
  name: string
  collection: string
  rarity: Rarity
  hashPower: number
  durability: number
  isActive: boolean
  outpostSlot: number | null
  equipments: EquipmentBasic[]
}

export interface EquipmentBasic {
  id: string
  name: string
  rarity: Rarity
  effectType: string
  effectValue: number
  isPermanent: boolean
  expiresAt: Date | null
}

export interface TokenPrice {
  crate: number
  sol: number
  lc: number
  updatedAt: Date
}

export interface LootboxDrop {
  type: 'robot' | 'equipment' | 'base_upgrade' | 'part' | 'repair_kit' | 'crate_reward'
  rarity?: Rarity
  name: string
  quantity: number
}

export interface MarketItem {
  id: string
  itemType: string
  price: number
  seller: {
    id: string
    username: string
  }
  rarity?: Rarity
  name: string
  createdAt: Date
  expiresAt: Date
}

export interface MissionProgress {
  id: string
  title: string
  description: string
  category: string
  progress: number
  target: number
  completed: boolean
  completedAt: Date | null
  claimedAt: Date | null
  rewardType: string
  rewardData: Record<string, unknown>
}

export interface CodexCollection {
  name: string
  items: CodexItem[]
  isComplete: boolean
  bonus: string
}

export interface CodexItem {
  id: string
  itemType: string
  name: string
  rarity: Rarity
  registeredAt: Date
}

export interface MinigameResult {
  won: boolean
  score: number
  boostHours: number | null
  itemDrop: LootboxDrop | null
}

export interface WithdrawRequest {
  id: string
  token: Token
  amount: number
  toAddress: string
  status: string
  createdAt: Date
}

export interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: Date
}