import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { processBlock } from '@/lib/mining'

export async function POST(req: NextRequest) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action } = await req.json()

  if (action === 'trigger-mining') {
    try {
      const result = await processBlock()
      return NextResponse.json(result ?? { success: true })
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 })
    }
  }

  // Seeds — chama cada route internamente usando fetch com CRON_SECRET
  // A partir desta correção, os seed routes aceitam admin session como fallback
  const SEEDS = ['seed-robots','seed-parts','seed-consumables','seed-crafting','seed-lootbox','seed-shop','seed-codex','seed-missions','seed-outpost-themes']
  if (SEEDS.includes(action)) {
    // Redireciona para o seed route com o cookie de sessão do admin
    // (que já foi validado acima via getAdminUser)
    const origin = req.headers.get('origin') ?? req.nextUrl.origin
    const r = await fetch(`${origin}/api/admin/${action}`, {
      method: 'POST',
      headers: {
        // Passa o cookie de sessão para que getAdminUser() funcione no seed route
        cookie: req.headers.get('cookie') ?? '',
      },
    })
    return NextResponse.json(await r.json())
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
