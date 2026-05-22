/**
 * Catálogo da loja — fonte única de verdade para itens e preços.
 * Preços em CRATE (devnet). Serão gerenciados pelo admin panel no mainnet.
 */

export type ShopCategory =
  | 'robots' | 'equipment' | 'baseUpgrades'
  | 'batteries' | 'outpostSlots' | 'inventory'

export type GenerateType = 'robot' | 'equipment' | 'baseUpgrade'

export interface ShopItem {
  id:          string
  category:    ShopCategory
  name:        string
  description: string
  price:       number          // em CRATE
  rarity?:     string          // COMMON | UNCOMMON | RARE | EPIC
  // Itens gerados aleatoriamente (robôs, equipamentos, upgrades)
  generateType?: GenerateType
  // Itens com atributos fixos criados pelo admin (specific: true)
  specific?:        boolean
  hashPower?:       number     // ER exato do robô
  energyRate?:      number     // PD exato do robô
  durability?:      number     // durabilidade máxima do robô (padrão 100)
  robotCollection?: string     // coleção do robô
  effectType?:      string     // efeito do equipamento/base upgrade
  effectValue?:     number
  effectType2?:     string     // efeito secundário (opcional)
  effectValue2?:    number
  // Baterias
  batteryValue?: number        // energia restaurada
  // Slots de Outpost
  slotNumber?: number          // slot a desbloquear (4, 5 ou 6)
  slotRequires?: number        // slots atuais mínimos necessários
  // Expansões de inventário
  inventoryTab?:       string  // ex: 'robots', 'equipments'
  inventoryAdd?:       number  // slots adicionados por compra
  inventoryBasePrice?: number  // preço base antes de aplicar +20%/compra
}

// ─── Robôs ────────────────────────────────────────────────────────────────────

export const SHOP_ROBOTS: ShopItem[] = [
  { id: 'robot-common',   category: 'robots', name: 'Common Robot',   rarity: 'COMMON',   price: 5,   description: 'Standard unit. Reliable and energy efficient.',               generateType: 'robot' },
  { id: 'robot-uncommon', category: 'robots', name: 'Uncommon Robot', rarity: 'UNCOMMON', price: 15,  description: 'Improved extraction capabilities.',                           generateType: 'robot' },
  { id: 'robot-rare',     category: 'robots', name: 'Rare Robot',     rarity: 'RARE',     price: 50,  description: 'High-performance unit with significant ER output.',            generateType: 'robot' },
  { id: 'robot-epic',     category: 'robots', name: 'Epic Robot',     rarity: 'EPIC',     price: 150, description: 'Top-tier unit. Maximum ER, higher power draw.',               generateType: 'robot' },
]

// ─── Equipamentos ─────────────────────────────────────────────────────────────

export const SHOP_EQUIPMENT: ShopItem[] = [
  { id: 'equip-common',   category: 'equipment', name: 'Common Equipment',   rarity: 'COMMON',   price: 3,  description: 'Basic module. Minor ER or PD improvement.',               generateType: 'equipment' },
  { id: 'equip-uncommon', category: 'equipment', name: 'Uncommon Equipment', rarity: 'UNCOMMON', price: 10, description: 'Improved module with noticeable stat gains.',              generateType: 'equipment' },
  { id: 'equip-rare',     category: 'equipment', name: 'Rare Equipment',     rarity: 'RARE',     price: 30, description: 'High-quality module. Significant ER or PD boost.',         generateType: 'equipment' },
  { id: 'equip-epic',     category: 'equipment', name: 'Epic Equipment',     rarity: 'EPIC',     price: 90, description: 'Elite module. May carry dual ER + PD benefits.',           generateType: 'equipment' },
]

// ─── Melhorias de Base ────────────────────────────────────────────────────────

export const SHOP_BASE_UPGRADES: ShopItem[] = [
  { id: 'base-common',   category: 'baseUpgrades', name: 'Common Base Upgrade',   rarity: 'COMMON',   price: 3,  description: 'Basic fleet-wide efficiency improvement.',            generateType: 'baseUpgrade' },
  { id: 'base-uncommon', category: 'baseUpgrades', name: 'Uncommon Base Upgrade', rarity: 'UNCOMMON', price: 10, description: 'Moderate global bonus for all deployed robots.',       generateType: 'baseUpgrade' },
  { id: 'base-rare',     category: 'baseUpgrades', name: 'Rare Base Upgrade',     rarity: 'RARE',     price: 30, description: 'Strong fleet enhancement. Noticeably boosts output.',  generateType: 'baseUpgrade' },
  { id: 'base-epic',     category: 'baseUpgrades', name: 'Epic Base Upgrade',     rarity: 'EPIC',     price: 90, description: 'Top-tier fleet upgrade. Maximum global benefit.',       generateType: 'baseUpgrade' },
]

// ─── Baterias ─────────────────────────────────────────────────────────────────

export const SHOP_BATTERIES: ShopItem[] = [
  { id: 'battery-25',  category: 'batteries', name: 'Battery +25',  description: 'Restores 25 energy to one robot.',  price: 0.5, batteryValue: 25  },
  { id: 'battery-50',  category: 'batteries', name: 'Battery +50',  description: 'Restores 50 energy to one robot.',  price: 1,   batteryValue: 50  },
  { id: 'battery-100', category: 'batteries', name: 'Battery +100', description: 'Restores 100 energy to one robot.', price: 2,   batteryValue: 100 },
]

// ─── Slots do Outpost ─────────────────────────────────────────────────────────

export const SHOP_OUTPOST_SLOTS: ShopItem[] = [
  { id: 'slot-4', category: 'outpostSlots', name: 'Outpost Slot 4', description: 'Unlock a 4th robot slot in your Outpost.', price: 10, slotNumber: 4, slotRequires: 3 },
  { id: 'slot-5', category: 'outpostSlots', name: 'Outpost Slot 5', description: 'Unlock a 5th robot slot in your Outpost.', price: 20, slotNumber: 5, slotRequires: 4 },
  { id: 'slot-6', category: 'outpostSlots', name: 'Outpost Slot 6', description: 'Unlock a 6th robot slot in your Outpost.', price: 40, slotNumber: 6, slotRequires: 5 },
]

// ─── Expansões de Inventário ──────────────────────────────────────────────────
// Preço aumenta +20% a cada compra na mesma aba.
// O preço atual é calculado pela API com base no número de compras anteriores.

export const SHOP_INVENTORY: ShopItem[] = [
  { id: 'inv-robots',       category: 'inventory', name: 'Robot Storage +5',       description: 'Adds 5 robot inventory slots.',        price: 0, inventoryTab: 'robots',       inventoryAdd: 5,  inventoryBasePrice: 5 },
  { id: 'inv-equipments',   category: 'inventory', name: 'Equipment Storage +10',  description: 'Adds 10 equipment inventory slots.',   price: 0, inventoryTab: 'equipments',   inventoryAdd: 10, inventoryBasePrice: 5 },
  { id: 'inv-baseUpgrades', category: 'inventory', name: 'Base Upgrade Storage +5',description: 'Adds 5 base upgrade inventory slots.', price: 0, inventoryTab: 'baseUpgrades', inventoryAdd: 5,  inventoryBasePrice: 5 },
  { id: 'inv-parts',        category: 'inventory', name: 'Parts Storage +25',      description: 'Adds 25 crafting parts slots.',        price: 0, inventoryTab: 'parts',        inventoryAdd: 25, inventoryBasePrice: 3 },
  { id: 'inv-consumables',  category: 'inventory', name: 'Consumable Storage +10', description: 'Adds 10 consumable inventory slots.',  price: 0, inventoryTab: 'consumables',  inventoryAdd: 10, inventoryBasePrice: 3 },
  { id: 'inv-lootboxes',    category: 'inventory', name: 'Lootbox Storage +5',     description: 'Adds 5 lootbox inventory slots.',      price: 0, inventoryTab: 'lootboxes',    inventoryAdd: 5,  inventoryBasePrice: 3 },
]

// ─── Catálogo completo ────────────────────────────────────────────────────────

export const ALL_SHOP_ITEMS: ShopItem[] = [
  // SHOP_ROBOTS removido — robots agora são Robot Crates na área de Lootboxes
  // SHOP_EQUIPMENT removido — equipamentos agora são Equipment Crates na área de Lootboxes
  // SHOP_BASE_UPGRADES removido — melhorias agora são Base Upgrade Crates na área de Lootboxes
  ...SHOP_BATTERIES,
  ...SHOP_OUTPOST_SLOTS,
  ...SHOP_INVENTORY,
]

export function getShopItem(id: string): ShopItem | undefined {
  return ALL_SHOP_ITEMS.find((i) => i.id === id)
}

// Limites máximos de inventário
export const INVENTORY_MAX: Record<string, number> = {
  robots: 30, equipments: 60, baseUpgrades: 30,
  parts: 200, consumables: 50, lootboxes: 30,
}

// Defaults de inventário (mesmos do schema Prisma)
export const INVENTORY_DEFAULT: Record<string, number> = {
  robots: 10, equipments: 20, baseUpgrades: 10,
  parts: 50,  consumables: 20, lootboxes: 10,
}

// Mapa para o campo no User
export const INVENTORY_FIELD: Record<string, string> = {
  robots: 'slotsRobots', equipments: 'slotsEquipments',
  baseUpgrades: 'slotsBaseUpgrades', parts: 'slotsParts',
  consumables: 'slotsConsumables', lootboxes: 'slotsLootboxes',
}
