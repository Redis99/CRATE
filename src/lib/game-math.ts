/**
 * Funções matemáticas puras do jogo — sem dependências de servidor.
 * Podem ser importadas tanto em Server Components quanto em Client Components.
 */

/**
 * Calcula o Extraction Rate (ER) efetivo considerando durabilidade.
 * - 100–51%: ER normal
 * -  50–21%: ER -20%
 * -  20– 1%: ER -60% (modo emergência)
 * -      0%: offline (ER = 0)
 */
export function effectiveER(hashPower: number, durability: number): number {
  if (durability === 0) return 0
  if (durability <= 20) return hashPower * 0.4
  if (durability <= 50) return hashPower * 0.8
  return hashPower
}

/**
 * Calcula o desgaste de durabilidade por bloco baseado no Power Draw (PD) do robô.
 * 4 blocos/hora → decayPerBlock = energyRate / 4
 * Ex: PD=1 → -0.25%/bloco = -1%/hora | PD=8 → -2%/bloco = -8%/hora
 */
export function durabilityDecayPerBlock(energyRate: number): number {
  return energyRate / 4
}

/**
 * Estima horas de operação restantes com base na durabilidade e PD atuais.
 */
export function estimatedHoursRemaining(durability: number, energyRate: number): number {
  if (energyRate === 0) return Infinity
  return durability / energyRate
}

// ─── Tipos compartilhados ─────────────────────────────────────────────────────

export interface EquipmentEffect {
  effectType: string
  effectValue: number
  effectType2?: string | null
  effectValue2?: number | null
}

// ─── ER e PD efetivos considerando equipamentos instalados ───────────────────

/**
 * Calcula o ER efetivo de um robô somando bônus dos equipamentos instalados.
 * HASH_POWER_FLAT: bônus absoluto | HASH_POWER_PCT: bônus percentual
 */
export function effectiveERWithEquipment(hashPower: number, equips: EquipmentEffect[]): number {
  let flat = 0, pct = 0
  for (const eq of equips) {
    const effects = [
      { type: eq.effectType,  value: eq.effectValue },
      { type: eq.effectType2, value: eq.effectValue2 },
    ]
    for (const { type, value } of effects) {
      if (!type || value == null) continue
      if (type === 'HASH_POWER_FLAT') flat += value
      if (type === 'HASH_POWER_PCT')  pct  += value
    }
  }
  return Math.round(((hashPower + flat) * (1 + pct / 100)) * 10) / 10
}

/**
 * Calcula o PD efetivo de um robô após reduções dos equipamentos.
 * POWER_DRAW_FLAT: redução absoluta | POWER_DRAW_PCT / DURABILITY_LOSS_PCT: redução percentual
 */
export function effectivePDWithEquipment(energyRate: number, equips: EquipmentEffect[]): number {
  let flat = 0, pct = 0
  for (const eq of equips) {
    const effects = [
      { type: eq.effectType,  value: eq.effectValue },
      { type: eq.effectType2, value: eq.effectValue2 },
    ]
    for (const { type, value } of effects) {
      if (!type || value == null) continue
      if (type === 'POWER_DRAW_FLAT')      flat += value
      if (type === 'POWER_DRAW_PCT')       pct  += value
      if (type === 'DURABILITY_LOSS_PCT')  pct  += value
    }
  }
  return Math.max(0.1, Math.round(((energyRate - flat) * (1 - pct / 100)) * 10) / 10)
}
