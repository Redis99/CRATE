import { NextRequest, NextResponse } from 'next/server'
import { processWeeklyReset } from '@/lib/weekly'

/**
 * GET /api/cron/weekly
 * Chamado pelo cron externo toda segunda-feira às 00:05 UTC.
 * Processa ranking semanal + weekly supply drop.
 * Protegido por Authorization: Bearer CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processWeeklyReset()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('[cron/weekly] Error:', error)
    return NextResponse.json({ error: 'Weekly reset failed' }, { status: 500 })
  }
}
