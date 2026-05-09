import { NextRequest, NextResponse } from 'next/server'
import { Keypair } from '@solana/web3.js'
import { prisma } from '@/lib/prisma'
import { encryptPrivateKey } from '@/lib/encrypt'
import { registerDepositAddress } from '@/lib/helius'

export async function POST(req: NextRequest) {
  try {
    const { id, email, username } = await req.json()

    if (!id || !email || !username) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } })
    if (existingUsername) {
      return NextResponse.json({ error: 'Nome de usuário já está em uso.' }, { status: 409 })
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 })
    }

    // Gera keypair único para este usuário
    const keypair = Keypair.generate()
    const depositAddress = keypair.publicKey.toString()

    // Salva a chave privada criptografada (necessário para varrer depósitos para a treasury)
    const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64')
    const depositPrivateKey = encryptPrivateKey(secretKeyBase64)

    const user = await prisma.user.create({
      data: {
        id,
        email,
        username,
        depositAddress,
        depositPrivateKey,
      },
    })

    // Registra o endereço no webhook do Helius (sem await — não bloqueia o cadastro)
    registerDepositAddress(depositAddress).catch((err) =>
      console.error('[register] Falha ao registrar endereço no Helius:', err)
    )

    return NextResponse.json({
      success: true,
      userId: user.id,
      depositAddress: user.depositAddress,
    })
  } catch (error) {
    console.error('Erro ao registrar usuário:', error)
    return NextResponse.json({ error: 'Erro interno ao criar conta.' }, { status: 500 })
  }
}
