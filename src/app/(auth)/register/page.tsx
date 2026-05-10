import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="bg-[#111118] border border-gray-800 rounded-2xl p-8 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-white mb-2">Closed Beta</h2>
      <p className="text-gray-400 text-sm mb-6 leading-relaxed max-w-xs mx-auto">
        New registrations are temporarily closed while we finish development.
        Follow us for updates on the public launch.
      </p>

      <Link
        href="/login"
        className="inline-block text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        Already have an account? Sign in
      </Link>
    </div>
  )
}
