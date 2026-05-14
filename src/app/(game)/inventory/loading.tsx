function Pulse({ w = 'w-full', h = 'h-4', className = '' }: { w?: string; h?: string; className?: string }) {
  return <div className={`${w} ${h} ${className} bg-[#111118] rounded-lg animate-pulse`} />
}

export default function InventoryLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 space-y-2">
        <Pulse w="w-32" h="h-8" />
        <Pulse w="w-64" h="h-4" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-1 bg-[#0d0d15] rounded-xl p-1 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex-1 h-9 bg-[#111118] rounded-lg" />
        ))}
      </div>

      {/* Slot bar */}
      <div className="mb-3 mt-2 h-2 bg-[#111118] rounded-full animate-pulse" />

      {/* Filters + search */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-20 bg-[#111118] rounded-full animate-pulse" />
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 h-10 bg-[#111118] rounded-lg animate-pulse" />
        <div className="w-20 h-10 bg-[#111118] rounded-lg animate-pulse" />
      </div>

      {/* Item grid */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-gray-800/40 rounded-xl p-4 bg-[#0d0d15] space-y-3 animate-pulse">
            <div className="flex justify-between">
              <div className="h-5 w-16 bg-[#111118] rounded" />
              <div className="h-5 w-20 bg-[#111118] rounded" />
            </div>
            <div className="h-4 w-40 bg-[#111118] rounded" />
            <div className="h-4 w-32 bg-[#111118] rounded" />
            <div className="h-8 w-full bg-[#111118] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
