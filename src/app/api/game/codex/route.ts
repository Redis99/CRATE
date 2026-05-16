import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeCodexBonuses } from '@/lib/codex'

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [collections, entries, availableRobots] = await Promise.all([
    prisma.codexCollection.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.codexEntry.findMany({
      where: { userId: user.id },
      orderBy: { registeredAt: 'asc' },
    }),
    // Robôs do jogador elegíveis para registro (não estão no outpost nem no codex)
    prisma.robot.findMany({
      where: { userId: user.id, isActive: false, inCodex: false },
      select: { id: true, name: true, collection: true, rarity: true, hashPower: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const bonuses = computeCodexBonuses(collections, entries)

  // Monta as coleções com progresso do jogador
  const collectionsWithProgress = collections.map((col) => {
    const registered = entries.filter((e) => e.collection === col.name)
    const available  = availableRobots.filter((r) => r.collection === col.name)
    const isComplete = registered.length >= col.totalRequired
    return {
      ...col,
      registeredCount: registered.length,
      registeredItems: registered,
      availableRobots: available,
      isComplete,
    }
  })

  return NextResponse.json({ collections: collectionsWithProgress, totalBonuses: bonuses })
}
