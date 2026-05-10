import { NextRequest, NextResponse } from 'next/server'
import { processBlock } from '@/lib/mining'

/**
 * GET /api/cron/mining
 * Endpoint chamado automaticamente pelo Vercel Cron (vercel.json).
 * O Vercel injeta o header Authorization: Bearer <CRON_SECRET> automaticamente.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processBlock()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[cron/mining] Error:', error)
    return NextResponse.json({ error: 'Block processing failed' }, { status: 500 })
  }
}
