import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

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

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const body = await req.json()
  const data = pick(body)

  if ('startsAt' in data) data.startsAt = data.startsAt ? new Date(data.startsAt) : null
  if ('endsAt'   in data) data.endsAt   = data.endsAt   ? new Date(data.endsAt)   : null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theme = await prisma.outpostTheme.update({ where: { id }, data: data as any })
  return NextResponse.json(theme)
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params

  // Não permite deletar o tema default (proteção)
  const theme = await prisma.outpostTheme.findUnique({ where: { id } })
  if (!theme) return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
  if (theme.slug === 'default') return NextResponse.json({ error: 'Default theme cannot be removed' }, { status: 400 })

  // Se este tema está forçado, limpa o forcedSlug
  const active = await prisma.outpostActiveTheme.findUnique({ where: { id: 'singleton' } })
  if (active?.forcedSlug === theme.slug) {
    await prisma.outpostActiveTheme.update({ where: { id: 'singleton' }, data: { forcedSlug: null } })
  }

  await prisma.outpostTheme.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
