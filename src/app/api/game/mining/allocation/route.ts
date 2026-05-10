import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
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

  const { crate, sol, lc } = await req.json()

  if (
    typeof crate !== 'number' ||
    typeof sol !== 'number' ||
    typeof lc !== 'number'
  ) {
    return NextResponse.json({ error: 'Invalid allocation values.' }, { status: 400 })
  }

  if (crate < 0 || sol < 0 || lc < 0) {
    return NextResponse.json({ error: 'Allocations cannot be negative.' }, { status: 400 })
  }

  const total = crate + sol + lc
  if (Math.abs(total - 100) > 0.01) {
    return NextResponse.json(
      { error: `Allocations must sum to 100%. Current sum: ${total.toFixed(1)}%` },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      allocationCrate: crate,
      allocationSol: sol,
      allocationLc: lc,
    },
  })

  return NextResponse.json({ success: true })
}
