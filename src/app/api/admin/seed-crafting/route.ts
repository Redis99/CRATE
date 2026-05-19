/**
 * Endpoint único de seed — popula a tabela crafting_recipes com as receitas iniciais.
 * Só executa se a tabela estiver vazia. Protegido por CRON_SECRET.
 * Chamar uma vez após o deploy: POST /api/admin/seed-crafting
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const RECIPES = [
  {
    name:        'Extraction Booster',
    description: 'Combines precision mining components with AI optimization for a significant ER boost.',
    costCrate:   0,
    craftingTimeSec: 0,
    outputType:   'EQUIPMENT' as const,
    outputName:   'Extraction Booster',
    outputRarity: 'RARE' as const,
    outputEffectType:  'HASH_POWER_FLAT' as const,
    outputEffectValue: 18,
    ingredients: [
      { partType: 'Mining Core', rarity: 'UNCOMMON' as const, quantity: 3 },
      { partType: 'AI Chip',     rarity: 'UNCOMMON' as const, quantity: 2 },
    ],
  },
  {
    name:        'Energy Regulator',
    description: 'Engineered from maintenance and energy parts to reduce robot power draw.',
    costCrate:   0,
    craftingTimeSec: 0,
    outputType:   'EQUIPMENT' as const,
    outputName:   'Energy Regulator',
    outputRarity: 'UNCOMMON' as const,
    outputEffectType:  'POWER_DRAW_PCT' as const,
    outputEffectValue: 12,
    ingredients: [
      { partType: 'Energy Core', rarity: 'COMMON'   as const, quantity: 4 },
      { partType: 'Servo Pack',  rarity: 'UNCOMMON' as const, quantity: 2 },
    ],
  },
  {
    name:        'Void Excavator',
    description: 'A rare dual-purpose module fusing void materials with mining cores.',
    costCrate:   0,
    craftingTimeSec: 0,
    outputType:    'EQUIPMENT' as const,
    outputName:    'Void Excavator',
    outputRarity:  'EPIC' as const,
    outputEffectType:   'HASH_POWER_PCT' as const,
    outputEffectValue:  22,
    outputEffectType2:  'POWER_DRAW_PCT' as const,
    outputEffectValue2: 15,
    ingredients: [
      { partType: 'Void Crystal',   rarity: 'RARE'     as const, quantity: 2 },
      { partType: 'Mining Core',    rarity: 'RARE'     as const, quantity: 2 },
      { partType: 'Charge Crystal', rarity: 'UNCOMMON' as const, quantity: 1 },
    ],
  },
  {
    name:        'Prototype Unit',
    description: 'Assemble a custom robot from rare components. A balanced unit with guaranteed stats.',
    costCrate:   0,
    craftingTimeSec: 0,
    outputType:       'ROBOT' as const,
    outputName:       'Prototype Unit Mk.I',
    outputRarity:     'RARE' as const,
    outputCollection: 'Prototype — Crafted Series',
    outputHashPower:  160,
    outputEnergyRate: 16,
    ingredients: [
      { partType: 'Genesis Fragment', rarity: 'RARE'     as const, quantity: 3 },
      { partType: 'Logic Core',       rarity: 'RARE'     as const, quantity: 2 },
      { partType: 'Power Module',     rarity: 'UNCOMMON' as const, quantity: 3 },
    ],
  },
  {
    name:        'Grid Optimizer',
    description: 'A base-level upgrade that boosts the efficiency of your entire robot fleet.',
    costCrate:   0,
    craftingTimeSec: 0,
    outputType:   'BASE_UPGRADE' as const,
    outputName:   'Grid Optimizer',
    outputRarity: 'RARE' as const,
    outputEffectType:  'GLOBAL_EFFICIENCY_PCT' as const,
    outputEffectValue: 10,
    ingredients: [
      { partType: 'Terrain Scanner', rarity: 'RARE'     as const, quantity: 2 },
      { partType: 'Logic Core',      rarity: 'UNCOMMON' as const, quantity: 2 },
    ],
  },
]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    const { getAdminUser } = await import('@/lib/admin-auth')
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.craftingRecipe.count()
  if (existing > 0) {
    return NextResponse.json({ message: `Skipped — ${existing} recipes already in DB.` })
  }

  let created = 0
  for (const r of RECIPES) {
    await prisma.craftingRecipe.create({
      data: {
        name:             r.name,
        description:      r.description,
        costCrate:        r.costCrate,
        craftingTimeSec:  r.craftingTimeSec,
        outputType:       r.outputType,
        outputName:       r.outputName,
        outputRarity:     r.outputRarity,
        outputCollection: r.outputCollection  ?? null,
        outputHashPower:  r.outputHashPower   ?? null,
        outputEnergyRate: r.outputEnergyRate  ?? null,
        outputEffectType:   r.outputEffectType   ?? null,
        outputEffectValue:  r.outputEffectValue  ?? null,
        outputEffectType2:  r.outputEffectType2  ?? null,
        outputEffectValue2: r.outputEffectValue2 ?? null,
        ingredients: {
          create: r.ingredients,
        },
      },
    })
    created++
  }

  return NextResponse.json({ success: true, created })
}
