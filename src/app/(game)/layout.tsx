import { GameSidebar } from '@/components/layout/GameSidebar'

export default function GameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <GameSidebar />
      <main className="ml-60 min-h-screen">
        {children}
      </main>
    </div>
  )
}
