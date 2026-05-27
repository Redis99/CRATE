import { EquipmentCard, EmptyEquipmentSlot } from '@/components/game/EquipmentCard'
import { BASE_SLOT_LABELS } from '@/lib/game-constants'
import type { BaseUpgradeSlot } from './types'

interface Props {
  baseUpgrades: BaseUpgradeSlot[]
  title?: string
  className?: string
}

/**
 * Seção "Base Configuration" — 2 slots de melhorias de base.
 * `title` e `className` são overrides para temas sazonais.
 */
export function OutpostBaseConfig({
  baseUpgrades,
  title = 'Base Configuration',
  className,
}: Props) {
  return (
    <div className={className ?? 'bg-[#111118] border border-gray-800/60 rounded-xl p-5'}>
      <h3 className="text-white font-semibold text-sm mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        {([1, 2] as const).map((slot) => {
          const upgrade = baseUpgrades.find((u) => u.appliedSlot === slot)
          return upgrade ? (
            <EquipmentCard
              key={slot}
              item={upgrade}
              variant="base"
              slot={slot}
              slotLabel={BASE_SLOT_LABELS[slot]}
            />
          ) : (
            <EmptyEquipmentSlot
              key={slot}
              slot={slot}
              slotLabel={BASE_SLOT_LABELS[slot]}
              variant="base"
            />
          )
        })}
      </div>
    </div>
  )
}
