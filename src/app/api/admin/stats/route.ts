import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const txType   = searchParams.get('txType')   // e.g. DEPOSIT, WITHDRAW, etc.
  const username = searchParams.get('username')  // filter by username
  const page     = parseInt(searchParams.get('page') ?? '1', 10)
  const limit    = 30

  // If filtering, return only transactions (paginated)
  if (txType || username) {
    const userFilter = username
      ? { user: { username: { contains: username, mode: 'insensitive' as const } } }
      : {}
    const typeFilter = txType && txType !== 'ALL' ? { type: txType as never } : {}

    const where = { ...typeFilter, ...userFilter }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
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
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({
      transactions,
      total,
      page,
      pages: Math.ceil(total / limit),
    })
  }

  // Default: full dashboard stats
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
      where: { updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
    prisma.withdrawRequest.count({ where: { status: 'PENDING' } }),
    prisma.user.aggregate({ _sum: { balanceCrate: true } }),
    prisma.robot.count(),
    prisma.transaction.findMany({
      take: 30,
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
