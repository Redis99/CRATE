import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const LISTING_DAYS   = 7
const MIN_PRICE      = 0.01
const MAX_PRICE      = 1_000_000

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { itemType, itemId, price } = await req.json() as {
    itemType: 'ROBOT' | 'EQUIPMENT' | 'BASE_UPGRADE'
    itemId:   string
    price:    number
  }

  if (!itemType || !itemId || !price) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }
  if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) {
    return NextResponse.json({
      error: `Price must be between ${MIN_PRICE} and ${MAX_PRICE.toLocaleString()} CRATE.`,
    }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + LISTING_DAYS * 24 * 60 * 60 * 1000)

  // Valida e cria a listagem conforme o tipo de item
  const now = new Date()

  switch (itemType) {
    case 'ROBOT': {
      const robot = await prisma.robot.findFirst({ where: { id: itemId, userId: user.id }, include: { listing: true } })
      if (!robot)         return NextResponse.json({ error: 'Robot not found.' }, { status: 404 })
      if (robot.isActive) return NextResponse.json({ error: 'Recall the robot from the Outpost before listing.' }, { status: 409 })
      if (robot.inCodex)  return NextResponse.json({ error: 'This robot is permanently registered in the Codex.' }, { status: 409 })
      // Bloqueia apenas listagem ACTIVE não-expirada; SOLD/CANCELLED já têm FK nula
      if (robot.listing?.status === 'ACTIVE' && robot.listing.expiresAt > now) {
        return NextResponse.json({ error: 'Robot is already listed.' }, { status: 409 })
      }

      await prisma.marketListing.create({
        data: { sellerId: user.id, itemType: 'ROBOT', price, expiresAt, robotId: itemId },
      })
      break
    }

    case 'EQUIPMENT': {
      const eq = await prisma.equipment.findFirst({ where: { id: itemId, userId: user.id }, include: { robot: true, listing: true } })
      if (!eq)      return NextResponse.json({ error: 'Equipment not found.' }, { status: 404 })
      if (eq.robot) return NextResponse.json({ error: 'Unequip from robot before listing.' }, { status: 409 })
      if (eq.listing?.status === 'ACTIVE' && eq.listing.expiresAt > now) {
        return NextResponse.json({ error: 'Equipment is already listed.' }, { status: 409 })
      }

      await prisma.marketListing.create({
        data: { sellerId: user.id, itemType: 'EQUIPMENT', price, expiresAt, equipmentId: itemId },
      })
      break
    }

    case 'BASE_UPGRADE': {
      const bu = await prisma.baseUpgrade.findFirst({ where: { id: itemId, userId: user.id }, include: { listing: true } })
      if (!bu)          return NextResponse.json({ error: 'Base upgrade not found.' }, { status: 404 })
      if (bu.isApplied) return NextResponse.json({ error: 'Remove from base slot before listing.' }, { status: 409 })
      if (bu.listing?.status === 'ACTIVE' && bu.listing.expiresAt > now) {
        return NextResponse.json({ error: 'Base upgrade is already listed.' }, { status: 409 })
      }

      await prisma.marketListing.create({
        data: { sellerId: user.id, itemType: 'BASE_UPGRADE', price, expiresAt, baseUpgradeId: itemId },
      })
      break
    }

    default:
      return NextResponse.json({ error: 'Invalid item type.' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
