function Pulse({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-[#111118] rounded-lg animate-pulse`} />
}

export default function MinigamesLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 space-y-2">
        <Pulse w="w-40" h="h-8" />
        <Pulse w="w-80" h="h-4" />
      </div>

      {/* Global cooldown bar */}
      <div className="mb-4 bg-[#111118] border border-gray-800/40 rounded-xl px-4 py-2.5 animate-pulse">
        <Pulse w="w-48" h="h-3" />
      </div>

      {/* Game cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gray-800 rounded" />
                <Pulse w="w-24" h="h-4" />
              </div>
              <div className="w-12 h-5 bg-gray-800 rounded" />
            </div>
            <Pulse w="w-full" h="h-3" />
            <Pulse w="w-3/4" h="h-3" />
            <div className="flex gap-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex-1 h-14 bg-[#0d0d15] rounded-lg" />
              ))}
            </div>
            <div className="h-9 bg-[#0d0d15] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
