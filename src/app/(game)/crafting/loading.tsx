function Pulse({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-[#111118] rounded-lg animate-pulse`} />
}

export default function CraftingLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 space-y-2">
        <Pulse w="w-36" h="h-8" />
        <Pulse w="w-80" h="h-4" />
      </div>
      <div className="flex gap-2 mb-5 flex-wrap">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-28 bg-[#111118] rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-gray-800/40 rounded-xl p-4 bg-[#0d0d15] space-y-3 animate-pulse">
            <div className="flex justify-between">
              <Pulse w="w-28" h="h-4" />
              <div className="w-14 h-5 bg-[#111118] rounded" />
            </div>
            <Pulse w="w-full" h="h-3" />
            <div className="bg-[#111118] rounded-lg p-3 space-y-2">
              <Pulse w="w-16" h="h-3" />
              {[1, 2].map((j) => (
                <div key={j} className="flex justify-between">
                  <Pulse w="w-32" h="h-3" />
                  <Pulse w="w-12" h="h-3" />
                </div>
              ))}
            </div>
            <div className="bg-[#111118] rounded-lg p-3 space-y-2">
              <Pulse w="w-14" h="h-3" />
              <Pulse w="w-full" h="h-8" />
            </div>
            <Pulse w="w-full" h="h-9" />
          </div>
        ))}
      </div>
    </div>
  )
}
