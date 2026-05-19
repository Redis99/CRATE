import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Busca todos os robôs ativos — filtra em JS porque cada robô tem seu próprio maxDurability
  const allRobots = await prisma.robot.findMany({
    where: { userId: user.id, isActive: true },
    orderBy: { durability: 'asc' },
    select: { id: true, durability: true, maxDurability: true },
  })

  // Robôs que não estão no máximo (maxDurability ?? 100 = padrão para robôs antigos)
  const robots = allRobots.filter((r) => r.durability < (r.maxDurability ?? 100))

  if (robots.length === 0) {
    return NextResponse.json({ success: true, message: 'All robots already at full energy.', batteriesUsed: 0, robotsRecharged: 0 })
  }

  // Busca baterias ordenadas pelo menor valor primeiro (qualidade menor = priority)
  const batteries = await prisma.consumable.findMany({
    where: { userId: user.id, consumableType: 'REPAIR_KIT' },
    orderBy: { value: 'asc' },
  })

  if (batteries.length === 0) {
    return NextResponse.json({ error: 'No batteries in inventory.' }, { status: 400 })
  }

  // Simula uso das baterias — do menor valor para o maior
  const robotEnergy    = new Map(robots.map((r) => [r.id, r.durability]))
  const robotMax       = new Map(robots.map((r) => [r.id, r.maxDurability ?? 100]))
  const batteryRemaining = new Map(batteries.map((b) => [b.id, b.quantity]))
  let batteriesUsed = 0

  outer:
  for (const battery of batteries) {
    const remaining = batteryRemaining.get(battery.id)!

    for (const robot of robots) {
      const maxEnergy    = robotMax.get(robot.id)!
      let currentEnergy  = robotEnergy.get(robot.id)!
      if (currentEnergy >= maxEnergy) continue

      let qty = batteryRemaining.get(battery.id)!
      while (qty > 0 && currentEnergy < maxEnergy) {
        currentEnergy = Math.min(maxEnergy, currentEnergy + battery.value)
        qty--
        batteriesUsed++
      }

      robotEnergy.set(robot.id, currentEnergy)
      batteryRemaining.set(battery.id, qty)

      if (qty === 0) continue
    }

    // Se todas as baterias deste tipo foram usadas, continua para o próximo tipo
    if (batteryRemaining.get(battery.id) === remaining) continue outer
  }

  // Verifica quais robôs tiveram mudança real de energia
  const robotsToUpdate = robots.filter((r) => (robotEnergy.get(r.id) ?? r.durability) > r.durability)
  if (robotsToUpdate.length === 0) {
    return NextResponse.json({ error: 'Not enough batteries to recharge any robot.', batteriesUsed: 0 }, { status: 400 })
  }

  // Aplica as mudanças no banco de dados
  await prisma.$transaction([
    // Atualiza energia dos robôs
    ...robotsToUpdate.map((r) =>
      prisma.robot.update({
        where: { id: r.id },
        data: { durability: robotEnergy.get(r.id)! },
      })
    ),
    // Atualiza/deleta baterias usadas
    ...batteries
      .filter((b) => batteryRemaining.get(b.id)! < b.quantity)
      .map((b) => {
        const remaining = batteryRemaining.get(b.id)!
        return remaining > 0
          ? prisma.consumable.update({ where: { id: b.id }, data: { quantity: remaining } })
          : prisma.consumable.delete({ where: { id: b.id } })
      }),
  ])

  return NextResponse.json({
    success: true,
    robotsRecharged: robotsToUpdate.length,
    batteriesUsed,
    message: `${robotsToUpdate.length} robot(s) recharged using ${batteriesUsed} battery(ies).`,
  })
}
