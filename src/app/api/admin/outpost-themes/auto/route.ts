import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// POST /api/admin/outpost-themes/auto
// Limpa forcedSlug — volta a respeitar startsAt/endsAt dos themes
export async function POST(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const active = await prisma.outpostActiveTheme.upsert({
    where: { id: 'singleton' },
    update: { forcedSlug: null },
    create: { id: 'singleton', themeSlug: 'default', forcedSlug: null },
  })

  return NextResponse.json(active)
}
