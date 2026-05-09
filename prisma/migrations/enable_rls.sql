-- ============================================================
-- Habilita Row Level Security (RLS) em todas as tabelas públicas
--
-- Por que: O Supabase expõe o schema public via PostgREST.
-- Sem RLS, qualquer pessoa com a ANON_KEY pode ler/escrever
-- nas tabelas diretamente, sem passar pelo backend.
--
-- Efeito: PostgREST com anon/user token → bloqueado.
--         Prisma via DATABASE_URL (role postgres) → inalterado.
--         supabaseAdmin com service_role → inalterado.
--
-- Como rodar: cole no SQL Editor do Supabase e execute.
-- ============================================================

-- Usuários
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Robôs
ALTER TABLE public.robots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robot_equipments ENABLE ROW LEVEL SECURITY;

-- Itens
ALTER TABLE public.equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_lootboxes ENABLE ROW LEVEL SECURITY;

-- Mineração
ALTER TABLE public.mining_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_blocks ENABLE ROW LEVEL SECURITY;

-- Financeiro
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

-- Mercado
ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_purchases ENABLE ROW LEVEL SECURITY;

-- Codex e Missões
ALTER TABLE public.codex_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- Minigames
ALTER TABLE public.minigame_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.minigame_boosts ENABLE ROW LEVEL SECURITY;

-- Drops e Notificações
ALTER TABLE public.weekly_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
