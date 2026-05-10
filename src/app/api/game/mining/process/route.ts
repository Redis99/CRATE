import { NextRequest, NextResponse } from 'next/server'
import { processBlock } from '@/lib/mining'

/**
 * POST /api/game/mining/process
 * Endpoint protegido por CRON_SECRET.
 * Chamado pelo Vercel Cron ou manualmente pelo admin para processar um bloco.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processBlock()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[mining/process] Error:', error)
    return NextResponse.json({ error: 'Block processing failed' }, { status: 500 })
  }
}
