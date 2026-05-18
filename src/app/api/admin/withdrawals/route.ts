import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'PENDING'

  const withdrawals = await prisma.withdrawRequest.findMany({
    where: { status: status as 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { username: true, email: true } } },
  })

  return NextResponse.json(withdrawals)
}

export async function PATCH(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, status, txHash } = await req.json() as {
    id: string
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
    txHash?: string
  }

  if (!id || !status) {
    return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
  }

  const updated = await prisma.withdrawRequest.update({
    where: { id },
    data: {
      status,
      txHash: txHash ?? undefined,
      processedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined,
    },
  })

  return NextResponse.json(updated)
}
