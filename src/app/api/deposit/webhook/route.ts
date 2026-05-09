import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sweepToTreasury } from '@/lib/solana'

const LAMPORTS_PER_SOL = 1_000_000_000

interface HeliusNativeTransfer {
  fromUserAccount: string
  toUserAccount: string
  amount: number // em lamports
}

interface HeliusTokenTransfer {
  fromUserAccount: string
  toUserAccount: string
  tokenAmount: number
  mint: string
}

interface HeliusTransaction {
  signature: string
  nativeTransfers?: HeliusNativeTransfer[]
  tokenTransfers?: HeliusTokenTransfer[]
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.HELIUS_WEBHOOK_SECRET

  if (!secret || authHeader !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let transactions: HeliusTransaction[]
  try {
    transactions = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const tokenMint = process.env.CRATE_TOKEN_MINT
  const isNative = tokenMint === 'native'

  for (const tx of transactions) {
    const { signature } = tx

    // Deduplicação: ignora tx já processada
    const existing = await prisma.transaction.findFirst({ where: { txHash: signature } })
    if (existing) continue

    if (isNative) {
      // ── Modo devnet: detecta transferências de SOL nativo ──
      const transfers = (tx.nativeTransfers ?? []).filter(
        (t) => t.toUserAccount && t.amount > 0
      )

      for (const transfer of transfers) {
        const user = await prisma.user.findUnique({
          where: { depositAddress: transfer.toUserAccount },
          select: { id: true, depositPrivateKey: true },
        })
        if (!user) continue

        const amount = transfer.amount / LAMPORTS_PER_SOL
        if (amount <= 0) continue

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { balanceCrate: { increment: amount } },
          }),
          prisma.transaction.create({
            data: {
              userId: user.id,
              type: 'DEPOSIT',
              token: 'CRATE',
              amount,
              txHash: signature,
              status: 'CONFIRMED',
            },
          }),
          prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Depósito recebido',
              message: `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} SOL (devnet) creditados como CRATE.`,
            },
          }),
        ])

        console.log(`[webhook] +${amount} SOL nativo → user ${user.id} (tx: ${signature})`)

        // Varre o SOL para a treasury automaticamente
        if (user.depositPrivateKey) {
          sweepToTreasury(transfer.toUserAccount, user.depositPrivateKey).catch((err) =>
            console.error(`[sweep] Erro ao varrer ${transfer.toUserAccount}:`, err)
          )
        }
      }
    } else {
      // ── Modo mainnet: detecta transferências do SPL token $CRATE ──
      if (!tokenMint) {
        console.error('[webhook] CRATE_TOKEN_MINT não configurado')
        continue
      }

      const transfers = (tx.tokenTransfers ?? []).filter(
        (t) => t.mint === tokenMint && t.toUserAccount && t.tokenAmount > 0
      )

      for (const transfer of transfers) {
        const user = await prisma.user.findUnique({
          where: { depositAddress: transfer.toUserAccount },
          select: { id: true, depositPrivateKey: true },
        })
        if (!user) continue

        const amount = transfer.tokenAmount

        await prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { balanceCrate: { increment: amount } },
          }),
          prisma.transaction.create({
            data: {
              userId: user.id,
              type: 'DEPOSIT',
              token: 'CRATE',
              amount,
              txHash: signature,
              status: 'CONFIRMED',
            },
          }),
          prisma.notification.create({
            data: {
              userId: user.id,
              title: 'Depósito recebido',
              message: `${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} CRATE creditados na sua carteira.`,
            },
          }),
        ])

        console.log(`[webhook] +${amount} CRATE → user ${user.id} (tx: ${signature})`)

        // Varre os tokens para a treasury automaticamente
        if (user.depositPrivateKey) {
          sweepToTreasury(transfer.toUserAccount, user.depositPrivateKey).catch((err) =>
            console.error(`[sweep] Erro ao varrer ${transfer.toUserAccount}:`, err)
          )
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
