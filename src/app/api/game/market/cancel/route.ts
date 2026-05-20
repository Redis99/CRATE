import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId } = await req.json()
  if (!listingId) return NextResponse.json({ error: 'Missing listingId.' }, { status: 400 })

  const listing = await prisma.marketListing.findUnique({ where: { id: listingId } })

  if (!listing)                    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  if (listing.sellerId !== user.id) return NextResponse.json({ error: 'Not your listing.' }, { status: 403 })
  if (listing.status !== 'ACTIVE') return NextResponse.json({ error: 'Listing is not active.' }, { status: 409 })

  // Desvincula o item ao cancelar — permite re-listagem futura
  await prisma.marketListing.update({
    where: { id: listingId },
    data:  { status: 'CANCELLED', robotId: null, equipmentId: null, baseUpgradeId: null },
  })

  return NextResponse.json({ success: true })
}
