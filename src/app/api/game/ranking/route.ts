import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWeekStart } from '@/lib/weekly'

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekStart = getWeekStart()

  const [standings, lastSnapshot] = await Promise.all([
    // Live current-week standings
    prisma.user.findMany({
      where:   { weeklyErContributed: { gt: 0 } },
      select:  { id: true, username: true, weeklyErContributed: true },
      orderBy: { weeklyErContributed: 'desc' },
      take:    100,
    }),
    // Last week snapshot
    prisma.weeklySnapshot.findFirst({
      orderBy: { weekStart: 'desc' },
    }),
  ])

  const currentWeek = standings.map((u, idx) => ({
    position: idx + 1,
    userId:   u.id,
    username: u.username,
    erTotal:  u.weeklyErContributed,
    isMe:     u.id === user.id,
  }))

  // Find current user in standings (may not be in top 100)
  let myPosition = currentWeek.find((e) => e.isMe)?.position ?? null
  if (!myPosition) {
    const myUser = await prisma.user.findUnique({
      where:  { id: user.id },
      select: { weeklyErContributed: true },
    })
    if (myUser && myUser.weeklyErContributed > 0) {
      const rank = await prisma.user.count({
        where: { weeklyErContributed: { gt: myUser.weeklyErContributed } },
      })
      myPosition = rank + 1
    }
  }

  return NextResponse.json({
    weekStart:    weekStart.toISOString(),
    currentWeek,
    myPosition,
    lastSnapshot: lastSnapshot
      ? {
          weekStart: lastSnapshot.weekStart.toISOString(),
          entries:   lastSnapshot.entries,
        }
      : null,
  })
}
