'use client'

import type { RobotCardData } from '@/components/game/RobotCard'
import { OutpostSlot } from './OutpostSlot'

interface Props {
  totalSlots: number
  deployedRobots: RobotCardData[]
  selectedRobot: RobotCardData | null
  actionLoading: string | null
  onDeploy: (robot: RobotCardData, slot: number) => void
  onRecall: (robot: RobotCardData) => void
  title?: string
  /** Override do wrapper externo (cor de fundo, borda) */
  className?: string
  /** Componente customizado por slot — permite skins sazonais */
  SlotComponent?: typeof OutpostSlot
}

/**
 * Grade dos N slots do outpost (3-6 conforme o jogador desbloqueia).
 *
 * Sazonais: passar `SlotComponent` custom para substituir todos os slots
 * (ex: árvore de Natal com slots como bolas, ovos de Páscoa, etc.).
 */
export function OutpostSlotsGrid({
  totalSlots, deployedRobots, selectedRobot, actionLoading,
  onDeploy, onRecall,
  title = 'Outpost Slots',
  className,
  SlotComponent = OutpostSlot,
}: Props) {
  const slots = Array.from({ length: totalSlots }, (_, i) => i + 1)

  return (
    <div className={className ?? 'bg-[#111118] border border-gray-800/60 rounded-xl p-5'}>
      <h3 className="text-white font-semibold text-sm mb-4">{title}</h3>
      <div className="grid grid-cols-3 gap-3">
        {slots.map((slot) => {
          const robot       = deployedRobots.find((r) => r.outpostSlot === slot)
          const isClickable = !!selectedRobot && !robot
          return (
            <SlotComponent
              key={slot}
              slot={slot}
              robot={robot}
              isClickable={isClickable}
              actionLoading={actionLoading}
              onDeploy={() => selectedRobot && onDeploy(selectedRobot, slot)}
              onRecall={onRecall}
            />
          )
        })}
      </div>
    </div>
  )
}
