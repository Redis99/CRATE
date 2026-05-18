import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'

const SEED_ENDPOINTS = [
  'seed-crafting',
  'seed-lootbox',
  'seed-shop',
  'seed-codex',
  'seed-missions',
]

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action } = await req.json()

  if (action === 'trigger-mining') {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const r = await fetch(`${base}/api/game/mining/process`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    return NextResponse.json(await r.json())
  }

  if (SEED_ENDPOINTS.includes(action)) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const r = await fetch(`${base}/api/admin/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    return NextResponse.json(await r.json())
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
