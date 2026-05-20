import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'

/**
 * Retorna o usuário autenticado no contexto de servidor (API routes e Server Components).
 * Retorna null se não houver sessão ativa OU se o usuário estiver banido.
 */
export async function getServerUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components read-only — ignorado
          }
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Verifica ban no banco — usuários banidos recebem 401 em todas as rotas de jogo
  const dbUser = await prisma.user.findUnique({
    where:  { id: user.id },
    select: { isBanned: true },
  })
  if (!dbUser || dbUser.isBanned) return null

  return user
}
