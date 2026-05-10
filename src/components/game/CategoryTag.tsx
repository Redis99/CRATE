import { EFFECT_CATEGORY, CATEGORY_STYLE } from '@/lib/rarity'

export function CategoryTag({ effectType }: { effectType: string }) {
  const cat   = EFFECT_CATEGORY[effectType]
  const style = cat ? CATEGORY_STYLE[cat] : null
  if (!cat || !style) return null
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${style}`}>
      {cat}
    </span>
  )
}
