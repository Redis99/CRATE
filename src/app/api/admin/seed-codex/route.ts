/**
 * Seed das coleções iniciais do Codex.
 * Executar uma vez após deploy: POST /api/admin/seed-codex
 * Protegido por CRON_SECRET.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const COLLECTIONS = [
  {
    name:        'Sentinel - Serie Artica',
    description: 'Three resilient units built for sub-zero environments. Their thermal shielding and reinforced frames make them exceptional mining assets.',
    itemType:    'ROBOT' as const,
    totalRequired: 3,
    bonusPerItemErPct: 5,
    completionErPct:   15,
    completionPdPct:   10,
    completionSlots:   0,
    sortOrder: 1,
  },
  {
    name:        'Titan - Serie Vulcanica',
    description: 'Heavy-duty units forged to operate in extreme heat. Renowned for their raw extraction power and volcanic terrain expertise.',
    itemType:    'ROBOT' as const,
    totalRequired: 3,
    bonusPerItemErPct: 5,
    completionErPct:   25,
    completionPdPct:   10,
    completionSlots:   0,
    sortOrder: 2,
  },
  {
    name:        'Drone - Serie Estelar',
    description: 'Lightweight autonomous drones designed for interstellar mining operations. Speed and efficiency in deep-space environments.',
    itemType:    'ROBOT' as const,
    totalRequired: 4,
    bonusPerItemErPct: 2,
    completionErPct:   10,
    completionPdPct:   0,
    completionSlots:   1,
    sortOrder: 3,
  },
  {
    name:        'Singularity - Legendary Series',
    description: 'Two ultra-rare units born from a collapsed mining singularity. Possessing ER values beyond any known series.',
    itemType:    'ROBOT' as const,
    totalRequired: 2,
    bonusPerItemErPct: 15,
    completionErPct:   50,
    completionPdPct:   0,
    completionSlots:   0,
    sortOrder: 4,
  },
  {
    name:        'Founders Collection',
    description: 'One robot from each rarity tier. Commemorates the genesis of the Inside the Crate network.',
    itemType:    'ROBOT' as const,
    totalRequired: 5,
    bonusPerItemErPct: 2,
    completionErPct:   30,
    completionPdPct:   0,
    completionSlots:   0,
    sortOrder: 5,
  },
]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const existing = await prisma.codexCollection.count()
  if (existing > 0) {
    return NextResponse.json({ message: `Skipped — ${existing} collections already in DB.` })
  }

  await prisma.codexCollection.createMany({ data: COLLECTIONS })

  return NextResponse.json({ success: true, created: COLLECTIONS.length })
}
