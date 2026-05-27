import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** GET /api/admin/item-visuals — lista todos os visuais */
export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const visuals = await prisma.itemVisual.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }, { rarity: 'asc' }],
  })
  return NextResponse.json(visuals)
}

/** POST /api/admin/item-visuals — cria novo visual */
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    category, key, rarity = null, label = null,
    imageUrl = null,
    spriteIdleUrl = null, spriteActiveUrl = null, spriteLowUrl = null,
    frameWidth = 128, frameHeight = 128, frameCount = 1, fps = 8,
  } = body

  if (!category || !key) {
    return NextResponse.json({ error: 'category and key are required.' }, { status: 400 })
  }

  try {
    const visual = await prisma.itemVisual.create({
      data: {
        category, key,
        rarity:          rarity   || null,
        label:           label    || null,
        imageUrl:        imageUrl || null,
        spriteIdleUrl:   spriteIdleUrl   || null,
        spriteActiveUrl: spriteActiveUrl || null,
        spriteLowUrl:    spriteLowUrl    || null,
        frameWidth:      Number(frameWidth),
        frameHeight:     Number(frameHeight),
        frameCount:      Number(frameCount),
        fps:             Number(fps),
      },
    })
    return NextResponse.json(visual, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Visual already exists for this category/key/rarity.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create visual.' }, { status: 500 })
  }
}
