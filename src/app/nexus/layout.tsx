import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin-auth'
import Link from 'next/link'

const NAV = [
  { href: '/nexus',               label: 'Dashboard' },
  { href: '/nexus/withdrawals',   label: 'Withdrawals' },
  { href: '/nexus/players',       label: 'Players' },
  { href: '/nexus/inventory',     label: 'Parts & Cons.' },
  { href: '/nexus/crafting',      label: 'Crafting' },
  { href: '/nexus/lootbox',       label: 'Lootbox' },
  { href: '/nexus/shop',          label: 'Shop' },
  { href: '/nexus/robots',        label: 'Robots' },
  { href: '/nexus/items',         label: 'Equip & Upgrades' },
  { href: '/nexus/missions',      label: 'Missions' },
  { href: '/nexus/codex',         label: 'Codex' },
  { href: '/nexus/outpost-themes', label: 'Outpost Themes' },
  { href: '/nexus/visuals',        label: '🖼️ Item Visuals' },
  { href: '/nexus/notifications',  label: 'Notifications' },
]

export default async function NexusLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdminUser()
  if (!admin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#080810] text-gray-200 flex">
      {/* Sidebar */}
      <aside className="w-52 min-h-screen bg-[#0d0d1a] border-r border-purple-900/30 flex flex-col">
        <div className="p-4 border-b border-purple-900/30">
          <p className="text-xs text-purple-400 font-mono uppercase tracking-widest">Admin Panel</p>
          <p className="text-xs text-gray-500 mt-0.5">{admin.username}</p>
        </div>
        <nav className="flex-1 p-2">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-purple-900/20 hover:text-purple-300 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-purple-900/30">
          <Link
            href="/dashboard"
            className="block text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back to game
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  )
}
