import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { incrementMission } from '@/lib/mission-progress'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { robotId } = body as { robotId?: string }

  if (!robotId) {
    return NextResponse.json({ error: 'robotId is required' }, { status: 400 })
  }

  // 1. Valida que o robô pertence ao jogador e está disponível
  const robot = await prisma.robot.findUnique({
    where: { id: robotId },
    include: { listing: { select: { id: true, status: true } } },
  })

  if (!robot || robot.userId !== user.id) {
    return NextResponse.json({ error: 'Robot not found' }, { status: 404 })
  }
  if (robot.isActive) {
    return NextResponse.json({ error: 'Recall the robot from the Outpost before registering it' }, { status: 400 })
  }
  if (robot.inCodex) {
    return NextResponse.json({ error: 'Robot is already in the Codex' }, { status: 400 })
  }
  if (robot.listing?.status === 'ACTIVE') {
    return NextResponse.json({ error: 'Cancel the market listing before registering' }, { status: 400 })
  }

  // 2. Verifica se a coleção do robô existe no Codex
  const collection = await prisma.codexCollection.findUnique({
    where: { name: robot.collection },
  })
  if (!collection || !collection.active) {
    return NextResponse.json({ error: 'This robot\'s collection is not part of the Codex' }, { status: 400 })
  }

  // 3. Verifica se já existe entry para este robô (double-submission guard)
  const existingByRobot = await prisma.codexEntry.findUnique({ where: { robotId } })
  if (existingByRobot) {
    return NextResponse.json({ error: 'Robot is already in the Codex' }, { status: 400 })
  }

  // 4. Valida mecânica de álbum de figurinhas
  const requiredItems = (collection.requiredItems as string[]) ?? []
  const hasSpecificItems = requiredItems.length > 0
  const totalRequired = hasSpecificItems ? requiredItems.length : collection.totalRequired

  if (hasSpecificItems) {
    // O robô precisa ter um nome que pertença à lista de itens requeridos
    if (!requiredItems.includes(robot.name)) {
      return NextResponse.json({ error: 'This robot is not one of the required items for this collection' }, { status: 400 })
    }
    // O slot deste nome já foi preenchido?
    const slotTaken = await prisma.codexEntry.findUnique({
      where: { userId_collection_itemName: { userId: user.id, collection: collection.name, itemName: robot.name } },
    })
    if (slotTaken) {
      return NextResponse.json({ error: `The slot for "${robot.name}" is already filled in this collection` }, { status: 400 })
    }
  }

  // 5. Verifica quantos slots já estão preenchidos
  const currentCount = hasSpecificItems
    ? await prisma.codexEntry.count({
        where: { userId: user.id, collection: collection.name, itemName: { in: requiredItems } },
      })
    : await prisma.codexEntry.count({
        where: { userId: user.id, collection: collection.name },
      })

  if (currentCount >= totalRequired) {
    return NextResponse.json({ error: 'This collection is already complete' }, { status: 400 })
  }

  // 6. Executa o registro em transação
  const newCount = currentCount + 1
  const isNowComplete = newCount >= totalRequired

  const [entry] = await prisma.$transaction(async (tx) => {
    // Cria a CodexEntry
    const e = await tx.codexEntry.create({
      data: {
        userId:     user.id,
        itemType:   'ROBOT',
        itemName:   robot.name,
        collection: collection.name,
        rarity:     robot.rarity,
        robotId:    robot.id,
      },
    })

    // Marca o robô como registrado no Codex (remove do inventário utilizável)
    await tx.robot.update({
      where: { id: robot.id },
      data: { inCodex: true, isActive: false, outpostSlot: null },
    })

    // Concede recompensas de completude (slots, título, notificação) — one-time grant
    if (isNowComplete) {
      // Verifica se já foi concedido antes (guard de idempotência)
      const alreadyGranted = await tx.codexCompletionReward.findUnique({
        where: { userId_collectionName: { userId: user.id, collectionName: collection.name } },
      })
      if (!alreadyGranted) {
        const ops: Promise<unknown>[] = [
          tx.codexCompletionReward.create({
            data: { userId: user.id, collectionName: collection.name },
          }),
        ]

        if (collection.completionSlots > 0) {
          ops.push(
            tx.user.update({
              where: { id: user.id },
              data: { outpostSlots: { increment: collection.completionSlots } },
            }),
          )
        }

        // Concede título se a coleção tiver um definido
        if (collection.completionTitle) {
          ops.push(
            tx.userTitle.upsert({
              where:  { userId_title: { userId: user.id, title: collection.completionTitle } },
              create: { userId: user.id, title: collection.completionTitle, source: 'CODEX' },
              update: {},
            }),
          )
        }

        const slotMsg  = collection.completionSlots > 0
          ? ` and ${collection.completionSlots} extra Outpost slot(s)`
          : ''
        const titleMsg = collection.completionTitle
          ? ` You also earned the title "${collection.completionTitle}"!`
          : ''

        ops.push(
          tx.notification.create({
            data: {
              userId:  user.id,
              title:   `Collection complete: ${collection.name}`,
              message: `You've completed the collection and earned a permanent +${collection.completionErPct}% ER bonus${slotMsg}!${titleMsg}`,
            },
          }),
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
