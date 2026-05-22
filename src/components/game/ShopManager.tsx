'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShopItemCard } from '@/components/game/ShopItemCard'
import { LootboxDropModal } from '@/components/game/LootboxDropModal'
import type { DropResultType } from '@/lib/lootbox'
import type { ShopItem, ShopCategory } from '@/lib/shop-items'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShopItemData extends ShopItem {
  currentSlots?: number
  maxSlots?: number
  isCapped?: boolean
}

interface ShopData {
  balance: number
  outpostSlots: number
  items: ShopItemData[]
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: { key: ShopCategory; label: string; icon: string }[] = [
  // 'robots' removido — robots agora são Robot Crates na área de Lootboxes
  { key: 'equipment',    label: 'Equipment',     icon: '⚙️' },
  { key: 'baseUpgrades', label: 'Base Upgrades', icon: '🏗️' },
  { key: 'batteries',    label: 'Batteries',     icon: '🔋' },
  { key: 'outpostSlots', label: 'Outpost',       icon: '🚀' },
  { key: 'inventory',    label: 'Storage',       icon: '📦' },
]

// ─── Quantidade máxima comprável ──────────────────────────────────────────────
// Baseado puramente na acessibilidade (saldo ÷ preço unitário).
// A API aplica as regras de negócio reais (slots livres, unlock sequencial, etc.)

function getMaxQty(price: number, balance: number): number {
  if (price <= 0) return 1
  return Math.min(99, Math.floor(balance / price))
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ShopManager() {
  const [data, setData]             = useState<ShopData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<ShopCategory>('equipment')
  const [buying, setBuying]         = useState<string | null>(null)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [drops, setDrops]           = useState<DropResultType[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/game/shop')
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function handleQtyChange(itemId: string, qty: number) {
    setQuantities(prev => ({ ...prev, [itemId]: qty }))
  }

  async function handleBuy(itemId: string, qty: number) {
    setBuying(itemId); setError(''); setSuccess(''); setDrops([])

    const res  = await fetch('/api/game/shop/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, quantity: qty }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Purchase failed.')
    } else {
      const bought = json.quantity ?? qty
      setSuccess(bought > 1 ? `×${bought} purchased!` : 'Purchase successful!')
      if (json.drops?.length > 0) setDrops(json.drops)
      // Reseta a quantidade do item para 1
      setQuantities(prev => ({ ...prev, [itemId]: 1 }))
      await fetchData()
    }
    setBuying(null)
  }

  if (loading) return <div className="text-gray-500 text-sm py-8">Loading shop...</div>
  if (!data)   return <div className="text-red-400 text-sm py-8">Failed to load shop.</div>

  const tabItems = data.items.filter((i) => i.category === activeTab)

  return (
    <>
      {drops.length > 0 && (
        <LootboxDropModal drops={drops} onClose={() => setDrops([])} />
      )}

      {/* Balance */}
      <div className="bg-[#111118] border border-gray-800/60 rounded-xl px-5 py-3 mb-5 flex justify-between items-center">
        <span className="text-gray-500 text-sm">Available balance</span>
        <span className="text-white font-bold font-mono">
          {Number(data.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })} CRATE
        </span>
      </div>

      {/* Feedback */}
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400 text-xs">✕</button>
        </div>
      )}
      {success && drops.length === 0 && (
        <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 flex justify-between">
          <p className="text-green-400 text-sm">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400/60 hover:text-green-400 text-xs">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d0d15] rounded-xl p-1 mb-5 flex-wrap">
        {TABS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => { setActiveTab(key); setError(''); setSuccess('') }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === key
                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}>
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Items grid */}
      {tabItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 text-sm">No items available in this category.</p>
        </div>
      ) : (
        <div className={`grid gap-3 ${
          activeTab === 'outpostSlots' ? 'grid-cols-3' :
          activeTab === 'inventory'   ? 'grid-cols-2' :
                                        'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        }`}>
          {tabItems.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              outpostSlots={data.outpostSlots}
              balance={data.balance}
              buying={buying === item.id}
              quantity={quantities[item.id] ?? 1}
              maxQty={getMaxQty(item.price, data.balance)}
              onQtyChange={handleQtyChange}
              onBuy={handleBuy}
            />
          ))}
        </div>
      )}
    </>
  )
}
