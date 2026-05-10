import { RARITY_BADGE_COLOR, RARITY_LABEL, type Rarity } from '@/lib/rarity'

export function RarityBadge({ rarity }: { rarity: Rarity | string }) {
  const color = RARITY_BADGE_COLOR[rarity as Rarity] ?? RARITY_BADGE_COLOR.COMMON
  const label = RARITY_LABEL[rarity as Rarity] ?? rarity
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {label}
    </span>
  )
}
