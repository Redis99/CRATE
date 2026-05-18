import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { userId, message, broadcast } = await req.json() as {
    userId?: string
    message: string
    broadcast?: boolean
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  if (broadcast) {
    const users = await prisma.user.findMany({ select: { id: true } })
    await prisma.notification.createMany({
      data: users.map(u => ({
        userId: u.id,
        title: 'Announcement',
        message,
        read: false,
      })),
    })
    return NextResponse.json({ sent: users.length })
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId required for non-broadcast' }, { status: 400 })
  }

  await prisma.notification.create({
    data: { userId, title: 'Message', message, read: false },
  })

  return NextResponse.json({ success: true })
}
