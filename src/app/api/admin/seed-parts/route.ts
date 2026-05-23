/**
 * Seed do catálogo de peças — popula a tabela parts_catalog com as peças hardcoded.
 * Idempotente: skip se já existir (por partType).
 * POST /api/admin/seed-parts  (admin session ou Bearer CRON_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PARTS_BY_CATEGORY } from '@/lib/parts-data'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    const { getAdminUser } = await import('@/lib/admin-auth')
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let created = 0
  let skipped = 0

  for (const [category, parts] of Object.entries(PARTS_BY_CATEGORY)) {
    for (const partType of parts) {
      const existing = await prisma.part.findUnique({ where: { partType } })
      if (existing) { skipped++; continue }

      await prisma.part.create({
        data: {
          partType,
          category: category as 'ENERGY' | 'MINING' | 'MAINTENANCE' | 'TERRAIN' | 'AI_SOFTWARE' | 'SPECIAL',
          active: true,
        },
      })
      created++
    }
  }

  return NextResponse.json({ success: true, created, skipped })
}
