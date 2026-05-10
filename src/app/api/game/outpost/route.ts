import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      outpostSlots: true,
      robots: {
        select: {
          id: true,
          name: true,
          collection: true,
          rarity: true,
          hashPower: true,
          durability: true,
          isActive: true,
          outpostSlot: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json(profile)
}
