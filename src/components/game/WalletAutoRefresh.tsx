'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Atualiza os dados da carteira a cada 15 segundos sem recarregar a página
export function WalletAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh()
    }, 15000)

    return () => clearInterval(interval)
  }, [router])

  return null
}
