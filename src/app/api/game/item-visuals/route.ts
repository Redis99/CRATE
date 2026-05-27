import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/game/item-visuals
 * Retorna todos os ItemVisual ativos — público, cacheado por 5 minutos.
 * Usado pelo hook useItemVisuals() nos cards do jogo.
 */
export async function GET() {
  const visuals = await prisma.itemVisual.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  })

  return NextResponse.json(visuals, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
