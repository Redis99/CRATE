/**
 * Seed do catálogo de consumíveis — popula com os kits de reparo padrão.
 * Idempotente: skip se já existir.
 * POST /api/admin/seed-consumables  (admin session ou Bearer CRON_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SEEDS = [
  { consumableType: 'REPAIR_KIT' as const, name: 'Repair Kit 25%',  effectType: 'REPAIR_PCT', effectValue: 25,  durationSec: 0, rarity: 'COMMON',    description: 'Restores 25% of robot durability.',  sortOrder: 1 },
  { consumableType: 'REPAIR_KIT' as const, name: 'Repair Kit 50%',  effectType: 'REPAIR_PCT', effectValue: 50,  durationSec: 0, rarity: 'UNCOMMON',  description: 'Restores 50% of robot durability.',  sortOrder: 2 },
  { consumableType: 'REPAIR_KIT' as const, name: 'Repair Kit 100%', effectType: 'REPAIR_PCT', effectValue: 100, durationSec: 0, rarity: 'RARE',      description: 'Fully restores robot durability.',   sortOrder: 3 },
]

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    const { getAdminUser } = await import('@/lib/admin-auth')
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let created = 0
  let skipped = 0

  for (const s of SEEDS) {
    const existing = await prisma.consumableTemplate.findFirst({
      where: { consumableType: s.consumableType, effectValue: s.effectValue, durationSec: s.durationSec },
    })
    if (existing) { skipped++; continue }
    await prisma.consumableTemplate.create({ data: { ...s, active: true } })
    created++
  }

  return NextResponse.json({ success: true, created, skipped })
}
