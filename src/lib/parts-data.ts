/**
 * Dados de peças por categoria — sem dependências de servidor.
 * Pode ser importado tanto em Server Components quanto em Client Components.
 */

export const PARTS_BY_CATEGORY: Record<string, string[]> = {
  ENERGY:      ['Plasma Cell', 'Energy Core', 'Power Module', 'Fusion Battery', 'Charge Crystal'],
  MINING:      ['Drill Bit', 'Excavation Head', 'Mining Core', 'Extraction Tool', 'Rock Breaker'],
  MAINTENANCE: ['Repair Module', 'Self-Repair Kit', 'Diagnostic Unit', 'Servo Pack', 'Lubricant Core'],
  TERRAIN:     ['Terrain Scanner', 'Surface Adapter', 'Ground Module', 'Traction Unit', 'Geo Sensor'],
  AI_SOFTWARE: ['AI Chip', 'Navigation Module', 'Decision Matrix', 'Logic Core', 'Pathfinder Unit'],
  SPECIAL:     ['Rare Component', 'Void Crystal', 'Genesis Fragment', 'Anomaly Shard', 'Unknown Ore'],
}
