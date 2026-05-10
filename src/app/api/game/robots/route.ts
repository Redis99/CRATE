import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/game/robots — lista todos os robôs do jogador com contagem de equipamentos
export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const robots = await prisma.robot.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      rarity: true,
      hashPower: true,
      durability: true,
      isActive: true,
      outpostSlot: true,
      _count: { select: { equipments: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(robots)
}
