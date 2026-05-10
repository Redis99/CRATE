import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [profile, transactions, withdrawRequests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        depositAddress: true,
        balanceCrate: true,
        balanceSol: true,
        balanceLc: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.withdrawRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return NextResponse.json({ profile, transactions, withdrawRequests })
}
