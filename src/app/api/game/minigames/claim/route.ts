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

  if (!session)        return NextResponse.json({ error: 'Session not found.' }, { status: 404 })
  if (!session.won)    return NextResponse.json({ error: 'No reward for a lost game.' }, { status: 400 })
  if (session.claimed) return NextResponse.json({ error: 'Reward already claimed.' }, { status: 400 })

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // ── 1. Cria entrada de boost INDEPENDENTE ─────────────────────────────
    //   Duração baseada no streak atual (reseta se ficou 24h sem vencer)
    if (session.erBoost && session.erBoost > 0) {
      // Lê streak e data da última vitória
      const profile = await tx.user.findUnique({
        where:  { id: user.id },
        select: { minigameStreakWins: true, lastMinigameWinAt: true },
      })

      // Verifica se o streak foi quebrado (24h sem vitória)
      const lastWin      = profile?.lastMinigameWinAt
      const streakBroken = !lastWin || (now.getTime() - lastWin.getTime() > 24 * 60 * 60 * 1000)
      const baseStreak   = streakBroken ? 0 : (profile?.minigameStreakWins ?? 0)
      const newStreak    = baseStreak + 1

      // Duração = faixa baseada no streak atual (não no total lifetime)
      const durationHours = getBoostDurationHours(newStreak)
      const expiresAt     = new Date(now.getTime() + durationHours * 60 * 60 * 1000)

      // Cria nova entrada independente
      await tx.minigameBoost.create({
        data: { userId: user.id, erFlat: session.erBoost, expiresAt },
      })

      // Atualiza streak e stats
      await tx.user.update({
        where: { id: user.id },
        data: {
          minigameStreakWins: newStreak,
          lastMinigameWinAt: now,
          totalMinigameWins: { increment: 1 },
        },
      })
    }

    // ── 2. Aplica item dropado ────────────────────────────────────────────

    const drop = session.pendingDrop as {
      dropType:  'part' | 'consumable'
      rarity?:   string
      partType?: string
      kitValue?: number
    } | null

    if (drop) {
      if (drop.dropType === 'part' && drop.rarity && drop.partType) {
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
            data: { userId: user.id, partType: drop.partType, category: 'SPECIAL', rarity: drop.rarity as never, quantity: 1 },
          })
        }
      } else if (drop.dropType === 'consumable' && drop.kitValue != null) {
        const existingKit = await tx.consumable.findUnique({
          where: { userId_consumableType_value: { userId: user.id, consumableType: 'REPAIR_KIT', value: drop.kitValue } },
        })
        if (existingKit) {
          await tx.consumable.update({
            where: { userId_consumableType_value: { userId: user.id, consumableType: 'REPAIR_KIT', value: drop.kitValue } },
            data:  { quantity: { increment: 1 } },
          })
        } else {
          await tx.consumable.create({
            data: { userId: user.id, consumableType: 'REPAIR_KIT', value: drop.kitValue, quantity: 1 },
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
