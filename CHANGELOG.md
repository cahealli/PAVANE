# Changelog

## [020526.17.00] — 02/05/2026

### Adicionado
- MVP 0.1 completo do Pavane
- Backend Hono + SQLite + Drizzle ORM na porta 3001
- Frontend Next.js 14 + Tailwind CSS + dnd-kit na porta 3000
- Monorepo pnpm com workspaces (apps/api, apps/web, packages/shared)
- Board Kanban com 9 colunas e drag-and-drop (dnd-kit)
- Cadastro de projetos locais com detecção automática de git e PAVANE.md
- Cards/goals com título e objetivo de desenvolvimento
- Pipeline de execução completo: plano → worktree → executor → evidências → revisão
- `OrchestratorAdapter` — interface para orquestradores (mock incluso, pronto para Codex)
- `MockCodexOrchestrator` — cria plano estruturado e revisa candidatos automaticamente
- `WorkspaceManager` — gerencia git worktrees isolados por worker
- Executor OpenCode com suporte a DeepSeek Flash e DeepSeek Pro
- SSE (Server-Sent Events) para streaming de logs em tempo real na UI
- Coleta automática de evidências: diff, git status, typecheck, build, testes
- Routing automático de modelo: Flash para tarefas simples, Pro para complexas
- Configuração por projeto via PAVANE.md (comandos, modelos, workers, git)
- Script `Pavane.bat` para iniciar tudo com duplo clique no Windows
- CLAUDE.md com convenções de commit, versionamento e arquitetura
- Todo o projeto em português brasileiro

### Interno
- Tipos TypeScript compartilhados em packages/shared
- better-sqlite3 compilado com node-gyp para Node.js v22
- Proxy `/api/*` no Next.js apontando para Hono :3001
