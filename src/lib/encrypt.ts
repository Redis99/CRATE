import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_HEX = process.env.DEPOSIT_ENCRYPTION_KEY!

function getKey(): Buffer {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error('DEPOSIT_ENCRYPTION_KEY inválida — deve ser 64 caracteres hex (32 bytes)')
  }
  return Buffer.from(KEY_HEX, 'hex')
}

/**
 * Criptografa a chave privada do keypair de depósito.
 * Retorna string no formato "iv:tag:encrypted" (tudo em hex).
 */
export function encryptPrivateKey(secretKeyBase64: string): string {
  const key = getKey()
  const iv = randomBytes(12) // 96 bits — padrão AES-GCM
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(secretKeyBase64, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decriptografa a chave privada armazenada no banco.
 * Retorna a string base64 original do Uint8Array do Keypair.
 */
export function decryptPrivateKey(stored: string): string {
  const key = getKey()
  const [ivHex, tagHex, encryptedHex] = stored.split(':')

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error('Formato de chave privada inválido no banco')
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
