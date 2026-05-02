# Pavane

**Painel de orquestração agentic para desenvolvimento de software.**

Pavane transforma objetivos de código em execuções auditáveis, isoladas e revisáveis. Ele usa um modelo avançado como orquestrador e outros modelos como executores — separando quem pensa de quem implementa.

```
Codex pensa.
DeepSeek altera.
Pavane verifica.
Humano aprova.
```

---

## O que é o Pavane

Pavane é um sistema operacional visual para trabalho agentic em código. Não é um chat com IA. É um painel de controle onde cada card no Kanban representa um objetivo real de desenvolvimento, e cada execução é rastreável, com worktree isolado, diff, logs e evidências coletadas automaticamente.

**Diferença essencial:**
- A maioria das ferramentas usa o agente para executar diretamente
- O Pavane separa orquestração de execução: o orquestrador planeja e revisa, os executores implementam em ambientes isolados

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 + Tailwind CSS + dnd-kit |
| Backend | Hono + Node.js |
| Banco | SQLite via better-sqlite3 + Drizzle ORM |
| Orquestrador | Interface `OrchestratorAdapter` (mock incluso, pronto para Codex) |
| Executor | OpenCode CLI com DeepSeek Flash / Pro |
| Isolamento | `git worktree` por worker |
| Tempo real | SSE (Server-Sent Events) |
| Monorepo | pnpm workspaces |

---

## Arquitetura

```
┌──────────────────────────────────────────┐
│  Pavane UI (Next.js :3000)               │
│  Kanban · Cards · Runs · Logs · Diffs    │
└──────────────────┬───────────────────────┘
                   │ HTTP + SSE
┌──────────────────▼───────────────────────┐
│  Pavane API (Hono :3001)                 │
│  Projects · Cards · Runs · Runner Engine │
└────┬──────────────────────┬──────────────┘
     │                      │
┌────▼──────────┐   ┌───────▼──────────────┐
│  Orchestrator │   │  OpenCode Workers     │
│  plan/review  │   │  DeepSeek Flash/Pro   │
└────┬──────────┘   └───────┬──────────────┘
     │                      │
┌────▼──────────────────────▼──────────────┐
│  Workspace Manager                       │
│  git worktree · branch · sandbox         │
└──────────────────┬───────────────────────┘
                   │
┌──────────────────▼───────────────────────┐
│  Evidence Layer                          │
│  diff · git status · typecheck · build   │
└──────────────────────────────────────────┘
```

---

## Estrutura do projeto

```
pavane/
├── apps/
│   ├── api/                    # Backend Hono + SQLite
│   │   └── src/
│   │       ├── db/             # Schema + init SQLite
│   │       ├── orchestrator/   # Interface + MockCodexOrchestrator
│   │       ├── executor/       # OpenCode runner
│   │       ├── workspace/      # git worktree manager
│   │       ├── runner/         # Engine principal + SSE emitter
│   │       └── routes/         # /projects /cards /runs
│   └── web/                    # Frontend Next.js
│       └── src/
│           ├── app/            # Pages: / e /board/[projectId]
│           ├── components/
│           │   ├── kanban/     # KanbanBoard · KanbanColumn · KanbanCard
│           │   ├── run/        # RunPanel com logs SSE
│           │   ├── modals/     # AddProject · AddCard
│           │   └── ui/         # Badge · Button · Modal
│           ├── lib/            # api.ts · utils.ts
│           └── store/          # Zustand store
└── packages/
    └── shared/                 # Tipos TypeScript compartilhados
```

---

## Fluxo de execução

```
1. Criar card com objetivo de desenvolvimento
2. Clicar "Run with Pavane"
3. Orchestrator lê PAVANE.md e cria plano técnico
4. Pavane escolhe: single_worker ou parallel_attempts
5. Pavane cria worktrees git isolados (.pavane/worktrees/)
6. OpenCode + DeepSeek executa em cada worktree
7. Pavane coleta: diff · git status · typecheck · build · testes
8. Orchestrator revisa candidatos e escolha o melhor
9. Card vai para "Ready for Human Review"
10. Humano revisa o diff e aprova
```

---

## Pré-requisitos

- **Node.js** 18+ — [nodejs.org](https://nodejs.org)
- **pnpm** — `npm install -g pnpm`
- **OpenCode** — `npm install -g opencode` *(executor real)*
- **DeepSeek API Key** — [platform.deepseek.com](https://platform.deepseek.com)
- **Git** — necessário para `git worktree`
- **Visual Studio Build Tools** *(Windows)* — para compilar `better-sqlite3`

---

## Instalação

```bash
# Clone o repositório
git clone https://github.com/cahealli/PAVANE.git
cd PAVANE

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env e adicione sua DEEPSEEK_API_KEY

# Instale as dependências
pnpm install

# Compile o better-sqlite3 (Windows)
cd node_modules/.pnpm/better-sqlite3@9.6.0/node_modules/better-sqlite3
npx node-gyp rebuild
cd ../../../../..
```

---

## Como rodar

### Windows — duplo clique

```
Pavane.bat
```

Abre a API, a UI e o navegador automaticamente.

### Terminal

```bash
# API + UI juntos
pnpm dev

# Separados
pnpm api   # apenas backend :3001
pnpm web   # apenas frontend :3000
```

Acesse: **http://localhost:3000**

---

## Configuração do projeto — PAVANE.md

Cada repositório pode ter um `PAVANE.md` na raiz para customizar o comportamento:

```yaml
---
project: meu-app
default_branch: main
workspace_root: .pavane/worktrees

orchestrator:
  provider: mock          # trocar por "codex" quando disponível
  model: mock-v1

executors:
  flash:
    provider: opencode
    model: deepseek/deepseek-chat
  pro:
    provider: opencode
    model: deepseek/deepseek-reasoner

routing:
  default_model: deepseek/deepseek-chat
  use_pro_when:
    - "task touches auth"
    - "task touches database"
    - "task touches payments"
    - "task requires architectural reasoning"
    - "task touches more than 5 files"
    - "flash failed twice"

commands:
  install: pnpm install
  lint: pnpm lint
  typecheck: pnpm typecheck
  test: pnpm test
  build: pnpm build

completion:
  require_diff: true
  require_typecheck: true
  require_build: true
  require_codex_review: true
  require_human_approval: true

workers:
  max_parallel: 4
  default_strategy: parallel_attempts

git:
  branch_prefix: pavane/
  allow_push: false
  allow_merge: false
  allow_pr_create: false
---
```

Sem `PAVANE.md`, o Pavane usa defaults conservadores: 1 worker, DeepSeek Flash, sem comandos de verificação.

---

## Estados do Kanban

| Coluna | Significado |
|--------|-------------|
| **Backlog** | Card criado, aguardando |
| **Ready** | Pronto para iniciar execução |
| **Planning** | Orchestrator criando plano |
| **Implementing** | Worker(s) OpenCode executando |
| **Reviewing** | Orchestrator revisando candidatos |
| **Needs Fix** | Execução precisa de correções |
| **Ready for Human Review** | Pronto para o humano revisar o diff |
| **Done** | Aprovado e finalizado |
| **Failed** | Execução falhou |

---

## Modelo de dados

```typescript
Project     // repositório local registrado
Card        // objetivo de desenvolvimento (1 card = 1 task)
Run         // execução de um card (tem N workers)
WorkerRun   // execução isolada em um worktree (1 modelo, 1 worktree)
Evidence    // artefato coletado: diff, typecheck, build, review...
```

---

## API

```
GET    /api/health
GET    /api/projects
POST   /api/projects          { name, repoPath, defaultBranch? }
GET    /api/projects/:id
DELETE /api/projects/:id

GET    /api/cards?projectId=
POST   /api/cards             { projectId, title, objective }
GET    /api/cards/:id
PATCH  /api/cards/:id         { status?, title?, objective? }
DELETE /api/cards/:id

POST   /api/runs              { cardId }
GET    /api/runs/:id
GET    /api/runs/:id/events   → SSE stream
DELETE /api/runs/:id          → abort
```

---

## Plugando o orquestrador real

O `MockCodexOrchestrator` implementa a interface `OrchestratorAdapter`. Para usar Codex ou qualquer outro modelo:

```typescript
// apps/api/src/orchestrator/interface.ts
export type OrchestratorAdapter = {
  readonly name: string;
  createPlan(ctx: OrchestratorContext): Promise<ExecutionPlan>;
  reviewCandidates(
    ctx: OrchestratorContext,
    plan: ExecutionPlan,
    candidates: CandidateResult[]
  ): Promise<ReviewResult>;
};
```

Crie `apps/api/src/orchestrator/codex.ts` implementando essa interface e registre em `apps/api/src/runner/engine.ts`.

---

## Princípios de segurança

- Workers nunca editam o repositório original
- Cada worker tem seu próprio `git worktree` isolado
- Merge automático desabilitado no MVP
- Push automático desabilitado no MVP
- Todo comando executado é registrado como evidência
- Diff antes e depois de toda execução
- Timeout por worker (15 min default)
- Cancelamento de run a qualquer momento

---

## Roadmap

- [ ] Integração real com Codex app-server via `OrchestratorAdapter`
- [ ] Estratégia `parallel_attempts` com comparação automática de candidatos
- [ ] PR automático para o candidato aprovado
- [ ] Integração com GitHub API (status checks, review requests)
- [ ] Histórico de runs por card
- [ ] Retry automático com escalada Flash → Pro
- [ ] Suporte a múltiplos projetos no board simultâneo
- [ ] Docker sandbox para workers
- [ ] Notificações quando run completa

---

## Licença

MIT
