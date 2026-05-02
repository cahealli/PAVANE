# Pavane — Guia para Claude

## Identidade do projeto

Pavane é um painel de orquestração agentic para desenvolvimento de software.
Stack: Next.js 14 + Hono + SQLite + Drizzle ORM. Monorepo pnpm.

```
Codex pensa. DeepSeek altera. Pavane verifica. Humano aprova.
```

---

## Idioma

**Todo o projeto é em português brasileiro.**
- Código: inglês (nomes de variáveis, funções, tipos)
- UI, mensagens, labels, comentários, docs: português brasileiro
- Commits, CHANGELOG, PRs: português brasileiro

---

## Versionamento

**Formato:** `ddmmyy.hh.mm` (data + hora do momento do commit)

Exemplos:
- `020526.14.30` → 02 de maio de 2026, 14h30
- `150326.09.15` → 15 de março de 2026, 09h15

O arquivo de versão fica em `apps/web/src/lib/version.ts`:
```typescript
export const APP_VERSION = "020526.14.30";
```

**Gerar versão atual (PowerShell):**
```powershell
Get-Date -Format "ddMMyy.HH.mm"
```

---

## Convenção de commits

**Formato obrigatório:**
```
[ddmmyy.hh.mm] tipo(escopo): descrição curta em português

- detalhe 1
- detalhe 2
```

**Tipos aceitos:**
| Tipo | Quando usar |
|------|-------------|
| `feat` | nova funcionalidade |
| `fix` | correção de bug |
| `refactor` | refatoração sem mudança de comportamento |
| `chore` | configs, deps, scripts |
| `docs` | documentação |
| `style` | formatação, sem lógica |

**Escopos comuns:** `api`, `ui`, `kanban`, `runner`, `worker`, `workspace`, `orchestrator`, `db`, `deps`

**Exemplo:**
```
[020526.14.30] feat(kanban): adicionar drag-and-drop entre colunas

- implementado com dnd-kit/core e dnd-kit/sortable
- status do card atualizado via PATCH /api/cards/:id
- animação suave com CSS.Transform
```

**Co-author obrigatório ao usar Claude:**
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Convenção de CHANGELOG

Arquivo: `CHANGELOG.md` na raiz.
**Atualizar a cada commit relevante.**

**Formato de entrada:**
```markdown
## [ddmmyy.hh.mm] — DD/MM/AAAA

### Adicionado
- Novas funcionalidades

### Corrigido
- Bugs corrigidos

### Mudado
- Alterações em funcionalidades existentes

### Removido
- O que foi removido

### Interno
- Refatorações, configs, deps, CI
```

---

## Regras de branch

```
IMPORTANTE: Nunca fazer commit/push direto em master

Fluxo:
1. Trabalhar em branch dev ou feature/xxx
2. Testar localmente
3. Merge para master quando confirmado
```

---

## Arquitetura — o que não mudar sem pensar

- **Workers nunca editam o repo original** — sempre via `git worktree`
- **Sem merge automático** — humano aprova
- **Sem push automático** — humano controla
- **OrchestratorAdapter** é a interface que separa mock do Codex real — não bypassar
- **SSE emitter** (`runner/emitter.ts`) é compartilhado entre todas as runs — não criar um por run

---

## Estrutura de pastas

```
apps/api/src/
  db/           → schema SQLite + init
  orchestrator/ → interface OrchestratorAdapter + MockCodexOrchestrator
  executor/     → runOpenCode (spawn do OpenCode CLI)
  workspace/    → WorkspaceManager (git worktree, diff, status)
  runner/       → engine.ts (pipeline principal) + emitter.ts (SSE)
  routes/       → /projects /cards /runs

apps/web/src/
  app/          → páginas Next.js
  components/
    kanban/     → KanbanBoard, KanbanColumn, KanbanCard
    run/        → RunPanel (logs SSE em tempo real)
    modals/     → AddProjectModal, AddCardModal
    ui/         → Button, Modal, Badge
  lib/          → api.ts, utils.ts
  store/        → Zustand store

packages/shared/src/
  types.ts      → todos os tipos TypeScript compartilhados
```

---

## Padrões de código

- TypeScript estrito em todo o projeto
- Sem `any` explícito onde evitável
- Componentes React: `"use client"` apenas quando necessário
- API Hono: sempre retornar JSON com status correto
- Evidências: toda execução deve gerar evidências auditáveis
- Logs: usar o emitter SSE, não `console.log` em código de produção
