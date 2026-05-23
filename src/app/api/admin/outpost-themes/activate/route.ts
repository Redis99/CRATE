import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// POST /api/admin/outpost-themes/activate  { slug }
// Define o tema ativo manualmente (atualiza forcedSlug)
export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { slug } = await req.json()
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  // Verifica se o tema existe
  const theme = await prisma.outpostTheme.findUnique({ where: { slug } })
  if (!theme) return NextResponse.json({ error: `Theme "${slug}" not found` }, { status: 404 })

  const active = await prisma.outpostActiveTheme.upsert({
    where: { id: 'singleton' },
    update: { forcedSlug: slug, themeSlug: slug },
    create: { id: 'singleton', themeSlug: slug, forcedSlug: slug },
  })

  return NextResponse.json(active)
}
