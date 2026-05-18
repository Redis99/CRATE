import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// POST — airdrop de um robô específico direto para um jogador
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, robotItemId } = await req.json()
  if (!userId || !robotItemId) {
    return NextResponse.json({ error: 'userId and robotItemId required' }, { status: 400 })
  }

  const [shopItem, player] = await Promise.all([
    prisma.shopItem.findUnique({ where: { id: robotItemId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, slotsRobots: true, _count: { select: { robots: true } } },
    }),
  ])

  if (!shopItem) return NextResponse.json({ error: 'Robot not found' }, { status: 404 })
  if (!player)   return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  if (player._count.robots >= player.slotsRobots) {
    return NextResponse.json({ error: `${player.username} robot inventory is full (${player._count.robots}/${player.slotsRobots})` }, { status: 400 })
  }

  const meta = shopItem.metadata as Record<string, unknown>

  const robot = await prisma.robot.create({
    data: {
      userId:     userId,
      name:       String(meta.robotName ?? shopItem.name),
      collection: String(meta.robotCollection ?? ''),
      rarity:     shopItem.rarity as 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY',
      hashPower:  Number(meta.hashPower  ?? 10),
      energyRate: Number(meta.energyRate ?? 1),
      durability: 100,
    },
  })

  await prisma.notification.create({
    data: {
      userId,
      title: 'Robot Received',
      message: `You received a ${shopItem.rarity} robot: ${robot.name}!`,
      read: false,
    },
  })

  return NextResponse.json({ success: true, robot: { id: robot.id, name: robot.name } })
}
