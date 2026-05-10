import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
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
