import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const [missions, userMissions] = await Promise.all([
    prisma.mission.findMany({
      where:   { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      orderBy: [{ category: 'asc' }, { target: 'asc' }],
    }),
    prisma.userMission.findMany({
      where: { userId: user.id },
    }),
  ])

  const progressMap = new Map(userMissions.map((um) => [um.missionId, um]))

  const result = missions.map((m) => {
    const um = progressMap.get(m.id)
    return {
      id:          m.id,
      title:       m.title,
      description: m.description,
      category:    m.category,
      target:      m.target,
      rewardType:  m.rewardType,
      rewardData:  m.rewardData,
      progress:    um?.progress    ?? 0,
      completed:   um?.completed   ?? false,
      completedAt: um?.completedAt ?? null,
      claimed:     !!um?.claimedAt,
      claimedAt:   um?.claimedAt   ?? null,
    }
  })

  return NextResponse.json({ missions: result })
}
