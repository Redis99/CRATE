import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeCodexBonuses } from '@/lib/codex'
import { normalizeRequiredItems } from '@/lib/codex-types'

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [collections, entries, availableRobots, availableEquipments, availableBaseUpgrades] = await Promise.all([
    prisma.codexCollection.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.codexEntry.findMany({
      where: { userId: user.id },
      orderBy: { registeredAt: 'asc' },
    }),
    // Robôs disponíveis (não ativos, não no codex)
    prisma.robot.findMany({
      where: { userId: user.id, isActive: false, inCodex: false },
      select: { id: true, name: true, collection: true, rarity: true, hashPower: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Equipamentos disponíveis (não instalados, não no codex)
    prisma.equipment.findMany({
      where: { userId: user.id, inCodex: false, robot: null },
      select: { id: true, name: true, rarity: true, effectType: true, effectValue: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Base upgrades disponíveis (não aplicados, não no codex)
    prisma.baseUpgrade.findMany({
      where: { userId: user.id, inCodex: false, isApplied: false },
      select: { id: true, name: true, rarity: true, effectType: true, effectValue: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Unifica os itens disponíveis com tipo explícito
  const allAvailable = [
    ...availableRobots.map((r) => ({ ...r, itemType: 'ROBOT'        as const, stat: `${r.hashPower} ER` })),
    ...availableEquipments.map((e) => ({ ...e, itemType: 'EQUIPMENT'   as const, stat: `${e.effectValue} ${e.effectType}`, collection: '' })),
    ...availableBaseUpgrades.map((b) => ({ ...b, itemType: 'BASE_UPGRADE' as const, stat: `${b.effectValue} ${b.effectType}`, collection: '' })),
  ]

  const bonuses = computeCodexBonuses(collections, entries)

  // Monta as coleções com progresso e slots específicos
  const collectionsWithProgress = collections.map((col) => {
    const requiredItems = normalizeRequiredItems(col.requiredItems)
    const hasSpecificItems = requiredItems.length > 0
    const totalRequired = hasSpecificItems ? requiredItems.length : col.totalRequired

    const registered = entries.filter((e) => e.collection === col.name)
    const registeredKeys = new Set(registered.map((e) => `${e.itemType}::${e.itemName}`))

    // Filtra disponíveis:
    // - Modo específico: nome + tipo devem estar em requiredItems e slot não preenchido
    // - Modo legado: filtra pelo campo collection do robô
    const available = hasSpecificItems
      ? allAvailable.filter((item) =>
          requiredItems.some((r) => r.name === item.name && r.itemType === item.itemType) &&
          !registeredKeys.has(`${item.itemType}::${item.name}`)
        )
      : allAvailable.filter((item) => item.itemType === 'ROBOT' && (item as { collection: string }).collection === col.name)

    const isComplete = registered.length >= totalRequired

    // Slots nomeados para UI de álbum de figurinhas
    const slots = hasSpecificItems
      ? requiredItems.map((req) => {
          const key = `${req.itemType}::${req.name}`
          const entry = registered.find((e) => e.itemType === req.itemType && e.itemName === req.name) ?? null
          return { name: req.name, itemType: req.itemType, filled: registeredKeys.has(key), entry }
        })
      : null

    return {
      ...col,
      requiredItems,
      totalRequired,
      registeredCount: registered.length,
      registeredItems: registered,
      availableItems: available,
      isComplete,
      slots,
    }
  })

  return NextResponse.json({ collections: collectionsWithProgress, totalBonuses: bonuses })
}
