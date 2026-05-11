import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getBoostDurationHours } from '@/lib/minigame-config'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId.' }, { status: 400 })

  const session = await prisma.minigameSession.findFirst({
    where: { id: sessionId, userId: user.id },
  })

  if (!session)         return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  if (!session.won)     return NextResponse.json({ error: 'No reward for a lost game.' }, { status: 400 })
  if (session.claimed)  return NextResponse.json({ error: 'Reward already claimed.' }, { status: 400 })

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // ── 1. Aplica boost de ER ─────────────────────────────────────────────

    if (session.erBoost && session.erBoost > 0) {
      const existing = await tx.minigameBoost.findUnique({ where: { userId: user.id } })
      const isActive = existing && existing.expiresAt > now

      const newTotalWins = (existing?.totalWins ?? 0) + 1
      const durationHours = getBoostDurationHours(newTotalWins)
      const newExpiry = new Date(
        Math.max(
          isActive ? existing!.expiresAt.getTime() : now.getTime(),
          now.getTime()
        ) + durationHours * 60 * 60 * 1000
      )

      await tx.minigameBoost.upsert({
        where:  { userId: user.id },
        create: {
          userId:     user.id,
          erFlat:     session.erBoost,
          expiresAt:  newExpiry,
          totalWins:  newTotalWins,
        },
        update: {
          erFlat:     { increment: session.erBoost },
          expiresAt:  newExpiry,
          totalWins:  { increment: 1 },
        },
      })
    }

    // ── 2. Aplica item dropado ────────────────────────────────────────────

    const drop = session.pendingDrop as {
      dropType: 'part' | 'consumable'
      rarity?:  string
      partType?: string
      kitValue?: number
    } | null

    if (drop) {
      if (drop.dropType === 'part' && drop.rarity && drop.partType) {
        // Upsert na pilha de peças
        const existingPart = await tx.inventoryPart.findUnique({
          where: { userId_partType: { userId: user.id, partType: drop.partType } },
        })
        if (existingPart) {
          await tx.inventoryPart.update({
            where: { userId_partType: { userId: user.id, partType: drop.partType } },
            data:  { quantity: { increment: 1 } },
          })
        } else {
          await tx.inventoryPart.create({
            data: {
              userId:   user.id,
              partType: drop.partType,
              category: 'SPECIAL',          // categoria genérica para drops de minigame
              rarity:   drop.rarity as never,
              quantity: 1,
            },
          })
        }
      } else if (drop.dropType === 'consumable' && drop.kitValue != null) {
        // Upsert no consumable de reparo
        const existingKit = await tx.consumable.findUnique({
          where: { userId_consumableType_value: {
            userId: user.id, consumableType: 'REPAIR_KIT', value: drop.kitValue,
          }},
        })
        if (existingKit) {
          await tx.consumable.update({
            where: { userId_consumableType_value: {
              userId: user.id, consumableType: 'REPAIR_KIT', value: drop.kitValue,
            }},
            data: { quantity: { increment: 1 } },
          })
        } else {
          await tx.consumable.create({
            data: {
              userId:          user.id,
              consumableType:  'REPAIR_KIT',
              value:           drop.kitValue,
              quantity:        1,
            },
          })
        }
      }
    }

    // ── 3. Marca sessão como claimed ──────────────────────────────────────

    await tx.minigameSession.update({
      where: { id: sessionId },
      data:  { claimed: true, claimedAt: now },
    })
  })

  return NextResponse.json({ success: true })
}
