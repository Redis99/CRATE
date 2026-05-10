import { InventoryManager } from '@/components/game/InventoryManager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inventory — Inside the Crate',
}

export default function InventoryPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Inventory</h2>
        <p className="text-gray-500 text-sm mt-1">Manage your robots, equipment, parts and consumables</p>
      </div>
      <InventoryManager />
    </div>
  )
}
