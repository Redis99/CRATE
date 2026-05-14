function Pulse({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-[#111118] rounded-lg animate-pulse`} />
}

export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8 space-y-2">
        <Pulse w="w-56" h="h-8" />
        <Pulse w="w-48" h="h-4" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111118] border border-gray-800/60 rounded-xl p-4 space-y-2 animate-pulse">
            <div className="flex justify-between items-center">
              <Pulse w="w-24" h="h-3" />
              <div className="w-4 h-4 bg-gray-800 rounded" />
            </div>
            <Pulse w="w-16" h="h-8" />
            <Pulse w="w-28" h="h-3" />
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-5 gap-4">
        {/* Robots panel */}
        <div className="col-span-3 bg-[#111118] border border-gray-800/60 rounded-xl p-5 animate-pulse">
          <div className="flex justify-between mb-4">
            <Pulse w="w-36" h="h-4" />
            <Pulse w="w-20" h="h-4" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#0d0d15]">
                <div className="w-8 h-8 rounded-lg bg-gray-800" />
                <div className="flex-1 space-y-1.5">
                  <Pulse w="w-32" h="h-3" />
                  <Pulse w="w-48" h="h-2.5" />
                </div>
                <div className="w-16 h-2 bg-gray-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-4">
          <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 space-y-3 animate-pulse">
            <Pulse w="w-28" h="h-4" />
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-[#0d0d15] rounded-xl" />
            ))}
          </div>
          <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 space-y-2 animate-pulse">
            <Pulse w="w-32" h="h-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-[#0d0d15] rounded-lg" />
            ))}
          </div>
          <div className="bg-[#111118] border border-gray-800/60 rounded-xl p-5 space-y-3 animate-pulse">
            <Pulse w="w-36" h="h-4" />
            <Pulse w="w-full" h="h-20" />
          </div>
        </div>
      </div>
    </div>
  )
}
