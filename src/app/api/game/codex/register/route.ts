import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
  const existing = await prisma.codexEntry.findUnique({ where: { robotId } })
  if (existing) {
    return NextResponse.json({ error: 'Robot is already in the Codex' }, { status: 400 })
  }

  // 4. Verifica quantos itens desta coleção já estão registrados
  const currentCount = await prisma.codexEntry.count({
    where: { userId: user.id, collection: collection.name },
  })
  if (currentCount >= collection.totalRequired) {
    return NextResponse.json({ error: 'This collection is already complete' }, { status: 400 })
  }

  // 5. Executa o registro em transação
  const newCount = currentCount + 1
  const isNowComplete = newCount >= collection.totalRequired

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

    // Concede slots de outpost se a coleção foi completada agora (one-time grant)
    if (isNowComplete && collection.completionSlots > 0) {
      // Verifica se já foi concedido antes (guard de idempotência)
      const alreadyGranted = await tx.codexCompletionReward.findUnique({
        where: { userId_collectionName: { userId: user.id, collectionName: collection.name } },
      })
      if (!alreadyGranted) {
        await Promise.all([
          tx.user.update({
            where: { id: user.id },
            data: { outpostSlots: { increment: collection.completionSlots } },
          }),
          tx.codexCompletionReward.create({
            data: { userId: user.id, collectionName: collection.name },
          }),
          tx.notification.create({
            data: {
              userId:  user.id,
              title:   `Collection complete: ${collection.name}`,
              message: `You've completed the collection and earned ${collection.completionSlots} extra Outpost slot(s) and a permanent +${collection.completionErPct}% ER bonus!`,
            },
          }),
        ])
      }
    }

    return [e]
  })

  return NextResponse.json({
    success: true,
    entry,
    isCollectionComplete: isNowComplete,
    slotsGranted: isNowComplete ? collection.completionSlots : 0,
  })
}
