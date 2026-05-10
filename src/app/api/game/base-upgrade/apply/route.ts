import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BASE_SLOT_LABELS, BASE_SLOT_EFFECTS } from '@/lib/game-constants'

const SLOT_LABELS  = BASE_SLOT_LABELS  as Record<number, string>
const SLOT_EFFECTS = BASE_SLOT_EFFECTS as Record<number, string[]>

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { upgradeId, slot } = await req.json() as { upgradeId: string; slot: number }

  if (!upgradeId || ![1, 2].includes(slot)) {
    return NextResponse.json({ error: 'Missing upgradeId or invalid slot (1 or 2).' }, { status: 400 })
  }

  const upgrade = await prisma.baseUpgrade.findFirst({
    where: { id: upgradeId, userId: user.id },
  })

  if (!upgrade) return NextResponse.json({ error: 'Base upgrade not found.' }, { status: 404 })
  if (upgrade.isApplied) return NextResponse.json({ error: 'This upgrade is already applied.' }, { status: 409 })

  // Valida se o efeito é compatível com o slot
  const allowedEffects = SLOT_EFFECTS[slot]
  if (!allowedEffects.includes(upgrade.effectType)) {
    return NextResponse.json({
      error: `This upgrade (${upgrade.effectType}) is not compatible with slot ${slot} (${SLOT_LABELS[slot as 1 | 2]}).`,
    }, { status: 400 })
  }

  // Verifica se o slot já está ocupado
  const slotOccupied = await prisma.baseUpgrade.findFirst({
    where: { userId: user.id, isApplied: true, appliedSlot: slot },
  })
  if (slotOccupied) {
    return NextResponse.json({
      error: `Slot ${slot} (${SLOT_LABELS[slot as 1 | 2]}) is already occupied by "${slotOccupied.name}". Remove it first.`,
    }, { status: 409 })
  }

  await prisma.baseUpgrade.update({
    where: { id: upgradeId },
    data: { isApplied: true, appliedSlot: slot },
  })

  return NextResponse.json({ success: true })
}
