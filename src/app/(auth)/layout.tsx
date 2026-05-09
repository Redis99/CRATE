import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Inside the Crate — Idle Mining',
  description: 'Login or create your account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Inside the <span className="text-blue-500">Crate</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">Idle Mining</p>
        </div>
        {children}
      </div>
    </div>
  )
}
