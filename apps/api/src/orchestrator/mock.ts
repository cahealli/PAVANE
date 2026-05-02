import type {
  OrchestratorAdapter,
  OrchestratorContext,
  ExecutionPlan,
  ReviewResult,
  CandidateResult,
} from "./interface.js";

export class MockCodexOrchestrator implements OrchestratorAdapter {
  readonly name = "mock-codex";

  async createPlan(ctx: OrchestratorContext): Promise<ExecutionPlan> {
    await sleep(800);

    const isComplex =
      ctx.objective.length > 200 ||
      ctx.objective.toLowerCase().includes("auth") ||
      ctx.objective.toLowerCase().includes("database") ||
      ctx.objective.toLowerCase().includes("payment") ||
      ctx.objective.toLowerCase().includes("security") ||
      ctx.objective.toLowerCase().includes("architect");

    const strategy = isComplex ? "parallel_attempts" : "single_worker";
    const maxWorkers = strategy === "parallel_attempts" ? 2 : 1;
    const modelPolicy = isComplex ? "pro_only" : "flash_only";

    return {
      summary: `Plan for: ${ctx.objective.slice(0, 100)}...`,
      technicalApproach: generateApproach(ctx.objective),
      likelyFiles: guessFiles(ctx.objective),
      risks: generateRisks(ctx.objective),
      successCriteria: [
        "All changed files type-check without errors",
        "Build passes without errors",
        "Only files relevant to the objective are modified",
        "No unrelated changes introduced",
      ],
      strategy,
      modelPolicy,
      maxWorkers,
      workerPrompt: buildWorkerPrompt(ctx.objective),
      constraints: [
        "Altere o mínimo de arquivos necessários",
        "Não faça refatoração não solicitada",
        "Respeite o estilo do projeto",
        "Leia arquivos antes de alterar",
        "Não mexa em áreas fora do escopo",
      ],
    };
  }

  async reviewCandidates(
    ctx: OrchestratorContext,
    plan: ExecutionPlan,
    candidates: CandidateResult[]
  ): Promise<ReviewResult> {
    await sleep(600);

    const completed = candidates.filter((c) => c.exitCode === 0);
    const withDiff = completed.filter((c) => c.diff && c.diff.trim().length > 0);
    const typecheckPassed = withDiff.filter(
      (c) => !c.typecheckResult || c.typecheckResult.includes("0 errors")
    );
    const buildPassed = typecheckPassed.filter(
      (c) => !c.buildResult || !c.buildResult.toLowerCase().includes("error")
    );

    const best = buildPassed[0] ?? typecheckPassed[0] ?? withDiff[0] ?? completed[0];

    if (!best) {
      return {
        approved: false,
        summary: "Nenhum worker completou a tarefa com sucesso.",
        issues: candidates.map((c) => `Worker ${c.label}: exit code ${c.exitCode}`),
        recommendation: "Revisar os logs de cada worker e tentar novamente.",
      };
    }

    const issues: string[] = [];

    if (!best.diff || best.diff.trim().length === 0) {
      issues.push("Worker não produziu diff — nenhum arquivo foi alterado.");
    }

    if (best.typecheckResult && best.typecheckResult.includes("error")) {
      issues.push("Typecheck reportou erros.");
    }

    if (best.buildResult && best.buildResult.toLowerCase().includes("error")) {
      issues.push("Build falhou.");
    }

    const approved = issues.length === 0;

    return {
      approved,
      summary: approved
        ? `Worker ${best.label} completou a tarefa satisfatoriamente. Diff capturado, typecheck e build passaram.`
        : `Worker ${best.label} foi o melhor candidato, mas há problemas a resolver.`,
      issues,
      recommendation: approved
        ? `Candidato ${best.label} está pronto para revisão humana.`
        : `Corrigir os problemas apontados antes de aprovar.`,
      selectedCandidateId: best.workerRunId,
    };
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function generateApproach(objective: string): string {
  return `
Abordagem técnica para: "${objective.slice(0, 80)}"

1. Identificar arquivos relevantes ao objetivo
2. Ler e entender o contexto atual do código
3. Implementar as mudanças necessárias com escopo mínimo
4. Executar verificações de qualidade
5. Reportar evidências ao orquestrador
  `.trim();
}

function guessFiles(objective: string): string[] {
  const files: string[] = [];
  const lower = objective.toLowerCase();

  if (lower.includes("component") || lower.includes("ui")) {
    files.push("src/components/", "src/app/");
  }
  if (lower.includes("api") || lower.includes("route") || lower.includes("endpoint")) {
    files.push("src/app/api/", "src/routes/");
  }
  if (lower.includes("database") || lower.includes("schema") || lower.includes("migration")) {
    files.push("src/db/", "drizzle/");
  }
  if (lower.includes("auth") || lower.includes("login")) {
    files.push("src/auth/", "src/middleware/");
  }
  if (lower.includes("test")) {
    files.push("__tests__/", "src/**/*.test.ts");
  }
  if (files.length === 0) {
    files.push("src/");
  }
  return files;
}

function generateRisks(objective: string): string[] {
  const risks: string[] = [];
  const lower = objective.toLowerCase();

  if (lower.includes("delete") || lower.includes("remove") || lower.includes("drop")) {
    risks.push("Operação destrutiva — verificar se dados existentes serão afetados");
  }
  if (lower.includes("auth") || lower.includes("permission")) {
    risks.push("Mudanças em autenticação podem afetar toda a aplicação");
  }
  if (lower.includes("database") || lower.includes("schema")) {
    risks.push("Mudanças de schema requerem migration — verificar compatibilidade");
  }
  if (lower.includes("api") || lower.includes("endpoint")) {
    risks.push("Mudanças em APIs públicas podem quebrar clientes existentes");
  }

  risks.push("Verificar se mudanças não introduzem regressões em funcionalidades existentes");
  return risks;
}

function buildWorkerPrompt(objective: string): string {
  return `
Você é um executor do Pavane.

Sua tarefa delegada pelo orquestrador:
${objective}

Regras obrigatórias:
- Altere APENAS o necessário para completar a tarefa
- Não faça refatoração não solicitada
- Respeite o estilo do projeto existente
- Leia arquivos antes de alterar
- Não mexa em áreas fora do escopo
- Não invente dependências sem necessidade
- Se algo bloquear, explique claramente

Ao terminar, entregue:
- Resumo do que foi feito
- Arquivos alterados
- Comandos executados
- Resultados de verificação
- Riscos conhecidos
  `.trim();
}
