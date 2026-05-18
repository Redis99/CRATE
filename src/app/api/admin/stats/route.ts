import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    totalUsers,
    activeUsersToday,
    pendingWithdrawals,
    totalCrateBalance,
    totalRobots,
    recentTransactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.withdrawRequest.count({ where: { status: 'PENDING' } }),
    prisma.user.aggregate({ _sum: { balanceCrate: true } }),
    prisma.robot.count(),
    prisma.transaction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        token: true,
        amount: true,
        status: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    }),
  ])

  return NextResponse.json({
    totalUsers,
    activeUsersToday,
    pendingWithdrawals,
    totalCrateInGame: totalCrateBalance._sum.balanceCrate ?? 0,
    totalRobots,
    recentTransactions,
  })
}
