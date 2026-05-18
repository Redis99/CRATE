import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = 20

  const where = search
    ? {
        OR: [
          { username: { contains: search, mode: 'insensitive' as const } },
          { email:    { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [players, total] = await Promise.all([
    prisma.user.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        balanceCrate: true,
        balanceSol: true,
        balanceLc: true,
        isBanned: true,
        isAdmin: true,
        _count: { select: { robots: true, transactions: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ players, total, page, pages: Math.ceil(total / limit) })
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, action, amount, token, note } = await req.json() as {
    id: string
    action: 'ban' | 'unban' | 'airdrop'
    amount?: number
    token?: string
    note?: string
  }

  if (!id || !action) {
    return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
  }

  if (action === 'ban') {
    await prisma.user.update({ where: { id }, data: { isBanned: true } })
    return NextResponse.json({ success: true })
  }

  if (action === 'unban') {
    await prisma.user.update({ where: { id }, data: { isBanned: false } })
    return NextResponse.json({ success: true })
  }

  if (action === 'airdrop') {
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const field = token === 'SOL' ? 'balanceSol' : token === 'LC' ? 'balanceLc' : 'balanceCrate'

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { [field]: { increment: amount } },
      }),
      prisma.transaction.create({
        data: {
          userId: id,
          type: 'DEPOSIT',
          token: token === 'SOL' ? 'SOL' : token === 'LC' ? 'LC' : 'CRATE',
          amount,
          status: 'CONFIRMED',
        },
      }),
      prisma.notification.create({
        data: {
          userId: id,
          title: 'Airdrop',
          message: note ?? `You received an airdrop of ${amount} ${token ?? 'CRATE'}.`,
          read: false,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
