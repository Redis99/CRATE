'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    if (username.length < 3) {
      setError('O nome de usuário deve ter pelo menos 3 caracteres.')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Nome de usuário pode conter apenas letras, números e _')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este e-mail já está cadastrado.')
        } else {
          setError(signUpError.message)
        }
        return
      }

      if (data.user) {
        // Cria o perfil do usuário via API
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: data.user.id,
            email,
            username,
          }),
        })

        const result = await res.json()

        if (!res.ok) {
          setError(result.error || 'Erro ao criar perfil.')
          return
        }

        setSuccess(true)
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      }
    } catch {
      setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-[#111118] border border-green-500/30 rounded-2xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Conta criada!</h2>
        <p className="text-gray-400 text-sm mb-1">
          Bem-vindo ao Inside the Crate, <span className="text-white font-medium">{username}</span>.
        </p>
        <p className="text-gray-600 text-xs">Redirecionando para o dashboard...</p>
      </div>
    )
  }

  return (
    <div className="bg-[#111118] border border-gray-800 rounded-2xl p-8">
      <h2 className="text-xl font-semibold text-white mb-6">Criar sua conta</h2>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="seu@email.com"
            className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Nome de usuário</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            placeholder="comandante_x"
            className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p className="text-gray-600 text-xs mt-1">Apenas letras, números e _</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Senha</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full bg-[#1a1a24] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p className="text-gray-600 text-xs mt-1">Mínimo 8 caracteres</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Confirmar senha</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-yellow-400/80 text-xs text-center">
          $CRATE é um token de utilidade. Participar não constitui investimento.
        </p>
      </div>

      <p className="text-center text-gray-500 text-sm mt-4">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  )
}
