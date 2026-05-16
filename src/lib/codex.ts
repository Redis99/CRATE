import 'server-only'
import { prisma } from '@/lib/prisma'

export interface CodexBonuses {
  erPct: number   // % ER global total (aplica como global efficiency pct)
  pdPct: number   // % redução PD total
}

export async function getUserCodexBonuses(userId: string): Promise<CodexBonuses> {
  const [collections, entries] = await Promise.all([
    prisma.codexCollection.findMany({ where: { active: true } }),
    prisma.codexEntry.findMany({
      where: { userId },
      select: { collection: true },
    }),
  ])
  return computeCodexBonuses(collections, entries)
}

export function computeCodexBonuses(
  collections: Array<{
    name: string
    totalRequired: number
    bonusPerItemErPct: number
    completionErPct: number
    completionPdPct: number
  }>,
  entries: Array<{ collection: string }>
): CodexBonuses {
  let erPct = 0
  let pdPct = 0

  for (const col of collections) {
    const count = entries.filter((e) => e.collection === col.name).length
    if (count === 0) continue
    erPct += col.bonusPerItemErPct * Math.min(count, col.totalRequired)
    if (count >= col.totalRequired) {
      erPct += col.completionErPct
      pdPct += col.completionPdPct
    }
  }

  return {
    erPct: Math.round(erPct * 10) / 10,
    pdPct: Math.round(pdPct * 10) / 10,
  }
}
