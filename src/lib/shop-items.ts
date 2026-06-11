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

// Nota: robôs, equipamentos e melhorias de base saíram do catálogo da loja —
// agora são vendidos como crates específicas na área de Lootboxes.

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
  ...SHOP_BATTERIES,
  ...SHOP_OUTPOST_SLOTS,
  ...SHOP_INVENTORY,
]

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
