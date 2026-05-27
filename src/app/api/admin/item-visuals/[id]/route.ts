import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

/** PATCH /api/admin/item-visuals/[id] — atualiza visual */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Aceita campos parciais — apenas o que for enviado é atualizado
  const data: Record<string, unknown> = {}
  const fields = [
    'category', 'key', 'rarity', 'label',
    'imageUrl', 'spriteIdleUrl', 'spriteActiveUrl', 'spriteLowUrl',
    'frameWidth', 'frameHeight', 'frameCount', 'fps',
  ]
  for (const f of fields) {
    if (f in body) {
      // Campos numéricos
      if (['frameWidth', 'frameHeight', 'frameCount', 'fps'].includes(f)) {
        data[f] = Number(body[f])
      } else {
        data[f] = body[f] === '' ? null : body[f]
      }
    }
  }

  try {
    const visual = await prisma.itemVisual.update({ where: { id }, data })
    return NextResponse.json(visual)
  } catch {
    return NextResponse.json({ error: 'Visual not found or update failed.' }, { status: 404 })
  }
}

/** DELETE /api/admin/item-visuals/[id] — remove visual */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    await prisma.itemVisual.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Visual not found.' }, { status: 404 })
  }
}
