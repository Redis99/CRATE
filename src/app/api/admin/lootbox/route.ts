import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const configs = await prisma.lootboxConfig.findMany({
    include: { dropEntries: { orderBy: { weight: 'desc' } } },
    orderBy: { lootboxType: 'asc' },
  })

  return NextResponse.json(configs)
}

export async function PUT(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const updated = await prisma.lootboxDropEntry.update({
    where: { id },
    data,
  })

  return NextResponse.json(updated)
}

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { action } = body

  if (action === 'add-entry') {
    const entry = await prisma.lootboxDropEntry.create({ data: body.entry })
    return NextResponse.json(entry)
  }

  if (action === 'delete-entry') {
    await prisma.lootboxDropEntry.delete({ where: { id: body.id } })
    return NextResponse.json({ success: true })
  }

  if (action === 'update-config') {
    const { id, ...data } = body.config
    const updated = await prisma.lootboxConfig.update({ where: { id }, data })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
