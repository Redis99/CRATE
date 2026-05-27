'use client'

import { useQuery } from '@tanstack/react-query'
import { resolveVisual, type ItemVisualData, type VisualCategory } from '@/lib/item-visual-keys'

/**
 * Carrega todos os ItemVisual uma vez e expõe uma função de lookup.
 * Usa React Query para cache automático — não faz refetch a cada render.
 */
export function useItemVisuals() {
  const { data: visuals = [] } = useQuery<ItemVisualData[]>({
    queryKey: ['item-visuals'],
    queryFn: () => fetch('/api/game/item-visuals').then((r) => r.json()),
    staleTime: 5 * 60 * 1000,   // 5 minutos — mesmo TTL do cache do servidor
    gcTime:    15 * 60 * 1000,  // mantém em memória por 15 min
  })

  /** Resolve o visual mais específico para um item */
  function getVisual(
    category: VisualCategory,
    key: string,
    rarity?: string | null,
  ): ItemVisualData | null {
    return resolveVisual(visuals, category, key, rarity)
  }

  return { visuals, getVisual }
}
