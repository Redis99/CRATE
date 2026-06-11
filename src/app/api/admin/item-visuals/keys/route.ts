import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

// ─── GET /api/admin/item-visuals/keys ─────────────────────────────────────────
// Lista as chaves de visual disponíveis a partir dos ITENS REAIS do banco
// (templates da loja, catálogos e instâncias existentes), não de constantes.
// Cada item individual pode receber seu próprio ícone; o `fallback` indica a
// chave de grupo (coleção/effectType/categoria) usada quando o item não tem
// visual próprio.

export interface VisualKeyEntry {
  key:      string        // chave de lookup (nome individual do item)
  label?:   string        // nome amigável p/ exibição (quando difere da key)
  fallback: string | null // chave de grupo que cobre este item se não houver visual próprio
}

export async function GET() {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [
    robotShop, robotInstances,
    equipShop, equipInstances,
    upgradeShop, upgradeInstances,
    partsCatalog, consumableTemplates, lootboxConfigs,
  ] = await Promise.all([
    prisma.shopItem.findMany({ where: { category: 'robot-specific' },        select: { name: true, metadata: true } }),
    prisma.robot.findMany({ distinct: ['name'], select: { name: true, collection: true } }),
    prisma.shopItem.findMany({ where: { category: 'equipment-specific' },    select: { name: true, metadata: true } }),
    prisma.equipment.findMany({ distinct: ['name'], select: { name: true, effectType: true } }),
    prisma.shopItem.findMany({ where: { category: 'base-upgrade-specific' }, select: { name: true, metadata: true } }),
    prisma.baseUpgrade.findMany({ distinct: ['name'], select: { name: true, effectType: true } }),
    prisma.part.findMany({ where: { active: true }, select: { partType: true, category: true }, orderBy: { partType: 'asc' } }),
    prisma.consumableTemplate.findMany({ where: { active: true }, select: { name: true, consumableType: true, effectValue: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.lootboxConfig.findMany({ select: { lootboxType: true, name: true }, orderBy: { sortOrder: 'asc' } }),
  ])

  // União com dedup por key — templates da loja primeiro (fonte canônica),
  // instâncias existentes complementam (robôs/equips gerados aleatoriamente)
  function merge(entries: VisualKeyEntry[]): VisualKeyEntry[] {
    const seen = new Map<string, VisualKeyEntry>()
    for (const e of entries) {
      if (e.key && !seen.has(e.key)) seen.set(e.key, e)
    }
    return [...seen.values()].sort((a, b) => a.key.localeCompare(b.key))
  }

  const meta = (m: unknown) => (m ?? {}) as Record<string, unknown>

  const robot = merge([
    ...robotShop.map((s) => ({
      key:      (meta(s.metadata).robotName as string) ?? s.name,
      fallback: (meta(s.metadata).robotCollection as string) || null,
    })),
    ...robotInstances.map((r) => ({ key: r.name, fallback: r.collection || null })),
  ])

  const equipment = merge([
    ...equipShop.map((s) => ({
      key:      s.name,
      fallback: (meta(s.metadata).effectType as string) || null,
    })),
    ...equipInstances.map((e) => ({ key: e.name, fallback: e.effectType })),
  ])

  const baseUpgrade = merge([
    ...upgradeShop.map((s) => ({
      key:      s.name,
      fallback: (meta(s.metadata).effectType as string) || null,
    })),
    ...upgradeInstances.map((b) => ({ key: b.name, fallback: b.effectType })),
  ])

  const part = merge(
    partsCatalog.map((p) => ({ key: p.partType, fallback: p.category as string })),
  )

  const consumable = merge(
    consumableTemplates.map((c) => ({
      key:      `${c.consumableType}_${c.effectValue}`,
      label:    c.name,
      fallback: null,
    })),
  )

  const lootbox = merge(
    lootboxConfigs.map((l) => ({ key: l.lootboxType, label: l.name, fallback: null })),
  )

  // Chaves de grupo (fallbacks) distintas — viram a segunda camada do dropdown
  const distinctFallbacks = (entries: VisualKeyEntry[]) =>
    [...new Set(entries.map((e) => e.fallback).filter((f): f is string => !!f))].sort()

  return NextResponse.json({
    robot, equipment, baseUpgrade, part, consumable, lootbox,
    fallbacks: {
      robot:       distinctFallbacks(robot),
      equipment:   distinctFallbacks(equipment),
      baseUpgrade: distinctFallbacks(baseUpgrade),
      part:        distinctFallbacks(part),
      consumable:  [],
      lootbox:     [],
    },
  })
}
