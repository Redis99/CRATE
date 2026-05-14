function Pulse({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return <div className={`${w} ${h} bg-[#111118] rounded-lg animate-pulse`} />
}

export default function ShopLoading() {
  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 space-y-2">
        <Pulse w="w-24" h="h-8" />
        <Pulse w="w-64" h="h-4" />
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-8 w-24 bg-[#111118] rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-[#111118] border border-gray-800/60 rounded-xl p-4 space-y-3 animate-pulse">
            <div className="flex justify-between">
              <Pulse w="w-5" h="h-5" />
              <Pulse w="w-16" h="h-5" />
            </div>
            <Pulse w="w-32" h="h-4" />
            <Pulse w="w-full" h="h-3" />
            <Pulse w="w-full" h="h-9" />
          </div>
        ))}
      </div>
    </div>
  )
}
