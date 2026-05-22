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

  // Monta as coleções com progresso e slots específicos
  const collectionsWithProgress = collections.map((col) => {
    const requiredItems = (col.requiredItems as string[]) ?? []
    const hasSpecificItems = requiredItems.length > 0
    const totalRequired = hasSpecificItems ? requiredItems.length : col.totalRequired

    const registered = entries.filter((e) => e.collection === col.name)
    const registeredNames = new Set(registered.map((e) => e.itemName))

    // Disponíveis:
    // - Modo específico: basta o nome estar em requiredItems e o slot não estar preenchido
    // - Modo legado: filtra pelo campo collection do robô
    const available = hasSpecificItems
      ? availableRobots.filter(
          (r) => requiredItems.includes(r.name) &&
                 !registeredNames.has(r.name)
        )
      : availableRobots.filter((r) => r.collection === col.name)

    const isComplete = registered.length >= totalRequired

    // Slots nomeados para a UI de álbum de figurinhas
    const slots = hasSpecificItems
      ? requiredItems.map((name) => ({
          name,
          filled: registeredNames.has(name),
          entry:  registered.find((e) => e.itemName === name) ?? null,
        }))
      : null  // sem slots específicos: usa progresso genérico

    return {
      ...col,
      requiredItems,
      totalRequired,
      registeredCount: registered.length,
      registeredItems: registered,
      availableRobots: available,
      isComplete,
      slots,
    }
  })

  return NextResponse.json({ collections: collectionsWithProgress, totalBonuses: bonuses })
}
