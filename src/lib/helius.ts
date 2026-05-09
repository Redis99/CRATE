import 'server-only'

const HELIUS_API_URL = 'https://api.helius.xyz/v0'

/**
 * Adiciona um endereço de depósito ao webhook existente do Helius.
 * Chamado automaticamente no cadastro de cada novo usuário.
 */
export async function registerDepositAddress(address: string): Promise<void> {
  const apiKey = process.env.HELIUS_API_KEY
  const webhookId = process.env.HELIUS_WEBHOOK_ID

  if (!apiKey || !webhookId) {
    console.warn('[helius] HELIUS_API_KEY ou HELIUS_WEBHOOK_ID não configurados — endereço não registrado')
    return
  }

  // 1. Busca o webhook atual para obter os endereços já cadastrados
  const getRes = await fetch(`${HELIUS_API_URL}/webhooks/${webhookId}?api-key=${apiKey}`)

  if (!getRes.ok) {
    console.error(`[helius] Erro ao buscar webhook: ${getRes.status}`)
    return
  }

  const webhook = await getRes.json()
  const currentAddresses: string[] = webhook.accountAddresses ?? []

  // Evita duplicatas
  if (currentAddresses.includes(address)) return

  // 2. Atualiza o webhook com o novo endereço
  const putRes = await fetch(`${HELIUS_API_URL}/webhooks/${webhookId}?api-key=${apiKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...webhook,
      accountAddresses: [...currentAddresses, address],
    }),
  })

  if (!putRes.ok) {
    console.error(`[helius] Erro ao atualizar webhook: ${putRes.status}`)
    return
  }

  console.log(`[helius] Endereço ${address} adicionado ao webhook`)
}
