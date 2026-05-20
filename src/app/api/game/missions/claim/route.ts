import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deliverMissionReward } from '@/lib/mission-progress'

export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { missionId } = await req.json() as { missionId: string }
  if (!missionId) return NextResponse.json({ error: 'Missing missionId.' }, { status: 400 })

  const [mission, userMission] = await Promise.all([
    prisma.mission.findUnique({ where: { id: missionId } }),
    prisma.userMission.findUnique({
      where: { userId_missionId: { userId: user.id, missionId } },
    }),
  ])

  if (!mission) return NextResponse.json({ error: 'Mission not found.' }, { status: 404 })
  if (mission.expiresAt && mission.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Mission has expired.' }, { status: 404 })
  }
  if (!userMission?.completed) return NextResponse.json({ error: 'Mission not completed yet.' }, { status: 400 })
  if (userMission.claimedAt)   return NextResponse.json({ error: 'Reward already claimed.'   }, { status: 400 })

  // Marca como claimed atomicamente antes de entregar a recompensa.
  // updateMany com claimedAt: null no WHERE garante que apenas um request
  // concorrente consegue fazer a marcação (o segundo vê count = 0).
  const claimed = await prisma.userMission.updateMany({
    where: { userId: user.id, missionId, claimedAt: null },
    data:  { claimedAt: new Date() },
  })
  if (claimed.count === 0) {
    return NextResponse.json({ error: 'Reward already claimed.' }, { status: 400 })
  }

  const rewardData = mission.rewardData as Record<string, unknown>
  const error = await deliverMissionReward(user.id, mission.rewardType, rewardData)
  if (error) return NextResponse.json({ error }, { status: 400 })

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type:   'MISSION_REWARD',
      token:  'CRATE',
      amount: 0,
      status: 'CONFIRMED',
    },
  })

  return NextResponse.json({ success: true, rewardType: mission.rewardType, rewardData })
}
