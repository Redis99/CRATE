import 'server-only'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { decryptPrivateKey } from '@/lib/encrypt'

const LAMPORTS_PER_SOL = 1_000_000_000
const TX_FEE_BUFFER = 10_000 // reserva ~0.00001 SOL para cobrir a taxa da transação

function getConnection(): Connection {
  return new Connection(process.env.HELIUS_RPC_URL!, 'confirmed')
}

/**
 * Varre o SOL do depositAddress do usuário para a treasury do admin.
 * Chamado automaticamente após cada depósito detectado pelo webhook.
 *
 * @param depositAddress  - endereço público do usuário (on-chain)
 * @param encryptedKey    - chave privada criptografada (do banco)
 * @returns txHash da transação de sweep, ou null se não houve saldo suficiente
 */
export async function sweepToTreasury(
  depositAddress: string,
  encryptedKey: string
): Promise<string | null> {
  const treasuryAddress = process.env.TREASURY_ADDRESS
  if (!treasuryAddress) {
    console.error('[sweep] TREASURY_ADDRESS não configurado')
    return null
  }

  const connection = getConnection()
  const treasury = new PublicKey(treasuryAddress)

  // Reconstrói o keypair a partir da chave privada descriptografada
  const secretKeyBase64 = decryptPrivateKey(encryptedKey)
  const secretKey = Buffer.from(secretKeyBase64, 'base64')
  const keypair = Keypair.fromSecretKey(secretKey)

  // Consulta o saldo on-chain
  const balance = await connection.getBalance(keypair.publicKey)
  const sweepAmount = balance - TX_FEE_BUFFER

  if (sweepAmount <= 0) {
    console.log(`[sweep] Saldo insuficiente em ${depositAddress} (${balance} lamports) — nada a varrer`)
    return null
  }

  // Cria e assina a transação de transferência para a treasury
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: treasury,
      lamports: sweepAmount,
    })
  )

  const txHash = await sendAndConfirmTransaction(connection, tx, [keypair])

  console.log(
    `[sweep] ${sweepAmount / LAMPORTS_PER_SOL} SOL varridos de ${depositAddress} → treasury (tx: ${txHash})`
  )

  return txHash
}
