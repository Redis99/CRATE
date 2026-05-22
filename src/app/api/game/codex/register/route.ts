import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { incrementMission } from '@/lib/mission-progress'
import { normalizeRequiredItems } from '@/lib/codex-types'
import type { CodexItemType } from '@/lib/codex-types'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { itemId, itemType } = body as { itemId?: string; itemType?: CodexItemType }

  if (!itemId || !itemType) {
    return NextResponse.json({ error: 'itemId and itemType are required' }, { status: 400 })
  }
  if (!['ROBOT', 'EQUIPMENT', 'BASE_UPGRADE'].includes(itemType)) {
    return NextResponse.json({ error: 'Invalid itemType' }, { status: 400 })
  }

  // 1. Busca e valida o item pelo tipo
  let itemName: string
  let itemRarity: string
  let itemCollection: string = ''

  if (itemType === 'ROBOT') {
    const robot = await prisma.robot.findUnique({
      where: { id: itemId },
      include: { listing: { select: { status: true } } },
    })
    if (!robot || robot.userId !== user.id) return NextResponse.json({ error: 'Robot not found' }, { status: 404 })
    if (robot.isActive)  return NextResponse.json({ error: 'Recall the robot from the Outpost before registering it' }, { status: 400 })
    if (robot.inCodex)   return NextResponse.json({ error: 'Robot is already in the Codex' }, { status: 400 })
    if (robot.listing?.status === 'ACTIVE') return NextResponse.json({ error: 'Cancel the market listing before registering' }, { status: 400 })
    itemName = robot.name
    itemRarity = robot.rarity
    itemCollection = robot.collection

  } else if (itemType === 'EQUIPMENT') {
    const eq = await prisma.equipment.findUnique({
      where: { id: itemId },
      include: { robot: true, listing: { select: { status: true } } },
    })
    if (!eq || eq.userId !== user.id) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    if (eq.robot)   return NextResponse.json({ error: 'Unequip from robot before registering' }, { status: 400 })
    if (eq.inCodex) return NextResponse.json({ error: 'Equipment is already in the Codex' }, { status: 400 })
    if (eq.listing?.status === 'ACTIVE') return NextResponse.json({ error: 'Cancel the market listing before registering' }, { status: 400 })
    itemName = eq.name
    itemRarity = eq.rarity

  } else {
    const bu = await prisma.baseUpgrade.findUnique({
      where: { id: itemId },
      include: { listing: { select: { status: true } } },
    })
    if (!bu || bu.userId !== user.id) return NextResponse.json({ error: 'Base upgrade not found' }, { status: 404 })
    if (bu.isApplied) return NextResponse.json({ error: 'Remove from base slot before registering' }, { status: 400 })
    if (bu.inCodex)   return NextResponse.json({ error: 'Base upgrade is already in the Codex' }, { status: 400 })
    if (bu.listing?.status === 'ACTIVE') return NextResponse.json({ error: 'Cancel the market listing before registering' }, { status: 400 })
    itemName = bu.name
    itemRarity = bu.rarity
  }

  // 2. Encontra a coleção pelo nome do item ou pelo campo collection do robô
  // Modo específico: procura coleção que tenha este item em requiredItems
  // Modo legado (robot): usa Robot.collection para encontrar a coleção
  const allCollections = await prisma.codexCollection.findMany({ where: { active: true } })

  const collection = allCollections.find((col) => {
    const reqItems = normalizeRequiredItems(col.requiredItems)
    if (reqItems.length > 0) {
      return reqItems.some((r) => r.name === itemName && r.itemType === itemType)
    }
    // Modo legado: apenas robôs, match por collection field
    return itemType === 'ROBOT' && col.name === itemCollection
  })

  if (!collection) {
    return NextResponse.json({ error: 'This item is not part of any active Codex collection' }, { status: 400 })
  }

  // 3. Verifica slot já preenchido
  const existingSlot = await prisma.codexEntry.findUnique({
    where: { userId_collection_itemName: { userId: user.id, collection: collection.name, itemName } },
  })
  if (existingSlot) {
    return NextResponse.json({ error: `The slot for "${itemName}" is already filled in this collection` }, { status: 400 })
  }

  // 4. Conta slots já preenchidos e verifica limite
  const requiredItems = normalizeRequiredItems(collection.requiredItems)
  const hasSpecificItems = requiredItems.length > 0
  const totalRequired = hasSpecificItems ? requiredItems.length : collection.totalRequired

  const currentCount = hasSpecificItems
    ? await prisma.codexEntry.count({
        where: { userId: user.id, collection: collection.name, itemName: { in: requiredItems.map((r) => r.name) } },
      })
    : await prisma.codexEntry.count({ where: { userId: user.id, collection: collection.name } })

  if (currentCount >= totalRequired) {
    return NextResponse.json({ error: 'This collection is already complete' }, { status: 400 })
  }

  // 5. Executa registro em transação
  const isNowComplete = currentCount + 1 >= totalRequired

  const [entry] = await prisma.$transaction(async (tx) => {
    const e = await tx.codexEntry.create({
      data: {
        userId:     user.id,
        itemType,
        itemName,
        collection: collection.name,
        rarity:     itemRarity as never,
        ...(itemType === 'ROBOT'        && { robotId: itemId }),
        ...(itemType === 'EQUIPMENT'    && { equipmentId: itemId }),
        ...(itemType === 'BASE_UPGRADE' && { baseUpgradeId: itemId }),
      },
    })

    // Marca o item como registrado no Codex
    if (itemType === 'ROBOT') {
      await tx.robot.update({ where: { id: itemId }, data: { inCodex: true, isActive: false, outpostSlot: null } })
    } else if (itemType === 'EQUIPMENT') {
      await tx.equipment.update({ where: { id: itemId }, data: { inCodex: true } })
    } else {
      await tx.baseUpgrade.update({ where: { id: itemId }, data: { inCodex: true, isApplied: false, appliedSlot: null } })
    }

    // Recompensas de completude (one-time grant)
    if (isNowComplete) {
      const alreadyGranted = await tx.codexCompletionReward.findUnique({
        where: { userId_collectionName: { userId: user.id, collectionName: collection.name } },
      })
      if (!alreadyGranted) {
        const ops: Promise<unknown>[] = [
          tx.codexCompletionReward.create({ data: { userId: user.id, collectionName: collection.name } }),
        ]
        if (collection.completionSlots > 0) {
          ops.push(tx.user.update({ where: { id: user.id }, data: { outpostSlots: { increment: collection.completionSlots } } }))
        }
        if (collection.completionTitle) {
          ops.push(
            tx.userTitle.upsert({
              where:  { userId_title: { userId: user.id, title: collection.completionTitle } },
              create: { userId: user.id, title: collection.completionTitle, source: 'CODEX' },
              update: {},
            })
          )
        }
        const slotMsg  = collection.completionSlots > 0 ? ` and ${collection.completionSlots} extra Outpost slot(s)` : ''
        const titleMsg = collection.completionTitle ? ` You also earned the title "${collection.completionTitle}"!` : ''
        ops.push(
          tx.notification.create({
            data: {
              userId:  user.id,
              title:   `Collection complete: ${collection.name}`,
              message: `You completed the collection and earned a permanent +${collection.completionErPct}% ER bonus${slotMsg}!${titleMsg}`,
            },
          })
        )
        await Promise.all(ops)
      }
    }

    return [e]
  })

  void incrementMission(user.id, 'CODEX', 1)

  return NextResponse.json({
    success: true,
    entry,
    isCollectionComplete: isNowComplete,
    slotsGranted: isNowComplete ? collection.completionSlots : 0,
  })
}
