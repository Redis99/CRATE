'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ActionButton } from '@/components/ui/ActionButton'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setError('Incorrect email or password.')
        setLoading(false)
        return
      }

      if (data.session) {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#111118] border border-gray-800 rounded-2xl p-8">
      <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <ActionButton
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          loadingText="Signing in..."
        >
          Sign In
        </ActionButton>
      </form>

      <p className="text-center text-gray-500 text-sm mt-6">
        Don't have an account?{' '}
        <Link href="/register" className="text-blue-400 hover:text-blue-300 transition-colors">
          Create account
        </Link>
      </p>
    </div>
  )
}
