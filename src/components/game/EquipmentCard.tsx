import { RarityBadge } from '@/components/ui/RarityBadge'
import { CategoryTag } from '@/components/game/CategoryTag'
import { ItemSprite } from '@/components/ui/ItemSprite'
import type { Rarity } from '@/lib/rarity'
import type { ItemVisualData } from '@/lib/item-visual-keys'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface EquipmentCardData {
  id: string
  name: string
  rarity: Rarity | string
  effectType: string
  effectValue: number
  effectType2?: string | null
  effectValue2?: number | null
  isPermanent?: boolean
}

// 'robot'  → equipamento instalado em robô (afeta ER/PD individuais)
// 'base'   → melhoria de base (afeta toda a frota)
// 'mini'   → versão compacta (slots, listas inline)
export type EquipmentCardVariant = 'robot' | 'base' | 'mini'

interface EquipmentCardProps {
  item: EquipmentCardData
  variant?: EquipmentCardVariant
  // Slot de base (1 ou 2) — exibido quando variant='base'
  slot?: number
  slotLabel?: string
  // Ações opcionais no rodapé
  actions?: React.ReactNode
  /** Visual do equipamento. Ausente → ItemSprite cai no DefaultIcon genérico. */
  visual?: ItemVisualData | null
}

// ─── Formatação de efeito ─────────────────────────────────────────────────────

const EFFECT_LABEL: Record<string, string> = {
  HASH_POWER_FLAT:       'ER +',
  HASH_POWER_PCT:        'ER +',
  DURABILITY_LOSS_PCT:   'PD -',
  GLOBAL_EFFICIENCY_PCT: 'Efficiency +',
  UPTIME_HOURS:          'Uptime +',
  POWER_DRAW_FLAT:       'PD -',
  POWER_DRAW_PCT:        'PD -',
}

export function formatEffect(effectType: string, effectValue: number): string {
  const label = EFFECT_LABEL[effectType] ?? effectType.replace(/_/g, ' ') + ' '
  const suffix = effectType.includes('PCT') ? '%' : effectType === 'UPTIME_HOURS' ? 'h' : ''
  return `${label}${effectValue}${suffix}`
}

// ─── Variante mini (inline em listas) ────────────────────────────────────────

function MiniEquipmentCard({ item, actions }: { item: EquipmentCardData; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 bg-[#111118] rounded-lg px-2 py-1.5">
      <CategoryTag effectType={item.effectType} />
      {item.effectType2 && <CategoryTag effectType={item.effectType2} />}
      <span className="text-gray-300 text-xs flex-1 truncate">{item.name}</span>
      <span className="text-gray-600 text-xs font-mono shrink-0">
        {formatEffect(item.effectType, item.effectValue)}
        {item.effectType2 && item.effectValue2
          ? ` / ${formatEffect(item.effectType2, item.effectValue2)}`
          : ''}
      </span>
      {actions}
    </div>
  )
}

// ─── Variante base slot ───────────────────────────────────────────────────────

function BaseEquipmentCard({ item, slot, slotLabel, actions, visual }: {
  item: EquipmentCardData; slot?: number; slotLabel?: string; actions?: React.ReactNode; visual?: ItemVisualData | null
}) {
  return (
    <div className="border border-green-700/30 bg-green-500/5 rounded-xl p-3">
      {(slot || slotLabel) && (
        <p className="text-gray-600 text-xs mb-1.5">
          {slot ? `Slot ${slot}` : ''}{slot && slotLabel ? ' — ' : ''}{slotLabel ?? ''}
        </p>
      )}
      <div className="flex items-start justify-between gap-2">
        <ItemSprite visual={visual} size={40} alt={item.name} className="shrink-0 mt-0.5"
          fallback={<span className="text-xl">🏗️</span>} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <CategoryTag effectType={item.effectType} />
            {item.effectType2 && <CategoryTag effectType={item.effectType2} />}
            <RarityBadge rarity={item.rarity as Rarity} />
          </div>
          <p className="text-white text-sm font-medium truncate">{item.name}</p>
          <p className="text-green-400/80 text-xs mt-0.5">
            {formatEffect(item.effectType, item.effectValue)}
            {item.effectType2 && item.effectValue2
              ? ` · ${formatEffect(item.effectType2, item.effectValue2)}`
              : ''}
            <span className="text-gray-600 ml-1">— all robots</span>
          </p>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

// ─── Variante robot equipment (card padrão) ───────────────────────────────────

function RobotEquipmentCard({ item, actions, visual }: { item: EquipmentCardData; actions?: React.ReactNode; visual?: ItemVisualData | null }) {
  return (
    <div className="border border-gray-700/50 rounded-xl p-3 bg-[#0d0d15]">
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <CategoryTag effectType={item.effectType} />
          {item.effectType2 && <CategoryTag effectType={item.effectType2} />}
          <RarityBadge rarity={item.rarity as Rarity} />
        </div>
        {actions && <div className="shrink-0 ml-1">{actions}</div>}
      </div>
      <div className="flex items-center gap-2">
        <ItemSprite visual={visual} size={36} alt={item.name} className="shrink-0"
          fallback={<span className="text-lg">⚙️</span>} />
        <div className="min-w-0 flex-1">
      <p className="text-white text-sm font-medium truncate">{item.name}</p>
      <p className="text-gray-500 text-xs mt-0.5">
        {formatEffect(item.effectType, item.effectValue)}
        {item.effectType2 && item.effectValue2
          ? ` · ${formatEffect(item.effectType2, item.effectValue2)}`
          : ''}
        {item.isPermanent === false && <span className="text-gray-700 ml-1">(temporary)</span>}
      </p>
        </div>
      </div>
    </div>
  )
}

// ─── Export principal ─────────────────────────────────────────────────────────

export function EquipmentCard({ item, variant = 'robot', slot, slotLabel, actions, visual }: EquipmentCardProps) {
  if (variant === 'mini') return <MiniEquipmentCard item={item} actions={actions} />
  if (variant === 'base') return <BaseEquipmentCard item={item} slot={slot} slotLabel={slotLabel} actions={actions} visual={visual} />
  return <RobotEquipmentCard item={item} actions={actions} visual={visual} />
}

// ─── Empty slot placeholder ───────────────────────────────────────────────────

export function EmptyEquipmentSlot({ slot, slotLabel, variant = 'robot' }: {
  slot?: number; slotLabel?: string; variant?: 'robot' | 'base'
}) {
  if (variant === 'base') return (
    <div className="border border-dashed border-gray-800 rounded-xl p-3">
      {(slot || slotLabel) && (
        <p className="text-gray-600 text-xs mb-1">
          {slot ? `Slot ${slot}` : ''}{slot && slotLabel ? ' — ' : ''}{slotLabel ?? ''}
        </p>
      )}
      <p className="text-gray-700 text-sm">Empty — no bonus active</p>
    </div>
  )
  return (
    <div className="px-2 py-1.5 rounded-lg border border-dashed border-gray-800/60">
      <span className="text-gray-700 text-xs">Empty slot</span>
    </div>
  )
}
