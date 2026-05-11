import { CraftingManager } from '@/components/game/CraftingManager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Crafting — Inside the Crate',
}

export default function CraftingPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Crafting Station</h2>
        <p className="text-gray-500 text-sm mt-1">
          Combine parts to forge equipment and base upgrades
        </p>
      </div>
      <CraftingManager />
    </div>
  )
}
