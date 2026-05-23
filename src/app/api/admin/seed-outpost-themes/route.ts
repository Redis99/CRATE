/**
 * Seed inicial de Outpost Themes — cria o tema 'default' (sempre presente, não removível).
 * Idempotente: skip se já existir.
 * POST /api/admin/seed-outpost-themes  (admin session ou Bearer CRON_SECRET)
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    const { getAdminUser } = await import('@/lib/admin-auth')
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let created = 0
  let skipped = 0

  const SEEDS = [
    {
      slug: 'default',
      name: 'Default',
      description: 'Standard Outpost appearance — always available as fallback.',
      layoutKey: 'default',
      sortOrder: 0,
      active: true,
    },
  ]

  for (const s of SEEDS) {
    const existing = await prisma.outpostTheme.findUnique({ where: { slug: s.slug } })
    if (existing) { skipped++; continue }
    await prisma.outpostTheme.create({ data: s })
    created++
  }

  // Garante linha singleton de OutpostActiveTheme
  await prisma.outpostActiveTheme.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', themeSlug: 'default', forcedSlug: null },
  })

  return NextResponse.json({ success: true, created, skipped })
}
