/**
 * Seed de robôs — insere todos os robôs hardcoded de lootbox.ts como ShopItems no banco.
 * Idempotente: skip se já existir (por ID).
 * POST /api/admin/seed-robots  (admin session ou Bearer CRON_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Espelha exatamente os arrays de lootbox.ts
const ROBOT_NAMES: Record<string, string[]> = {
  COMMON:    ['Sentinel Mk.I', 'Crawler Alpha', 'Scout Drone X', 'BaseBot-01', 'Digger Unit C', 'Field Bot-3'],
  UNCOMMON:  ['Sentinel Mk.II', 'Ranger B2', 'Iron Digger', 'Excavator-7', 'Scout Pro', 'Recon Unit D'],
  RARE:      ['Titan Mk.I', 'Plasma Scout', 'Void Crawler', 'Storm Unit', 'Deep Probe-R', 'Apex Scout'],
  EPIC:      ['Titan Mk.II', 'Quantum Scout', 'Nova Crawler', 'Apex Unit', 'Omega Probe', 'Void Titan'],
  LEGENDARY: ['Singularity-1', 'Omega Prime', 'Genesis Unit'],
}

const ROBOT_COLLECTIONS: Record<string, string> = {
  // Atribui uma coleção padrão por raridade (admin pode ajustar depois)
  COMMON:    'Sentinel — Standard Series',
  UNCOMMON:  'Ranger — Industrial Series',
  RARE:      'Titan — Volcanic Series',
  EPIC:      'Titan — Quantum Series',
  LEGENDARY: 'Singularity — Genesis Series',
}

// Usa o ponto médio das faixas de ER e PD (admin ajusta depois)
const ROBOT_ER_MID: Record<string, number> = {
  COMMON: 45, UNCOMMON: 95, RARE: 165, EPIC: 280, LEGENDARY: 480,
}
const ROBOT_PD_MID: Record<string, number> = {
  COMMON: 4.5, UNCOMMON: 9.5, RARE: 16.5, EPIC: 28, LEGENDARY: 48,
}
// Durabilidade base por raridade (admin ajusta)
const ROBOT_DURABILITY: Record<string, number> = {
  COMMON: 100, UNCOMMON: 250, RARE: 600, EPIC: 1500, LEGENDARY: 4000,
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    const { getAdminUser } = await import('@/lib/admin-auth')
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let created = 0
  let skipped = 0

  for (const [rarity, names] of Object.entries(ROBOT_NAMES)) {
    for (const name of names) {
      const id = `robot-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
      const existing = await prisma.shopItem.findUnique({ where: { id } })
      if (existing) { skipped++; continue }

      await prisma.shopItem.create({
        data: {
          id,
          category: 'robot-specific',
          name,
          description: `${rarity} robot — ${ROBOT_COLLECTIONS[rarity]}`,
          price: 0,
          rarity,
          active: false,
          sortOrder: 0,
          metadata: {
            specific:        true,
            robotName:       name,
            robotCollection: ROBOT_COLLECTIONS[rarity],
            hashPower:       ROBOT_ER_MID[rarity],
            energyRate:      ROBOT_PD_MID[rarity],
            durability:      ROBOT_DURABILITY[rarity],
          },
        },
      })
      created++
    }
  }

  return NextResponse.json({ success: true, created, skipped })
}
