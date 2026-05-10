import 'server-only'
import { prisma } from '@/lib/prisma'
import { effectiveER, durabilityDecayPerBlock } from '@/lib/game-math'

export { effectiveER }

const MIN_BLOCK_REWARD_CRATE = 10

/**
 * Processa um bloco de mineração com alocação por moeda.
 *
 * Fórmula por token T:
 *   poolER_T  = Σ (userER × allocation_T / 100)  de todos os jogadores
 *   reward_T  = (userER × allocation_T / 100) / poolER_T × blockReward_T
 *
 * Isso significa que jogadores competem apenas dentro do pool da moeda
 * que escolheram minerar, tornando a alocação estratégica.
 */
export async function processBlock() {
  const blockRewardCrate = Number(process.env.MINING_BLOCK_REWARD_CRATE ?? MIN_BLOCK_REWARD_CRATE)
  const blockRewardSol   = Number(process.env.MINING_BLOCK_REWARD_SOL ?? 0)
  const blockRewardLc    = Number(process.env.MINING_BLOCK_REWARD_LC ?? 0)

  // 1. Busca todos os usuários com robôs ativos + suas alocações
  const activeRobots = await prisma.robot.findMany({
    where: { isActive: true },
    select: {
      id: true,
      userId: true,
      hashPower: true,
      durability: true,
      energyRate: true,
    },
  })

  if (activeRobots.length === 0) {
    const block = await prisma.miningBlock.create({
      data: { totalHashPower: 0, rewardCrate: 0, rewardSol: 0, rewardLc: 0 },
    })
    return { blockNumber: block.id, totalHashPower: 0, playersRewarded: 0 }
  }

  // 2. Agrupa ER efetivo por usuário
  const userERMap = new Map<string, number>()
  for (const robot of activeRobots) {
    const er = effectiveER(robot.hashPower, robot.durability)
    userERMap.set(robot.userId, (userERMap.get(robot.userId) ?? 0) + er)
  }

  // 3. Busca alocações de todos os jogadores ativos
  const userIds = Array.from(userERMap.keys())
  const allocations = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      allocationCrate: true,
      allocationSol: true,
      allocationLc: true,
    },
  })

  const allocationMap = new Map(allocations.map((u) => [u.id, u]))

  // 4. Calcula o pool ER de cada moeda (ER ponderado pela alocação)
  let poolCrate = 0, poolSol = 0, poolLc = 0

  for (const [userId, er] of userERMap.entries()) {
    const alloc = allocationMap.get(userId)
    if (!alloc) continue
    poolCrate += er * (alloc.allocationCrate / 100)
    poolSol   += er * (alloc.allocationSol   / 100)
    poolLc    += er * (alloc.allocationLc    / 100)
  }

  // 5. Distribui recompensas por jogador e por moeda
  const rewardOps: ReturnType<typeof prisma.user.update | typeof prisma.miningReward.create>[] = []
  let totalCrate = 0, totalSol = 0, totalLc = 0
  let playersRewarded = 0

  for (const [userId, er] of userERMap.entries()) {
    const alloc = allocationMap.get(userId)
    if (!alloc || er === 0) continue

    const weightedCrate = er * (alloc.allocationCrate / 100)
    const weightedSol   = er * (alloc.allocationSol   / 100)
    const weightedLc    = er * (alloc.allocationLc    / 100)

    const rewardCrate = poolCrate > 0 ? (weightedCrate / poolCrate) * blockRewardCrate : 0
    const rewardSol   = poolSol   > 0 ? (weightedSol   / poolSol)   * blockRewardSol   : 0
    const rewardLc    = poolLc    > 0 ? (weightedLc    / poolLc)    * blockRewardLc    : 0

    totalCrate += rewardCrate
    totalSol   += rewardSol
    totalLc    += rewardLc
    playersRewarded++

    // Atualiza saldos
    rewardOps.push(
      prisma.user.update({
        where: { id: userId },
        data: {
          ...(rewardCrate > 0 && { balanceCrate: { increment: rewardCrate } }),
          ...(rewardSol   > 0 && { balanceSol:   { increment: rewardSol   } }),
          ...(rewardLc    > 0 && { balanceLc:    { increment: rewardLc    } }),
        },
      })
    )

    // Registra recompensas individuais por moeda
    if (rewardCrate > 0) rewardOps.push(prisma.miningReward.create({ data: { userId, token: 'CRATE', amount: rewardCrate, blockNumber: 0 } }))
    if (rewardSol   > 0) rewardOps.push(prisma.miningReward.create({ data: { userId, token: 'SOL',   amount: rewardSol,   blockNumber: 0 } }))
    if (rewardLc    > 0) rewardOps.push(prisma.miningReward.create({ data: { userId, token: 'LC',    amount: rewardLc,    blockNumber: 0 } }))
  }

  // 6. Aplica desgaste de durabilidade (-0.25% por bloco = -1%/hora)
  const decayOps = []
  const robotsToDeactivate: string[] = []

  for (const robot of activeRobots) {
    const decay = durabilityDecayPerBlock(robot.energyRate)
    const newDurability = Math.max(0, robot.durability - decay)
    if (newDurability === 0) {
      robotsToDeactivate.push(robot.id)
      decayOps.push(prisma.robot.update({
        where: { id: robot.id },
        data: { durability: 0, isActive: false, outpostSlot: null },
      }))
    } else {
      decayOps.push(prisma.robot.update({
        where: { id: robot.id },
        data: { durability: newDurability },
      }))
    }
  }

  // 7. Notifica donos de robôs offline
  const notifications = []
  if (robotsToDeactivate.length > 0) {
    const broken = await prisma.robot.findMany({
      where: { id: { in: robotsToDeactivate } },
      select: { userId: true, name: true },
    })
    for (const r of broken) {
      notifications.push(prisma.notification.create({
        data: {
          userId: r.userId,
          title: 'Robot offline',
          message: `${r.name} reached 0% durability and was removed from the Outpost. Repair it to resume mining.`,
        },
      }))
    }
  }

  // 8. Executa tudo em paralelo
  await Promise.all([...rewardOps, ...decayOps, ...notifications])

  // 9. Registra o bloco
  const totalNetworkER = Array.from(userERMap.values()).reduce((s, v) => s + v, 0)
  const block = await prisma.miningBlock.create({
    data: {
      totalHashPower: totalNetworkER,
      rewardCrate: totalCrate,
      rewardSol: totalSol,
      rewardLc: totalLc,
    },
  })

  console.log(
    `[mining] Block #${block.id} — ${totalNetworkER.toFixed(1)} ER — ` +
    `${totalCrate.toFixed(4)} CRATE | ${totalSol.toFixed(6)} SOL | ${totalLc.toFixed(4)} LC — ` +
    `${playersRewarded} player(s)`
  )

  return {
    blockNumber: block.id,
    totalHashPower: totalNetworkER,
    playersRewarded,
    rewards: { crate: totalCrate, sol: totalSol, lc: totalLc },
    robotsDeactivated: robotsToDeactivate.length,
  }
}
