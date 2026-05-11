import { ShopManager } from '@/components/game/ShopManager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop — Inside the Crate',
}

export default function ShopPage() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Shop</h2>
        <p className="text-gray-500 text-sm mt-1">Buy robots, equipment, upgrades and more with CRATE</p>
      </div>
      <ShopManager />
    </div>
  )
}
