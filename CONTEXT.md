# Inside the Crate — Idle Mining
## Contexto completo do projeto para o Claude Code

---

## 1. VISÃO GERAL

**Nome do jogo:** Inside the Crate — Idle Mining  
**Tipo:** Jogo idle web3 baseado em navegador  
**Rede:** Solana  
**Token principal:** $CRATE  
**Lançamento alvo:** Dezembro 2026  
**Desenvolvedor:** Solo dev (vibecoding com Claude)  
**Modelo:** Community-funded, sem pré-alocação de equipe  
**Plataforma de lançamento do token:** DegenSafe  

---

## 2. PREMISSA NARRATIVA

Robôs autônomos extraem recursos de planetas alienígenas. O jogador gerencia um **Outpost** (base de operações) em um planeta distante, expande sua frota de robôs, melhora equipamentos via crafting de peças e compete com outros operadores pela maior produção da rede.

---

## 3. STACK TÉCNICA

```
Frontend:    Next.js 16 + TypeScript + Tailwind CSS
Auth:        Supabase Auth (e-mail/senha)
Banco:       Supabase PostgreSQL + Prisma 6 (ORM)
Backend:     Next.js API Routes (serverless)
Solana:      @solana/web3.js (apenas leitura + detecção de depósitos)
Cotação:     Jupiter Aggregator API (tempo real)
Hospedagem:  Vercel (free tier)
RPC Solana:  Helius (free tier)
```

### Dependências instaladas
```json
{
  "dependencies": {
    "@supabase/supabase-js": "latest",
    "@supabase/ssr": "latest",
    "@solana/web3.js": "latest",
    "axios": "latest",
    "zustand": "latest",
    "@tanstack/react-query": "latest",
    "bcryptjs": "latest"
  },
  "devDependencies": {
    "prisma": "^6",
    "@prisma/client": "^6",
    "@types/bcryptjs": "latest"
  }
}
```

---

## 4. ESTRUTURA DE PASTAS

```
inside-the-crate/
├── prisma/
│   └── schema.prisma              ✅ Criado e sincronizado com Supabase
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx         ✅ Criado
│   │   │   ├── login/
│   │   │   │   └── page.tsx       ✅ Criado e funcionando
│   │   │   └── register/
│   │   │       └── page.tsx       ✅ Criado e funcionando
│   │   ├── (game)/
│   │   │   ├── layout.tsx         ✅ Criado (sidebar + área principal)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx       ✅ Dashboard completo com dados reais
│   │   │   ├── outpost/
│   │   │   ├── inventory/
│   │   │   ├── lootbox/
│   │   │   ├── shop/
│   │   │   ├── market/
│   │   │   ├── crafting/
│   │   │   ├── minigames/
│   │   │   ├── codex/
│   │   │   ├── missions/
│   │   │   ├── ranking/
│   │   │   ├── profile/
│   │   │   └── wallet/
│   │   ├── admin/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── register/
│   │   │   │       └── route.ts   ✅ Criado
│   │   │   ├── game/
│   │   │   └── admin/
│   │   ├── layout.tsx             ✅ Root layout (metadados do jogo)
│   │   └── page.tsx               ✅ Landing page básica
│   ├── components/
│   │   ├── layout/
│   │   │   └── GameSidebar.tsx    ✅ Sidebar com navegação e logout
│   │   ├── game/
│   │   └── ui/
│   ├── lib/
│   │   ├── supabase.ts            ✅ createBrowserClient (SSR-compatible)
│   │   ├── supabase-admin.ts      ✅ Apenas backend
│   │   └── prisma.ts              ✅ Singleton do Prisma
│   ├── hooks/
│   ├── stores/
│   └── types/
│       └── index.ts               ✅ Types globais
├── proxy.ts                       ✅ Proteção de rotas (Next.js 16)
└── .env                           ✅ Configurado
```

---

## 5. VARIÁVEIS DE AMBIENTE (.env)

```env
DATABASE_URL="postgresql://..."         # Supabase connection pooling
DIRECT_URL="postgresql://..."           # Supabase direct connection
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."     # Publishable key
SUPABASE_SERVICE_ROLE_KEY="..."         # Secret key (apenas backend)
HELIUS_API_KEY="..."
HELIUS_RPC_URL="https://mainnet.helius-rpc.com/?api-key=..."
NEXTAUTH_SECRET="..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 6. DECISÕES TÉCNICAS — NEXT.JS 16 (CRÍTICO)

O projeto usa **Next.js 16**, não 14. Há breaking changes importantes:

### `middleware.ts` → `proxy.ts`
O arquivo de middleware foi renomeado para `proxy.ts` e a função exportada de `middleware` para `proxy`. O arquivo correto é `src/proxy.ts`.

```ts
// src/proxy.ts — padrão correto
export async function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] }
```

### `cookies()` é assíncrono
```ts
const cookieStore = await cookies()  // await obrigatório no Next.js 16
```

### Turbopack habilitado por padrão
`next dev` e `next build` usam Turbopack automaticamente.

### Padrão Supabase SSR
- **Browser (client components):** `createBrowserClient` do `@supabase/ssr`
- **Server (layouts, pages, API routes):** `createServerClient` do `@supabase/ssr`
- **NUNCA** usar `createClient` do `@supabase/supabase-js` no frontend — incompatível com o formato de cookie chunked do `@supabase/ssr`

```ts
// src/lib/supabase.ts — client do browser
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

```ts
// Em server components / layouts / API routes
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const cookieStore = await cookies()
const supabase = createServerClient(url, anonKey, {
  cookies: {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options)
      )
    },
  },
})
```

### Navegação após auth (login/logout)
Usar `window.location.href` em vez de `router.push` para garantir reload completo e re-execução do proxy:

```ts
// Login bem-sucedido
window.location.href = '/dashboard'

// Logout
await supabase.auth.signOut()
window.location.href = '/login'
```

---

## 7. BANCO DE DADOS — SCHEMA COMPLETO

O schema está em `prisma/schema.prisma` e já foi sincronizado com o Supabase (`prisma db push` executado com sucesso).

### Campos do model User (atenção aos nomes exatos):
```prisma
balanceCrate      Float    @default(0)   // NÃO crateBalance
balanceSol        Float    @default(0)   // NÃO solBalance
balanceLc         Float    @default(0)   // NÃO lcBalance
outpostSlots      Int      @default(3)
slotsRobots       Int      @default(10)
slotsEquipments   Int      @default(20)
slotsBaseUpgrades Int      @default(10)
slotsParts        Int      @default(50)
slotsConsumables  Int      @default(20)
slotsLootboxes    Int      @default(10)
```

### Tabelas criadas:
- `users` — perfil do jogador, saldos, slots de inventário e outpost
- `robots` — robôs do jogador com hash power e durabilidade
- `robot_equipments` — equipamentos instalados nos robôs
- `equipments` — equipamentos no inventário
- `base_upgrades` — melhorias de base no inventário
- `inventory_parts` — peças de crafting (stack de até 99)
- `consumables` — kits de reparo e boosts temporários
- `inventory_lootboxes` — lootboxes não abertas
- `mining_rewards` — histórico de recompensas de mineração
- `mining_blocks` — blocos processados pelo sistema de mineração
- `transactions` — histórico financeiro completo
- `withdraw_requests` — solicitações de saque (processamento manual)
- `market_listings` — itens listados no mercado P2P
- `market_purchases` — compras realizadas no mercado
- `codex_entries` — itens registrados no Codex
- `missions` — definições das missões
- `user_missions` — progresso do jogador nas missões
- `minigame_sessions` — histórico de partidas
- `minigame_boosts` — boost ativo de minigame do jogador
- `weekly_drops` — controle do Weekly Supply Drop
- `notifications` — notificações do jogador

### Enums definidos:
```
Rarity:          COMMON, UNCOMMON, RARE, EPIC, LEGENDARY
EffectType:      HASH_POWER_FLAT, HASH_POWER_PCT, DURABILITY_LOSS_PCT, GLOBAL_EFFICIENCY_PCT, UPTIME_HOURS
PartCategory:    ENERGY, MINING, MAINTENANCE, TERRAIN, AI_SOFTWARE, SPECIAL
ConsumableType:  REPAIR_KIT, BOOST_TEMP
LootboxType:     PARTS_CRATE, SUPPLY_CRATE
Token:           CRATE, SOL, LC
TransactionType: DEPOSIT, WITHDRAW, LOOTBOX_PURCHASE, SHOP_PURCHASE, MARKET_SALE, MARKET_PURCHASE, MINING_REWARD, CONVERSION, WEEKLY_DROP, MISSION_REWARD, RANKING_REWARD
TxStatus:        PENDING, CONFIRMED, FAILED
WithdrawStatus:  PENDING, PROCESSING, COMPLETED, FAILED
MarketItemType:  ROBOT, EQUIPMENT, BASE_UPGRADE, PARTS_CRATE, SUPPLY_CRATE, CONSUMABLE
ListingStatus:   ACTIVE, SOLD, EXPIRED, CANCELLED
CodexItemType:   ROBOT, EQUIPMENT, BASE_UPGRADE
MissionCategory: FIRST_STEPS, MINING, LOOTBOX, CRAFTING, MARKET, MINIGAMES, CODEX, RANKING, SEASONAL
RewardType:      LOOTBOX, ROBOT, EQUIPMENT, REPAIR_KIT, INVENTORY_EXPANSION, COSMETIC, TITLE, OUTPOST_SLOT
GameType:        SPACE_DRIFT, BLOCK_FALL, SERPENTINE, ORBITAL_JUMP, SPACE_FROG
```

---

## 8. SISTEMA DE TOKENS

| Token | Uso no jogo | Compras | Minerável | Sacável | Conversão |
|---|---|---|---|---|---|
| $CRATE | Moeda principal | Sim | Sim | Sim | Entrada |
| SOL | Recurso minerável | Não | Sim | Sim | SOL → CRATE |
| LC Shib | Recurso minerável | Não | Sim | Sim | LC → CRATE |

**Regra crítica:** Conversão é UNIDIRECIONAL — SOL e LC podem virar CRATE, mas CRATE não pode virar SOL ou LC.

---

## 9. WALLET CUSTODIAL

- Usuários NÃO conectam carteiras externas (sem Phantom, Solflare, etc.)
- Login é feito com e-mail e senha
- Cada usuário recebe um **endereço de depósito único** gerado no cadastro (`Keypair.generate()`)
- O backend monitora depósitos via Helius RPC
- **Saques são processados MANUALMENTE pelo admin 1x por dia**
- A chave privada NUNCA está no código — saques são feitos via carteira pessoal do admin
- O admin tem um painel para ver a fila de saques e marcar como processado

---

## 10. OUTPOST (BASE DO JOGADOR)

- Começa com 3 slots para robôs
- Pode expandir até 6 slots (compra na loja)
- Slots 4, 5, 6 custam $10, $20, $40 em CRATE respectivamente
- Melhorias de Base afetam TODOS os robôs simultaneamente
- Robô precisa ser REMOVIDO do Outpost antes de equipar/desequipar itens

---

## 11. ROBÔS

### Raridades e hash power:
| Raridade | HP Base | Variação |
|---|---|---|
| COMMON | 10 HP | 8–12 HP |
| UNCOMMON | 30 HP | 25–35 HP |
| RARE | 80 HP | 70–90 HP |
| EPIC | 200 HP | 180–220 HP |
| LEGENDARY | 500 HP | 480–550 HP |

### Sistema de desgaste:
- Desgaste padrão: -1% de durabilidade por hora
- Com Blindagem Nanoativa: -0.5% por hora
- 100–51%: HP normal
- 50–21%: HP reduzido em 20%
- 20–1%: Modo emergência (-60% HP)
- 0%: Robô para completamente

### Kits de reparo:
- Kit Básico: +5% durabilidade
- Kit Padrão: +25% durabilidade
- Kit Avançado: +50% durabilidade
- Kit Premium: +75% durabilidade
- Kit Completo: +100% durabilidade

### Coleções:
- Robôs têm nomes e designs únicos organizados em linhas de produção
- Bônus de eficiência ao usar robôs da mesma coleção simultaneamente
- Coleções completas no Codex concedem bônus permanentes

### Slots de equipamento:
- Quantidade por robô a ser definida no balanceamento
- Princípio: raridade maior = mais slots

---

## 12. LOOTBOXES

### Parts Crate ($0.50 fixo em CRATE):
| Drop | Quantidade | Probabilidade |
|---|---|---|
| Peças Comuns | ×4 | 35% |
| Peças Comuns | ×8 | 25% |
| Peças Incomuns | ×2 | 18% |
| Peças Incomuns | ×4 | 12% |
| Peça Rara | ×1 | 5% |
| Peças Raras | ×2 | 3% |
| Peça Épica | ×1 | 2% |

**Limite:** 5 Parts Crates compradas por semana (reset toda segunda-feira)  
**Não conta no limite:** Crates ganhas no ranking, weekly drop ou missões

### Supply Crate (~$5.00 em CRATE, preço dinâmico):
| Drop | Quantidade | Probabilidade |
|---|---|---|
| Equipamento Comum | ×1 | 18% |
| Melhoria de Base Comum | ×1 | 15% |
| Unidade de Reparo | ×5 | 12% |
| Robô Comum | ×1 | 12% |
| Equipamento Incomum | ×1 | 9% |
| Melhoria de Base Incomum | ×1 | 8% |
| Robô Incomum | ×1 | 7% |
| Equipamento Raro | ×1 | 5% |
| Melhoria de Base Rara | ×1 | 4% |
| Robô Raro | ×1 | 4% |
| Equipamento Épico | ×1 | 2% |
| Melhoria de Base Épica | ×1 | 2% |
| Robô Épico | ×1 | 1% |
| Equipamento Lendário | ×1 | 0.5% |
| Melhoria de Base Lendária | ×1 | 0.3% |
| Robô Lendário | ×1 | 0.2% |

**Itens lendários:** Exclusivos da Supply Crate e eventos sazonais — NUNCA vendidos diretamente na loja

---

## 13. SISTEMA DE MINERAÇÃO

**Fórmula:**
```
Recompensa = (HP do jogador / HP total da rede) × Recompensa por bloco
```

- HP do jogador = soma do HP efetivo de todos os robôs ativos (considera desgaste + upgrades)
- Blocos processados em intervalos regulares pelo backend
- Bootstrap period (primeiros 30 dias): apenas CRATE como recompensa
- Após bootstrap: SOL e LC Shib adicionados conforme receita acumulada

---

## 14. LOJA

- Preços fixados em USD, convertidos para CRATE em tempo real via Jupiter API
- Raridade máxima vendida na loja: **ÉPICO** (lendários NUNCA vendidos)
- Categorias: Robôs, Equipamentos, Melhorias de Base, Slots de Outpost, Kits de Reparo, Expansões de inventário, Cosméticos

---

## 15. INVENTÁRIO

### Limites iniciais e máximos:
| Aba | Inicial | Máximo | Por expansão |
|---|---|---|---|
| Robôs | 10 | 30 | +5 |
| Equipamentos | 20 | 60 | +10 |
| Melhorias de Base | 10 | 30 | +5 |
| Peças | 50 slots (×99 por slot) | 200 | +25 |
| Consumíveis | 20 | 50 | +10 |
| Lootboxes | 10 | 30 | +5 |

**Regras:**
- Inventário cheio = não pode interagir com NENHUMA mecânica que gere item
- Expansões custam CRATE com preço crescente (+20% a cada compra na mesma aba)
- Botão de destruição de itens disponível em todas as abas
- Lendários exigem confirmação dupla + digitar "CONFIRMAR" para destruir
- Destruição em lote disponível

---

## 16. MERCADO INTERNO P2P

- Moeda: CRATE exclusivamente
- Taxa: 5% por venda → vai para o reward pool
- Listagem: 7 dias (renovável)
- Cancelamento: gratuito
- Robôs ativos no Outpost e equipamentos instalados: BLOQUEADOS para listagem
- Transferência direta entre usuários: PROIBIDA (apenas via mercado — previne multiaccount)
- Equipamentos: podem ser removidos e reinstalados entre robôs do mesmo usuário gratuitamente

---

## 17. CODEX (SALA DE TROFÉUS)

- Item registrado no Codex é **removido permanentemente do jogo**
- Irreversível — nunca pode ser desfeito
- Concede bônus permanentes ao jogador enquanto registrado
- Coleções completas concedem bônus extras
- Visível publicamente no perfil do jogador
- Cria deflação natural de itens raros no mercado

### Exemplos de coleções:
| Coleção | Itens | Bônus individual | Bônus completa |
|---|---|---|---|
| Linha Sentinel — Série Ártica | 3 robôs | +3% HP cada | +15% HP global + skin |
| Linha Titan — Série Vulcânica | 3 robôs | +5% HP cada | +25% HP + -10% desgaste |
| Linha Drone — Série Estelar | 4 robôs | +2% HP cada | +10% HP + 1 slot grátis |
| Série Singularity — Lendária | 2 robôs | +15% HP cada | +50% HP + título |
| Coleção Fundadores | 1 de cada raridade | +2% HP cada | +30% mineração + badge |

---

## 18. MINIGAMES

### Jogos disponíveis:
| Jogo | Referência | Recompensa base |
|---|---|---|
| Space Drift | Space Invaders | Boost HP 24h |
| Block Fall | Tetris | Boost HP 24h |
| Serpentine | Snake | Boost HP 24h |
| Orbital Jump | Flappy Bird | Boost HP 24h |
| Space Frog | Frogger | Boost HP 24h |

### Regras críticas:
- **Derrota = ZERO recompensas** (sem exceção)
- Drops de itens e kits de reparo: apenas na vitória
- Cooldown progressivo por jogo (aumenta a cada partida no dia)

### Drops por vitória:
| Jogo | Chance drop | Kit máximo |
|---|---|---|
| Space Drift | 15% | 25% |
| Block Fall | 18% | 50% |
| Serpentine | 12% | 25% |
| Orbital Jump | 10% | 25% |
| Space Frog | 20% | 100% (único!) |

### Progressão de dificuldade:
- A cada 3 vitórias no dia, dificuldade aumenta (máx nível 4)
- Nível 2: após 3 vitórias (+30% pontuação alvo, +30% boost)
- Nível 3: após 6 vitórias (+70%, +70%)
- Nível 4: após 9 vitórias (+120%, +120%)

### Progressão de duração do boost:
| Vitórias no dia | Duração |
|---|---|
| 1–19 | 24h |
| 20 | 56h |
| 40 | 84h |
| 60 | 112h |
| 80 | 140h |
| 100 | 168h (máximo) |

- Boost é CUMULATIVO
- Precisa de ao menos 1 vitória a cada 24h para manter a duração conquistada
- Caminho f2p principal para progressão sem investir

---

## 19. WEEKLY SUPPLY DROP

- Todo usuário ATIVO recebe 1 drop toda segunda-feira
- Ativo = jogou ao menos 1 minigame OU teve robô minerando por 24h na semana
- Separado do limite semanal de Parts Crates

| Drop | Probabilidade |
|---|---|
| Peças Comuns ×2 | 40% |
| Kit de Reparo 5% | 20% |
| Peças Incomuns ×1 | 18% |
| Kit de Reparo 25% | 10% |
| Parts Crate gratuita | 7% |
| Peça Rara ×1 | 4% |
| Supply Crate gratuita | 1% |

---

## 20. CORRIDA DE MINERAÇÃO (SEMANAL)

| Posição | Recompensa |
|---|---|
| 1º | 3× Supply Crate + 2× Parts Crate |
| 2º | 2× Supply Crate + 2× Parts Crate |
| 3º | 2× Supply Crate + 1× Parts Crate |
| 4º–5º | 1× Supply Crate + 1× Parts Crate |
| 6º–10º | 1× Parts Crate |
| 11º+ | Badge de participação |

Crates de ranking NÃO contam no limite semanal de Parts Crates.

---

## 21. EVENTOS SAZONAIS

| Evento | Duração | Mecânica | Recompensa |
|---|---|---|---|
| Tempestade Solar | 48h | +50% HP, chance dobrada de lendário | Skin exclusiva |
| Corrida de Asteroides | 72h | Parts Crate com 10% épicas | Peça especial |
| Protocolo Ômega | 1 semana | Missões diárias com Supply Crates | Equipamento lendário |

---

## 22. SISTEMA DE MISSÕES

### Categorias:
FIRST_STEPS, MINING, LOOTBOX, CRAFTING, MARKET, MINIGAMES, CODEX, RANKING, SEASONAL

### Recompensas possíveis:
- Parts Crate / Supply Crate gratuitas
- Robô (tier mínimo do nível da missão)
- Equipamento
- Kit de Reparo
- Expansão de inventário
- Cosmético exclusivo (nunca na loja)
- Título de jogador (nunca na loja)
- Slot de Outpost extra (nunca na loja — apenas Codex e missões)

### Exemplos:
- Ativar primeiro robô → 1× Parts Crate + Kit 25%
- Minerar 7 dias seguidos → Robô Comum + título "Operador"
- Abrir 10 lootboxes → 1× Supply Crate
- Vencer 100 minigames → Robô Incomum + cosmético
- Completar coleção no Codex → 1× Supply Crate + slot de Outpost extra
- Entrar no top 10 semanal → Robô Raro + título "Minerador Elite"

---

## 23. MONETIZAÇÃO

| Fonte | Mecanismo | Destino |
|---|---|---|
| Lootboxes | Taxa % sobre cada abertura | Reward pool |
| Mercado P2P | 5% por transação | Reward pool |
| Propagandas | AdSense no site | Operacional + reward pool |
| Loja | Venda de itens em CRATE | Reward pool |
| Conversão | Spread na conversão SOL/LC → CRATE | Operacional |
| Expansões | Slots de inventário e Outpost | Operacional |

---

## 24. PÁGINAS DO WEBSITE

| Página | Rota | Descrição |
|---|---|---|
| Landing | `/` | Apresentação, tokenomics, CTA |
| Login | `/login` | Autenticação |
| Cadastro | `/register` | Criação de conta |
| Dashboard | `/dashboard` | Hub principal, resumo geral |
| Outpost | `/outpost` | Gerenciar robôs e mineração |
| Inventário | `/inventory` | Todos os itens do jogador |
| Lootboxes | `/lootbox` | Comprar e abrir caixas |
| Loja | `/shop` | Comprar itens |
| Crafting | `/crafting` | Combinar peças |
| Mercado | `/market` | Comprar/vender P2P |
| Minigames | `/minigames` | 5 jogos clássicos |
| Codex | `/codex` | Sala de troféus |
| Missões | `/missions` | Conquistas |
| Ranking | `/ranking` | Corrida de Mineração |
| Perfil | `/profile` | Perfil público |
| Carteira | `/wallet` | Saldo, depósito, saque |
| Admin | `/admin` | Painel privado |

---

## 25. ROADMAP DE DESENVOLVIMENTO

| Fase | Período | Entregas |
|---|---|---|
| 1 — Fundação | Mai–Jul 2026 | Auth, depósito, landing |
| 2 — Core | Ago–Out 2026 | Outpost, robôs, mineração, lootboxes |
| 3 — Economia | Out–Nov 2026 | Loja, crafting, mercado, conversão |
| 4 — Conteúdo | Nov 2026 | Minigames, Codex, missões, eventos |
| 5 — Launch | Dez 2026 | Mainnet, balanceamento, lançamento |

---

## 26. O QUE JÁ FOI FEITO

### Infraestrutura
- [x] Next.js 16 + TypeScript + Tailwind configurado
- [x] Dependências instaladas
- [x] Schema Prisma completo criado e sincronizado com Supabase (`prisma db push` OK)
- [x] `src/lib/supabase.ts` — `createBrowserClient` do `@supabase/ssr` (SSR-compatible)
- [x] `src/lib/supabase-admin.ts` — client backend com service role key
- [x] `src/lib/prisma.ts` — singleton do Prisma
- [x] `src/types/index.ts` — types globais
- [x] `.env` — variáveis de ambiente configuradas

### Autenticação (bug corrigido)
- [x] `src/proxy.ts` — proteção de rotas para Next.js 16 (renomeado de `middleware.ts`)
- [x] `src/app/(auth)/layout.tsx` — layout centralizado
- [x] `src/app/(auth)/login/page.tsx` — login funcionando com redirect correto
- [x] `src/app/(auth)/register/page.tsx` — cadastro com criação de endereço Solana
- [x] `src/app/api/auth/register/route.ts` — API que cria perfil no Prisma + gera `depositAddress`

### Interface do jogo
- [x] `src/app/page.tsx` — landing page básica com CTA
- [x] `src/app/layout.tsx` — root layout com metadados do jogo
- [x] `src/app/(game)/layout.tsx` — layout do jogo com sidebar
- [x] `src/components/layout/GameSidebar.tsx` — sidebar com todos os links + logout
- [x] `src/app/(game)/dashboard/page.tsx` — dashboard completo (saldos, robôs ativos, hash power, ações rápidas)

---

## 27. O QUE FALTA FAZER (PRÓXIMOS PASSOS)

1. Sistema de depósito (monitorar chegada de CRATE via Helius RPC)
2. Outpost — listar e ativar/desativar robôs nos slots
3. Sistema de mineração — cálculo de rewards por bloco (API route + cron)
4. Inventário com abas (robôs, equipamentos, peças, consumíveis, lootboxes)
5. Lootboxes — comprar e abrir com animação
6. Loja com preços dinâmicos (Jupiter API)
7. Crafting de peças
8. Mercado P2P
9. 5 minigames
10. Codex
11. Missões
12. Ranking semanal
13. Weekly Supply Drop (cron job)
14. Painel admin (fila de saques)
15. Landing page completa (tokenomics, FAQ, roadmap)

---

## 28. DECISÕES TÉCNICAS IMPORTANTES

1. **Sem NFT on-chain** — robôs e itens são apenas no banco de dados. Mercado interno com taxa de 5%.
2. **Chave privada fora do código** — saques são manuais via carteira pessoal do admin.
3. **Preços em USD** — convertidos para CRATE em tempo real via Jupiter API.
4. **Parts Crate limitada a 5/semana** — para controlar inflação de peças no mercado.
5. **Prisma versão 6** — versão 7 tem breaking changes. Usar `prisma@6` e `@prisma/client@6`.
6. **`supabaseAdmin` separado** — nunca importar em componentes client-side, apenas em API routes.
7. **Derrota em minigames = zero recompensas** — drops apenas na vitória.
8. **Lendários nunca vendidos na loja** — apenas Supply Crate e eventos sazonais.
9. **Transferência de itens entre usuários proibida** — apenas via mercado (previne multiaccount).
10. **Equipamento só pode ser instalado/removido com robô fora do Outpost.**
11. **`window.location.href` para navegação pós-auth** — `router.push` não re-executa o proxy; usar hard navigation para login e logout.
12. **Next.js 16 usa `proxy.ts`** — o arquivo `middleware.ts` está deprecated e pode não funcionar.

---

## 29. AVISOS LEGAIS (OBRIGATÓRIOS NO SITE)

- $CRATE é um token de utilidade sem valor garantido
- Não constitui investimento
- Sem promessa de retorno financeiro
- Wallet custodial — usuário ciente dos riscos
- Saques em até 24h com valor mínimo
- Itens do jogo sem valor fora da plataforma
- Projeto pode encerrar operações a qualquer momento
