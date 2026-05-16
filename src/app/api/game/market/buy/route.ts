import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { incrementMission } from '@/lib/mission-progress'

const MARKET_FEE = 0.05  // 5%

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId } = await req.json()
  if (!listingId) return NextResponse.json({ error: 'Missing listingId.' }, { status: 400 })

  const listing = await prisma.marketListing.findUnique({
    where: { id: listingId },
    include: { robot: { include: { equipments: true } } },
  })

  if (!listing)                    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  if (listing.status !== 'ACTIVE') return NextResponse.json({ error: 'Listing is no longer active.' }, { status: 409 })
  if (listing.sellerId === user.id) return NextResponse.json({ error: 'You cannot buy your own listing.' }, { status: 409 })
  if (listing.expiresAt < new Date()) return NextResponse.json({ error: 'Listing has expired.' }, { status: 409 })

  const buyer = await prisma.user.findUnique({ where: { id: user.id }, select: { balanceCrate: true } })
  if (!buyer || buyer.balanceCrate < listing.price) {
    return NextResponse.json({ error: `Insufficient balance. Need ${listing.price} CRATE.` }, { status: 400 })
  }

  const fee            = listing.price * MARKET_FEE
  const sellerReceives = listing.price - fee

  await prisma.$transaction(async (tx) => {
    // Debita comprador, credita vendedor
    await tx.user.update({ where: { id: user.id },         data: { balanceCrate: { decrement: listing.price } } })
    await tx.user.update({ where: { id: listing.sellerId }, data: { balanceCrate: { increment: sellerReceives } } })

    // Transfere o item para o comprador
    if (listing.robotId) {
      await tx.robot.update({ where: { id: listing.robotId }, data: { userId: user.id } })
      // Transfere equipamentos instalados no robô junto com ele
      if (listing.robot?.equipments?.length) {
        await tx.equipment.updateMany({
          where: { id: { in: listing.robot.equipments.map((e) => e.equipmentId) } },
          data: { userId: user.id },
        })
      }
    }
    if (listing.equipmentId)   await tx.equipment.update({   where: { id: listing.equipmentId },   data: { userId: user.id } })
    if (listing.baseUpgradeId) await tx.baseUpgrade.update({ where: { id: listing.baseUpgradeId }, data: { userId: user.id, isApplied: false, appliedSlot: null } })

    // Marca a listagem como vendida
    await tx.marketListing.update({ where: { id: listingId }, data: { status: 'SOLD' } })

    // Cria registro de compra
    await tx.marketPurchase.create({ data: { listingId, buyerId: user.id, pricePaid: listing.price, fee } })

    // Registra transações
    await tx.transaction.createMany({
      data: [
        { userId: user.id,         type: 'MARKET_PURCHASE', token: 'CRATE', amount: listing.price,  status: 'CONFIRMED' },
        { userId: listing.sellerId, type: 'MARKET_SALE',     token: 'CRATE', amount: sellerReceives, status: 'CONFIRMED' },
      ],
    })

    // Notifica vendedor
    await tx.notification.create({
      data: {
        userId:  listing.sellerId,
        title:   'Item sold!',
        message: `Your listing sold for ${listing.price} CRATE (you received ${sellerReceives.toFixed(2)} after 5% fee).`,
      },
    })
  })

  void incrementMission(user.id,          'MARKET', 1)
  void incrementMission(listing.sellerId, 'MARKET', 1)

  return NextResponse.json({ success: true })
}
