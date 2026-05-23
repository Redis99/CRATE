import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// Whitelist de campos editáveis
const FIELDS = [
  'slug','name','description','layoutKey',
  'accentColor','bgColor','borderColor',
  'bannerText','bannerSubtext','bannerIcon',
  'startsAt','endsAt','active','sortOrder',
] as const

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick(body: Record<string, any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: Record<string, any> = {}
  for (const k of FIELDS) if (k in body) out[k] = body[k]
  return out
}

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [themes, activeTheme] = await Promise.all([
    prisma.outpostTheme.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    prisma.outpostActiveTheme.findUnique({ where: { id: 'singleton' } }),
  ])

  // Determina qual tema está ativo agora (mesma lógica do endpoint público)
  const now = new Date()
  let currentSlug = 'default'
  let source: 'forced' | 'scheduled' | 'fallback' = 'fallback'

  if (activeTheme?.forcedSlug) {
    currentSlug = activeTheme.forcedSlug
    source = 'forced'
  } else {
    const scheduled = themes.find(t =>
      t.active &&
      (t.startsAt === null || t.startsAt <= now) &&
      (t.endsAt   === null || t.endsAt   >= now)
    )
    if (scheduled) {
      currentSlug = scheduled.slug
      source = 'scheduled'
    }
  }

  return NextResponse.json({ themes, currentSlug, source })
}

export async function POST(req: NextRequest) {
  // Aceita tanto admin session quanto CRON_SECRET (para seed)
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    const admin = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.slug || !body.name || !body.layoutKey) {
    return NextResponse.json({ error: 'slug, name and layoutKey required' }, { status: 400 })
  }

  const existing = await prisma.outpostTheme.findUnique({ where: { slug: body.slug } })
  if (existing) return NextResponse.json({ error: `Theme "${body.slug}" already exists` }, { status: 409 })

  const data = pick(body)
  data.description = data.description ?? ''
  if (data.startsAt) data.startsAt = new Date(data.startsAt)
  if (data.endsAt)   data.endsAt   = new Date(data.endsAt)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theme = await prisma.outpostTheme.create({ data: data as any })
  return NextResponse.json(theme)
}
