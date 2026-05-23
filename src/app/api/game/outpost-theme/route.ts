import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/game/outpost-theme
// Resolve qual tema do Outpost está ativo no momento.
// Ordem de prioridade:
//   1. OutpostActiveTheme.forcedSlug (override manual do admin)
//   2. Tema com active=true e dentro da janela startsAt/endsAt (mais recente)
//   3. 'default'
export async function GET(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [active, themes] = await Promise.all([
    prisma.outpostActiveTheme.findUnique({ where: { id: 'singleton' } }),
    prisma.outpostTheme.findMany({
      where: { active: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  let theme = null
  let source: 'forced' | 'scheduled' | 'fallback' = 'fallback'

  // 1. Override manual
  if (active?.forcedSlug) {
    theme = await prisma.outpostTheme.findUnique({ where: { slug: active.forcedSlug } })
    if (theme) source = 'forced'
  }

  // 2. Agendamento
  if (!theme) {
    const now = new Date()
    const scheduled = themes.find(t =>
      (t.startsAt === null || t.startsAt <= now) &&
      (t.endsAt   === null || t.endsAt   >= now)
    )
    if (scheduled) {
      theme = scheduled
      source = 'scheduled'
    }
  }

  // 3. Fallback
  if (!theme) {
    theme = await prisma.outpostTheme.findUnique({ where: { slug: 'default' } })
    source = 'fallback'
  }

  return NextResponse.json({
    slug:        theme?.slug        ?? 'default',
    layoutKey:   theme?.layoutKey   ?? 'default',
    name:        theme?.name        ?? 'Default',
    description: theme?.description ?? '',
    accentColor: theme?.accentColor ?? null,
    bgColor:     theme?.bgColor     ?? null,
    borderColor: theme?.borderColor ?? null,
    bannerText:    theme?.bannerText    ?? null,
    bannerSubtext: theme?.bannerSubtext ?? null,
    bannerIcon:    theme?.bannerIcon    ?? null,
    source,
  })
}
