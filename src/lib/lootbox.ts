import 'server-only'
import { prisma } from '@/lib/prisma'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
type EffectType = 'HASH_POWER_FLAT' | 'HASH_POWER_PCT' | 'DURABILITY_LOSS_PCT' | 'GLOBAL_EFFICIENCY_PCT' | 'UPTIME_HOURS' | 'POWER_DRAW_FLAT' | 'POWER_DRAW_PCT'
type PartCategory = 'ENERGY' | 'MINING' | 'MAINTENANCE' | 'TERRAIN' | 'AI_SOFTWARE' | 'SPECIAL'

export type DropResultType =
  | { kind: 'robot';       name: string; collection: string; rarity: Rarity; hashPower: number; energyRate: number }
  | { kind: 'equipment';   name: string; rarity: Rarity; effectType: EffectType; effectValue: number; effectType2?: EffectType; effectValue2?: number }
  | { kind: 'baseUpgrade'; name: string; rarity: Rarity; effectType: EffectType; effectValue: number; effectType2?: EffectType; effectValue2?: number }
  | { kind: 'part';        partType: string; category: PartCategory; rarity: Rarity; quantity: number }
  | { kind: 'consumable';  consumableType: 'REPAIR_KIT'; value: number; quantity: number }

// ─── Pools de nomes genéricos ─────────────────────────────────────────────────

const ROBOT_NAMES: Record<Rarity, string[]> = {
  COMMON:    ['Sentinel Mk.I', 'Crawler Alpha', 'Scout Drone X', 'BaseBot-01', 'Digger Unit C', 'Field Bot-3'],
  UNCOMMON:  ['Sentinel Mk.II', 'Ranger B2', 'Iron Digger', 'Excavator-7', 'Scout Pro', 'Recon Unit D'],
  RARE:      ['Titan Mk.I', 'Plasma Scout', 'Void Crawler', 'Storm Unit', 'Deep Probe-R', 'Apex Scout'],
  EPIC:      ['Titan Mk.II', 'Quantum Scout', 'Nova Crawler', 'Apex Unit', 'Omega Probe', 'Void Titan'],
  LEGENDARY: ['Singularity-1', 'Omega Prime', 'Genesis Unit'],
}

const ROBOT_COLLECTIONS: Record<Rarity, string[]> = {
  COMMON:    ['Sentinel — Standard Series', 'Crawler — Base Line'],
  UNCOMMON:  ['Ranger — Industrial Series', 'Sentinel — Advanced Series'],
  RARE:      ['Titan — Volcanic Series', 'Plasma — Rare Line'],
  EPIC:      ['Titan — Quantum Series', 'Nova — Elite Line'],
  LEGENDARY: ['Singularity — Genesis Series'],
}

// Extraction Rate (ER) por raridade
// Ratio ER:PD mantido em ~10:1 para consistência
const ROBOT_ER: Record<Rarity, [number, number]> = {
  COMMON:    [30,  60],
  UNCOMMON:  [70,  120],
  RARE:      [130, 200],
  EPIC:      [210, 350],
  LEGENDARY: [360, 600],
}

// Power Draw (PD) por raridade — consumo de energia por hora
const ROBOT_PD: Record<Rarity, [number, number]> = {
  COMMON:    [3,   6],
  UNCOMMON:  [7,   12],
  RARE:      [13,  20],
  EPIC:      [21,  35],
  LEGENDARY: [36,  60],
}

const EQUIPMENT_NAMES: Record<EffectType, string[]> = {
  HASH_POWER_FLAT:       ['Mining Drill Module', 'Extraction Booster', 'Core Enhancer', 'Drill Bit Upgrade'],
  HASH_POWER_PCT:        ['Efficiency Amplifier', 'Output Multiplier', 'Extraction Catalyst', 'Power Optimizer'],
  DURABILITY_LOSS_PCT:   ['Nanoactive Shield', 'Armor Plating', 'Protective Shell', 'Hull Reinforcement'],
  GLOBAL_EFFICIENCY_PCT: ['Network Optimizer', 'Grid Enhancer', 'System Booster', 'Command Chip'],
  UPTIME_HOURS:          ['Extended Runtime Module', 'Uptime Booster', 'Autonomous Controller'],
  POWER_DRAW_FLAT:       ['Energy Capacitor', 'Low-Draw Core', 'Efficient Regulator', 'Power Filter'],
  POWER_DRAW_PCT:        ['Nano Efficiency Unit', 'Energy Optimizer', 'Consumption Reducer', 'Eco Drive Module'],
}

const EQUIPMENT_EFFECTS: Record<Rarity, { type: EffectType; min: number; max: number }[]> = {
  COMMON:    [{ type: 'HASH_POWER_FLAT', min: 2, max: 5 },  { type: 'POWER_DRAW_FLAT', min: 0.1, max: 0.3 }],
  UNCOMMON:  [{ type: 'HASH_POWER_FLAT', min: 5, max: 12 }, { type: 'POWER_DRAW_FLAT', min: 0.3, max: 0.8 }, { type: 'HASH_POWER_PCT', min: 8, max: 15 }],
  RARE:      [{ type: 'HASH_POWER_FLAT', min: 12, max: 22 }, { type: 'POWER_DRAW_PCT', min: 5, max: 15 }, { type: 'GLOBAL_EFFICIENCY_PCT', min: 10, max: 20 }],
  EPIC:      [{ type: 'HASH_POWER_PCT', min: 15, max: 30 }, { type: 'POWER_DRAW_PCT', min: 15, max: 30 }, { type: 'GLOBAL_EFFICIENCY_PCT', min: 20, max: 35 }],
  LEGENDARY: [{ type: 'HASH_POWER_PCT', min: 40, max: 60 }, { type: 'POWER_DRAW_PCT', min: 40, max: 60 }, { type: 'GLOBAL_EFFICIENCY_PCT', min: 40, max: 60 }],
}

// Efeitos secundários possíveis por raridade (dual-effect items)
// Epic: 50% de chance — Legendary: sempre
const EQUIPMENT_SECONDARY: Record<'EPIC' | 'LEGENDARY', { type: EffectType; min: number; max: number }[]> = {
  EPIC:      [{ type: 'POWER_DRAW_PCT', min: 10, max: 20 }, { type: 'HASH_POWER_PCT', min: 10, max: 20 }],
  LEGENDARY: [{ type: 'POWER_DRAW_PCT', min: 25, max: 40 }, { type: 'HASH_POWER_PCT', min: 25, max: 40 }, { type: 'GLOBAL_EFFICIENCY_PCT', min: 20, max: 35 }],
}

const BASE_UPGRADE_NAMES: Record<EffectType, string[]> = {
  HASH_POWER_PCT:        ['Power Grid Upgrade', 'Energy Matrix Boost', 'Mining Array Enhancement'],
  GLOBAL_EFFICIENCY_PCT: ['Command Center Upgrade', 'Network Hub Expansion', 'Coordination System'],
  UPTIME_HOURS:          ['Autonomous Operation Module', 'Extended Runtime System', 'Uptime Controller'],
  HASH_POWER_FLAT:       ['Output Amplifier', 'Extraction Core Boost'],
  DURABILITY_LOSS_PCT:   ['Base Shield System', 'Maintenance Optimizer'],
  POWER_DRAW_FLAT:       ['Energy Efficiency Core', 'Base Power Regulator'],
  POWER_DRAW_PCT:        ['Fleet Power Optimizer', 'Consumption Management System'],
}

const BASE_UPGRADE_EFFECTS: Record<Rarity, { type: EffectType; min: number; max: number }[]> = {
  COMMON:    [{ type: 'HASH_POWER_PCT', min: 2, max: 5 }, { type: 'UPTIME_HOURS', min: 2, max: 4 }],
  UNCOMMON:  [{ type: 'HASH_POWER_PCT', min: 5, max: 10 }, { type: 'GLOBAL_EFFICIENCY_PCT', min: 5, max: 10 }],
  RARE:      [{ type: 'HASH_POWER_PCT', min: 10, max: 18 }, { type: 'GLOBAL_EFFICIENCY_PCT', min: 10, max: 18 }],
  EPIC:      [{ type: 'HASH_POWER_PCT', min: 18, max: 30 }, { type: 'GLOBAL_EFFICIENCY_PCT', min: 18, max: 30 }],
  LEGENDARY: [{ type: 'GLOBAL_EFFICIENCY_PCT', min: 35, max: 50 }, { type: 'HASH_POWER_PCT', min: 35, max: 50 }],
}

import { PARTS_BY_CATEGORY } from '@/lib/parts-data'
export { PARTS_BY_CATEGORY }

// ─── Utilitários ──────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function roll(table: { weight: number; result: () => DropResultType }[]): DropResultType {
  const total = table.reduce((s, e) => s + e.weight, 0)
  let r = Math.random() * total
  for (const entry of table) {
    r -= entry.weight
    if (r <= 0) return entry.result()
  }
  return table[table.length - 1].result()
}

// ─── Geração de itens ─────────────────────────────────────────────────────────

export function generateRobotDrop(rarity: Rarity, dbTemplates?: DbRobotTemplate[]): DropResultType {
  // Se há templates no banco para esta raridade, usa um aleatório
  if (dbTemplates && dbTemplates.length > 0) {
    const matching = dbTemplates.filter(t => t.rarity === rarity)
    if (matching.length > 0) {
      const tpl = pick(matching)
      const meta = tpl.metadata as Record<string, unknown>
      return {
        kind:       'robot',
        name:       String(meta.robotName ?? tpl.name),
        collection: String(meta.robotCollection ?? ''),
        rarity,
        hashPower:  Number(meta.hashPower  ?? ROBOT_ER[rarity][0]),
        energyRate: Number(meta.energyRate ?? ROBOT_PD[rarity][0]),
      }
    }
  }
  // Fallback: geração hardcoded (mantida enquanto banco estiver vazio)
  const [erMin, erMax] = ROBOT_ER[rarity]
  const [pdMin, pdMax] = ROBOT_PD[rarity]
  return {
    kind: 'robot',
    name: pick(ROBOT_NAMES[rarity]),
    collection: pick(ROBOT_COLLECTIONS[rarity]),
    rarity,
    hashPower:  Math.round(randInt(erMin, erMax) * 10) / 10,
    energyRate: Math.round(randInt(pdMin * 10, pdMax * 10)) / 10,
  }
}

// Tipo para templates vindos do banco
type DbRobotTemplate = { id: string; name: string; rarity: string; metadata: unknown }

/**
 * Versão async — busca templates do banco e gera drop.
 * Use em lootbox open e crafting para usar o banco como fonte primária.
 */
export async function generateRobotDropFromDB(rarity: Rarity): Promise<DropResultType> {
  // Todos os templates daquela raridade (ativos ou não) são elegíveis para drops
  const templates = await prisma.shopItem.findMany({
    where: { category: 'robot-specific', rarity },
  })
  return generateRobotDrop(rarity, templates)
}

export function generateEquipmentDrop(rarity: Rarity): DropResultType {
  const effect = pick(EQUIPMENT_EFFECTS[rarity])
  const effectValue = Math.round(randInt(effect.min * 10, effect.max * 10)) / 10

  // Efeito secundário: Epic (50%) e Legendary (sempre)
  let effectType2: EffectType | undefined
  let effectValue2: number | undefined

  if (rarity === 'LEGENDARY' || (rarity === 'EPIC' && Math.random() < 0.5)) {
    const secondary = EQUIPMENT_SECONDARY[rarity as 'EPIC' | 'LEGENDARY']
    const sec = pick(secondary.filter((s) => s.type !== effect.type))
    if (sec) {
      effectType2  = sec.type
      effectValue2 = Math.round(randInt(sec.min * 10, sec.max * 10)) / 10
    }
  }

  return {
    kind: 'equipment',
    name: pick(EQUIPMENT_NAMES[effect.type]),
    rarity,
    effectType: effect.type,
    effectValue,
    ...(effectType2 && { effectType2, effectValue2 }),
  }
}

export function generateBaseUpgradeDrop(rarity: Rarity): DropResultType {
  const effect = pick(BASE_UPGRADE_EFFECTS[rarity])
  const effectValue = randInt(effect.min, effect.max)
  return {
    kind: 'baseUpgrade',
    name: pick(BASE_UPGRADE_NAMES[effect.type]),
    rarity,
    effectType: effect.type,
    effectValue,
  }
}

export function generatePartDrop(rarity: Rarity, quantity: number): DropResultType {
  const category = pick(Object.keys(PARTS_BY_CATEGORY) as PartCategory[])
  return {
    kind: 'part',
    partType: pick(PARTS_BY_CATEGORY[category]),
    category,
    rarity,
    quantity,
  }
}

// ─── Tabelas de drop ──────────────────────────────────────────────────────────

export function rollPartsCrate(): DropResultType {
  return roll([
    { weight: 35, result: () => generatePartDrop('COMMON',   4) },
    { weight: 25, result: () => generatePartDrop('COMMON',   8) },
    { weight: 18, result: () => generatePartDrop('UNCOMMON', 2) },
    { weight: 12, result: () => generatePartDrop('UNCOMMON', 4) },
    { weight:  5, result: () => generatePartDrop('RARE',     1) },
    { weight:  3, result: () => generatePartDrop('RARE',     2) },
    { weight:  2, result: () => generatePartDrop('EPIC',     1) },
  ])
}

export function rollSupplyCrate(): DropResultType {
  return roll([
    { weight: 18,  result: () => generateEquipmentDrop('COMMON') },
    { weight: 15,  result: () => generateBaseUpgradeDrop('COMMON') },
    { weight: 12,  result: () => ({ kind: 'consumable', consumableType: 'REPAIR_KIT', value: 25, quantity: 5 }) },
    { weight: 12,  result: () => generateRobotDrop('COMMON') },
    { weight:  9,  result: () => generateEquipmentDrop('UNCOMMON') },
    { weight:  8,  result: () => generateBaseUpgradeDrop('UNCOMMON') },
    { weight:  7,  result: () => generateRobotDrop('UNCOMMON') },
    { weight:  5,  result: () => generateEquipmentDrop('RARE') },
    { weight:  4,  result: () => generateBaseUpgradeDrop('RARE') },
    { weight:  4,  result: () => generateRobotDrop('RARE') },
    { weight:  2,  result: () => generateEquipmentDrop('EPIC') },
    { weight:  2,  result: () => generateBaseUpgradeDrop('EPIC') },
    { weight:  1,  result: () => generateRobotDrop('EPIC') },
    { weight:  0.5,result: () => generateEquipmentDrop('LEGENDARY') },
    { weight:  0.3,result: () => generateBaseUpgradeDrop('LEGENDARY') },
    { weight:  0.2,result: () => generateRobotDrop('LEGENDARY') },
  ])
}

/**
 * Versões async das funções de roll — buscam templates do banco antes de gerar.
 * Use estas em lootbox/open e outros endpoints que geram drops.
 */
export async function rollSupplyCrateAsync(): Promise<DropResultType> {
  const robotTemplates = await prisma.shopItem.findMany({
    where: { category: 'robot-specific' },
  })
  return roll([
    { weight: 18,  result: () => generateEquipmentDrop('COMMON') },
    { weight: 15,  result: () => generateBaseUpgradeDrop('COMMON') },
    { weight: 12,  result: () => ({ kind: 'consumable', consumableType: 'REPAIR_KIT', value: 25, quantity: 5 }) },
    { weight: 12,  result: () => generateRobotDrop('COMMON', robotTemplates) },
    { weight:  9,  result: () => generateEquipmentDrop('UNCOMMON') },
    { weight:  8,  result: () => generateBaseUpgradeDrop('UNCOMMON') },
    { weight:  7,  result: () => generateRobotDrop('UNCOMMON', robotTemplates) },
    { weight:  5,  result: () => generateEquipmentDrop('RARE') },
    { weight:  4,  result: () => generateBaseUpgradeDrop('RARE') },
    { weight:  4,  result: () => generateRobotDrop('RARE', robotTemplates) },
    { weight:  2,  result: () => generateEquipmentDrop('EPIC') },
    { weight:  2,  result: () => generateBaseUpgradeDrop('EPIC') },
    { weight:  1,  result: () => generateRobotDrop('EPIC', robotTemplates) },
    { weight:  0.5,result: () => generateEquipmentDrop('LEGENDARY') },
    { weight:  0.3,result: () => generateBaseUpgradeDrop('LEGENDARY') },
    { weight:  0.2,result: () => generateRobotDrop('LEGENDARY', robotTemplates) },
  ])
}

// ─── Geração guiada (crafting) ────────────────────────────────────────────────

/**
 * Gera um equipamento priorizando os efeitos preferidos da receita.
 * Se nenhum efeito preferido coincidir com o pool da raridade, usa geração aleatória normal.
 */
export function generateEquipmentWithPreference(
  rarity: Rarity,
  preferredEffects: string[]
): DropResultType {
  const pool = EQUIPMENT_EFFECTS[rarity]
  const preferred = pool.filter((e) => preferredEffects.includes(e.type))
  const effect = preferred.length > 0 ? pick(preferred) : pick(pool)
  const effectValue = Math.round(randInt(effect.min * 10, effect.max * 10)) / 10

  // Efeito secundário para Epic/Legendary (mesma lógica da lootbox)
  let effectType2: EffectType | undefined
  let effectValue2: number | undefined
  if (rarity === 'LEGENDARY' || (rarity === 'EPIC' && Math.random() < 0.5)) {
    const secondary = EQUIPMENT_SECONDARY[rarity as 'EPIC' | 'LEGENDARY']
    const sec = pick(secondary.filter((s) => s.type !== effect.type))
    if (sec) {
      effectType2  = sec.type
      effectValue2 = Math.round(randInt(sec.min * 10, sec.max * 10)) / 10
    }
  }

  return {
    kind: 'equipment',
    name: pick(EQUIPMENT_NAMES[effect.type]),
    rarity,
    effectType: effect.type,
    effectValue,
    ...(effectType2 && { effectType2, effectValue2 }),
  }
}

/**
 * Gera uma melhoria de base priorizando os efeitos preferidos da receita.
 */
export function generateBaseUpgradeWithPreference(
  rarity: Rarity,
  preferredEffects: string[]
): DropResultType {
  const pool = BASE_UPGRADE_EFFECTS[rarity]
  const preferred = pool.filter((e) => preferredEffects.includes(e.type))
  const effect = preferred.length > 0 ? pick(preferred) : pick(pool)
  const effectValue = Math.round(randInt(effect.min * 10, effect.max * 10)) / 10

  return {
    kind: 'baseUpgrade',
    name: pick(BASE_UPGRADE_NAMES[effect.type]),
    rarity,
    effectType: effect.type,
    effectValue,
  }
}

// ─── Salvar item gerado no banco ──────────────────────────────────────────────

export async function saveDropToInventory(userId: string, drop: DropResultType): Promise<void> {
  switch (drop.kind) {
    case 'robot':
      await prisma.robot.create({
        data: {
          userId,
          name: drop.name,
          collection: drop.collection,
          rarity: drop.rarity,
          hashPower: drop.hashPower,
          energyRate: drop.energyRate,
          durability: 100,
          isActive: false,
        },
      })
      break

    case 'equipment':
      await prisma.equipment.create({
        data: {
          userId,
          name: drop.name,
          rarity: drop.rarity,
          effectType: drop.effectType,
          effectValue: drop.effectValue,
          effectType2:  drop.effectType2  ?? null,
          effectValue2: drop.effectValue2 ?? null,
          isPermanent: true,
        },
      })
      break

    case 'baseUpgrade':
      await prisma.baseUpgrade.create({
        data: {
          userId,
          name: drop.name,
          rarity: drop.rarity,
          effectType: drop.effectType,
          effectValue: drop.effectValue,
          isApplied: false,
        },
      })
      break

    case 'part': {
      // Tenta incrementar stack existente (mesmo partType), senão cria novo
      const existing = await prisma.inventoryPart.findUnique({
        where: { userId_partType: { userId, partType: drop.partType } },
      })
      if (existing) {
        await prisma.inventoryPart.update({
          where: { userId_partType: { userId, partType: drop.partType } },
          data: { quantity: { increment: drop.quantity } },
        })
      } else {
        await prisma.inventoryPart.create({
          data: { userId, partType: drop.partType, category: drop.category, rarity: drop.rarity, quantity: drop.quantity },
        })
      }
      break
    }

    case 'consumable': {
      const existing = await prisma.consumable.findUnique({
        where: { userId_consumableType_value: { userId, consumableType: drop.consumableType, value: drop.value } },
      })
      if (existing) {
        await prisma.consumable.update({
          where: { userId_consumableType_value: { userId, consumableType: drop.consumableType, value: drop.value } },
          data: { quantity: { increment: drop.quantity } },
        })
      } else {
        await prisma.consumable.create({
          data: { userId, consumableType: drop.consumableType, value: drop.value, quantity: drop.quantity },
        })
      }
      break
    }
  }
}

// ─── Verificação de espaço no inventário ──────────────────────────────────────

export async function checkInventorySpace(userId: string, drop: DropResultType): Promise<string | null> {
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      slotsRobots: true, slotsEquipments: true, slotsBaseUpgrades: true,
      slotsParts: true, slotsConsumables: true,
      _count: {
        select: { robots: true, equipments: true, baseUpgrades: true, parts: true, consumables: true },
      },
    },
  })
  if (!profile) return 'Profile not found.'

  switch (drop.kind) {
    case 'robot':
      if (profile._count.robots >= profile.slotsRobots) return 'Robot inventory is full.'
      break
    case 'equipment':
      if (profile._count.equipments >= profile.slotsEquipments) return 'Equipment inventory is full.'
      break
    case 'baseUpgrade':
      if (profile._count.baseUpgrades >= profile.slotsBaseUpgrades) return 'Base upgrade inventory is full.'
      break
    case 'part':
      if (profile._count.parts >= profile.slotsParts) return 'Parts inventory is full.'
      break
    case 'consumable':
      if (profile._count.consumables >= profile.slotsConsumables) return 'Consumables inventory is full.'
      break
  }
  return null
}
