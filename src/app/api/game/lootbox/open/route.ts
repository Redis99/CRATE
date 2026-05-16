import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  rollPartsCrate, rollSupplyCrate,
  saveDropToInventory, checkInventorySpace,
  type DropResultType,
} from '@/lib/lootbox'
import { incrementMission } from '@/lib/mission-progress'

const MAX_OPEN_AT_ONCE = 10

// ─── Roll a drop from the DB config (falls back to hardcoded if not found) ────

async function rollFromConfig(lootboxType: string): Promise<DropResultType | null> {
  const config = await prisma.lootboxConfig.findFirst({
    where:   { lootboxType, active: true },
    include: { dropEntries: true },
  })

  // Fallback: sem config no banco → usa lógica hardcoded original
  if (!config || config.dropEntries.length === 0) return null

  // Escolhe entrada pelo peso relativo
  const totalWeight = config.dropEntries.reduce((s, e) => s + e.weight, 0)
  let rand = Math.random() * totalWeight
  let chosen = config.dropEntries[config.dropEntries.length - 1]
  for (const entry of config.dropEntries) {
    rand -= entry.weight
    if (rand <= 0) { chosen = entry; break }
  }

  const qty = chosen.minQuantity === chosen.maxQuantity
    ? chosen.minQuantity
    : chosen.minQuantity + Math.floor(Math.random() * (chosen.maxQuantity - chosen.minQuantity + 1))

  const rarity = (chosen.rarity ?? 'COMMON') as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

  // Gera o item baseado no tipo — reutiliza a lógica de nomes/efeitos do lootbox.ts
  // via rollPartsCrate/rollSupplyCrate para consistência, mas filtra pelo rarity do banco
  // Para simplicidade de migração: delega ao roll hardcoded e filtra pelo rarity esperado
  // (em produção completo, cada entry geraria o item diretamente)
  switch (chosen.dropType) {
    case 'PART': {
      const PART_NAMES: Record<string, string[]> = {
        COMMON:   ['Energy Core', 'Servo Pack', 'Circuit Board', 'Power Relay', 'Signal Node'],
        UNCOMMON: ['Mining Core', 'AI Chip', 'Charge Crystal', 'Thruster Pack', 'Sensor Array'],
        RARE:     ['Void Crystal', 'Logic Core', 'Genesis Fragment', 'Terrain Scanner', 'Quantum Cell'],
        EPIC:     ['Nexus Shard', 'Plasma Core', 'Singularity Chip', 'Warp Conduit'],
        LEGENDARY:['Omega Crystal', 'Stellar Core'],
      }
      type PartCat = 'ENERGY' | 'MINING' | 'MAINTENANCE' | 'TERRAIN' | 'AI_SOFTWARE' | 'SPECIAL'
      const CAT: Record<string, PartCat> = {
        COMMON:'ENERGY', UNCOMMON:'MINING', RARE:'SPECIAL', EPIC:'SPECIAL', LEGENDARY:'SPECIAL',
      }
      const names = PART_NAMES[rarity] ?? PART_NAMES.COMMON
      return {
        kind:     'part',
        partType: names[Math.floor(Math.random() * names.length)],
        category: CAT[rarity] ?? 'ENERGY',
        rarity,
        quantity: qty,
      }
    }
    case 'CONSUMABLE': {
      // specificName encodes kit value: 'REPAIR_KIT_5', 'REPAIR_KIT_25', etc.
      const val = chosen.specificName
        ? parseInt(chosen.specificName.replace('REPAIR_KIT_', ''), 10)
        : 5
      return { kind: 'consumable', consumableType: 'REPAIR_KIT', value: isNaN(val) ? 5 : val, quantity: qty }
    }
    default:
      // Para ROBOT, EQUIPMENT, BASE_UPGRADE: delega ao roll original com rarity alvo
      // (lógica completa de geração de stats está em lootbox.ts)
      return null
  }
}

// ─── Sync roll usando config já carregada (sem query) ────────────────────────

type LoadedConfig = NonNullable<Awaited<ReturnType<typeof prisma.lootboxConfig.findFirst>>> & {
  dropEntries: { dropType: string; rarity: string | null; minQuantity: number; maxQuantity: number; weight: number; specificName: string | null }[]
}

function rollFromConfigSync(config: LoadedConfig): DropResultType | null {
  if (!config.dropEntries.length) return null
  const totalWeight = config.dropEntries.reduce((s, e) => s + e.weight, 0)
  let rand = Math.random() * totalWeight
  let chosen = config.dropEntries[config.dropEntries.length - 1]
  for (const entry of config.dropEntries) { rand -= entry.weight; if (rand <= 0) { chosen = entry; break } }
  const qty    = chosen.minQuantity === chosen.maxQuantity ? chosen.minQuantity : chosen.minQuantity + Math.floor(Math.random() * (chosen.maxQuantity - chosen.minQuantity + 1))
  const rarity = (chosen.rarity ?? 'COMMON') as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  if (chosen.dropType === 'PART') {
    const NAMES: Record<string, string[]> = { COMMON:['Energy Core','Servo Pack','Circuit Board','Power Relay','Signal Node'], UNCOMMON:['Mining Core','AI Chip','Charge Crystal','Thruster Pack','Sensor Array'], RARE:['Void Crystal','Logic Core','Genesis Fragment','Terrain Scanner','Quantum Cell'], EPIC:['Nexus Shard','Plasma Core','Singularity Chip','Warp Conduit'], LEGENDARY:['Omega Crystal','Stellar Core'] }
    type PartCat = 'ENERGY'|'MINING'|'MAINTENANCE'|'TERRAIN'|'AI_SOFTWARE'|'SPECIAL'
    const CAT: Record<string, PartCat> = { COMMON:'ENERGY', UNCOMMON:'MINING', RARE:'SPECIAL', EPIC:'SPECIAL', LEGENDARY:'SPECIAL' }
    const names = NAMES[rarity] ?? NAMES.COMMON
    return { kind: 'part', partType: names[Math.floor(Math.random()*names.length)], category: CAT[rarity]??'ENERGY', rarity, quantity: qty }
  }
  if (chosen.dropType === 'CONSUMABLE') {
    const val = chosen.specificName ? parseInt(chosen.specificName.replace('REPAIR_KIT_',''),10) : 5
    return { kind: 'consumable', consumableType: 'REPAIR_KIT', value: isNaN(val)?5:val, quantity: qty }
  }
  return null  // ROBOT/EQUIPMENT/BASE_UPGRADE → fallback hardcoded
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lootboxType, quantity = 1 } = await req.json() as {
    lootboxType: 'PARTS_CRATE' | 'SUPPLY_CRATE'
    quantity: number
  }

  if (!['PARTS_CRATE', 'SUPPLY_CRATE'].includes(lootboxType)) {
    return NextResponse.json({ error: 'Invalid lootbox type.' }, { status: 400 })
  }

  const qty = Math.min(Math.max(1, quantity), MAX_OPEN_AT_ONCE)

  const lootbox = await prisma.inventoryLootbox.findUnique({
    where: { userId_lootboxType: { userId: user.id, lootboxType } },
  })

  if (!lootbox || lootbox.quantity < 1) {
    return NextResponse.json({ error: 'You do not have this lootbox.' }, { status: 400 })
  }

  const toOpen = Math.min(qty, lootbox.quantity)
  const drops: DropResultType[] = []
  let stopped = false

  // Busca config do banco UMA vez fora do loop (evita N+1)
  const dbConfig = await prisma.lootboxConfig.findFirst({
    where:   { lootboxType, active: true },
    include: { dropEntries: true },
  })
  // Verifica espaço no inventário UMA vez antes do loop
  const sampleDrop = dbConfig ? null : (lootboxType === 'PARTS_CRATE' ? rollPartsCrate() : rollSupplyCrate())
  if (sampleDrop) {
    const spaceCheck = await checkInventorySpace(user.id, sampleDrop)
    if (spaceCheck) { stopped = true }
  }

  for (let i = 0; i < toOpen && !stopped; i++) {
    // Usa config pré-carregado ou fallback hardcoded
    let drop = dbConfig ? rollFromConfigSync(dbConfig) : null
    if (!drop) {
      drop = lootboxType === 'PARTS_CRATE' ? rollPartsCrate() : rollSupplyCrate()
    }

    const spaceError = await checkInventorySpace(user.id, drop)
    if (spaceError) { stopped = true; break }

    await saveDropToInventory(user.id, drop)
    drops.push(drop)
  }

  if (drops.length > 0) {
    const newQty = lootbox.quantity - drops.length
    if (newQty <= 0) {
      await prisma.inventoryLootbox.delete({
        where: { userId_lootboxType: { userId: user.id, lootboxType } },
      })
    } else {
      await prisma.inventoryLootbox.update({
        where: { userId_lootboxType: { userId: user.id, lootboxType } },
        data:  { quantity: newQty },
      })
    }
  }

  if (drops.length > 0) {
    void incrementMission(user.id, 'LOOTBOX', drops.length)
  }

  return NextResponse.json({
    success: drops.length > 0,
    drops,
    opened: drops.length,
    stoppedEarly: stopped,
  })
}
