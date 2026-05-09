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

function getConnection(): Connection {
  return new Connection(process.env.HELIUS_RPC_URL!, 'confirmed')
}

/**
 * Varre o SOL do depositAddress do usuário para a treasury do admin.
 * Drena o endereço para exatamente zero, pagando a taxa exata da transação.
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
  if (balance === 0) {
    console.log(`[sweep] Saldo zero em ${depositAddress} — nada a varrer`)
    return null
  }

  // Calcula a taxa exata da transação para drenar o endereço para zero
  const { blockhash } = await connection.getLatestBlockhash()
  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: keypair.publicKey,
  }).add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: treasury,
      lamports: balance, // placeholder — será ajustado abaixo
    })
  )

  const feeResult = await connection.getFeeForMessage(tx.compileMessage())
  const fee = feeResult.value ?? 5000
  const sweepAmount = balance - fee

  if (sweepAmount <= 0) {
    console.log(`[sweep] Saldo insuficiente para cobrir a taxa em ${depositAddress} — nada a varrer`)
    return null
  }

  // Reconstrói a transação com o valor correto (saldo - taxa exata)
  const finalTx = new Transaction({ recentBlockhash: blockhash, feePayer: keypair.publicKey }).add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: treasury,
      lamports: sweepAmount,
    })
  )

  const txHash = await sendAndConfirmTransaction(connection, finalTx, [keypair])

  console.log(
    `[sweep] ${sweepAmount / LAMPORTS_PER_SOL} SOL varridos de ${depositAddress} → treasury (tx: ${txHash})`
  )

  return txHash
}
