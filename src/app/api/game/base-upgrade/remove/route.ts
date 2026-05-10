import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { upgradeId } = await req.json()
  if (!upgradeId) return NextResponse.json({ error: 'Missing upgradeId.' }, { status: 400 })

  const upgrade = await prisma.baseUpgrade.findFirst({
    where: { id: upgradeId, userId: user.id },
  })

  if (!upgrade)         return NextResponse.json({ error: 'Base upgrade not found.' }, { status: 404 })
  if (!upgrade.isApplied) return NextResponse.json({ error: 'This upgrade is not applied.' }, { status: 400 })

  await prisma.baseUpgrade.update({
    where: { id: upgradeId },
    data: { isApplied: false, appliedSlot: null },
  })

  return NextResponse.json({ success: true })
}
