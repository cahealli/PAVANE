import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import { db } from "../db/index.js";
import { runs, workerRuns, evidence, cards, projects } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { WorkspaceManager } from "../workspace/manager.js";
import { runOpenCode } from "../executor/opencode.js";
import { MockCodexOrchestrator } from "../orchestrator/mock.js";
import type { OrchestratorAdapter, CandidateResult } from "../orchestrator/interface.js";
import type { PavaneConfig, WorkerModel, SSEEvent, LogEntry } from "@pavane/shared";
import { sseEmitter } from "./emitter.js";

const ORCHESTRATORS: Record<string, OrchestratorAdapter> = {
  mock: new MockCodexOrchestrator(),
};

const DATA_DIR =
  process.env.PAVANE_DATA_DIR ?? path.join(process.cwd(), ".pavane-data");

function now() {
  return new Date().toISOString();
}

function emit(runId: string, event: SSEEvent) {
  sseEmitter.emit(runId, event);
}

function log(runId: string, msg: string, level: LogEntry["level"] = "info", workerLabel?: string) {
  const entry: LogEntry = { ts: Date.now(), level, msg, workerLabel: workerLabel as any };
  emit(runId, { type: "log", data: entry });
}

async function updateRunStatus(runId: string, status: string, extra?: Record<string, any>) {
  await db
    .update(runs)
    .set({ status, updatedAt: now(), ...extra })
    .where(eq(runs.id, runId));
  emit(runId, { type: "run_status", data: { runId, status: status as any } });
}

async function updateWorkerStatus(
  workerId: string,
  status: string,
  extra?: Record<string, any>
) {
  await db
    .update(workerRuns)
    .set({ status, updatedAt: now(), ...extra })
    .where(eq(workerRuns.id, workerId));

  const worker = await db.query.workerRuns.findFirst({
    where: eq(workerRuns.id, workerId),
  });
  if (worker) {
    emit(worker.runId, {
      type: "worker_status",
      data: { workerId, status: status as any, label: worker.label as any },
    });
  }
}

async function saveEvidence(params: {
  runId: string;
  workerRunId?: string;
  kind: string;
  title: string;
  content: string;
}) {
  const ev = {
    id: nanoid(),
    runId: params.runId,
    workerRunId: params.workerRunId ?? null,
    kind: params.kind,
    title: params.title,
    content: params.content,
    createdAt: now(),
  };
  await db.insert(evidence).values(ev as any);
  emit(params.runId, {
    type: "evidence",
    data: { ...ev, workerRunId: ev.workerRunId ?? undefined } as any,
  });
}

function loadPavaneConfig(repoPath: string, configPath: string): PavaneConfig | null {
  const fullPath = path.isAbsolute(configPath)
    ? configPath
    : path.join(repoPath, configPath);
  if (!fs.existsSync(fullPath)) return null;
  try {
    const raw = fs.readFileSync(fullPath, "utf-8");
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    if (fmMatch) {
      return yaml.load(fmMatch[1]) as PavaneConfig;
    }
    return yaml.load(raw) as PavaneConfig;
  } catch {
    return null;
  }
}

function selectModels(
  policy: string,
  workerCount: number
): WorkerModel[] {
  const flash: WorkerModel = "deepseek/deepseek-chat";
  const pro: WorkerModel = "deepseek/deepseek-reasoner";

  switch (policy) {
    case "flash_only":
      return Array(workerCount).fill(flash);
    case "pro_only":
      return Array(workerCount).fill(pro);
    case "2_flash_2_pro":
      return [flash, flash, pro, pro].slice(0, workerCount);
    case "auto":
    default:
      if (workerCount === 1) return [flash];
      return [flash, pro, ...Array(workerCount - 2).fill(flash)].slice(0, workerCount);
  }
}

export async function executeRun(runId: string) {
  const run = await db.query.runs.findFirst({ where: eq(runs.id, runId) });
  if (!run) throw new Error(`Run ${runId} not found`);

  const card = await db.query.cards.findFirst({ where: eq(cards.id, run.cardId) });
  if (!card) throw new Error(`Card ${run.cardId} not found`);

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, run.projectId),
  });
  if (!project) throw new Error(`Project ${run.projectId} not found`);

  const logsDir = path.join(DATA_DIR, "logs");
  const orchestrator = ORCHESTRATORS[run.orchestratorProvider] ?? ORCHESTRATORS["mock"];

  try {
    // 1. Preparar workspace
    await updateRunStatus(runId, "preparing_workspace");
    log(runId, `Preparando workspace para run ${runId}`);

    const wsm = new WorkspaceManager(project.repoPath);
    if (!wsm.isGitRepo()) {
      throw new Error(`${project.repoPath} não é um repositório git válido`);
    }

    const config = loadPavaneConfig(project.repoPath, project.pavaneConfigPath);
    const recentFiles = wsm.getRecentFiles();

    log(runId, `Config PAVANE.md: ${config ? "encontrado" : "não encontrado"}`);
    log(runId, `Arquivos recentes: ${recentFiles.slice(0, 5).join(", ")}`);

    // 2. Orquestrar
    await updateRunStatus(runId, "orchestrating");
    log(runId, `Orquestrador ${orchestrator.name} criando plano...`);

    const plan = await orchestrator.createPlan({
      cardId: card.id,
      runId,
      objective: card.objective,
      projectPath: project.repoPath,
      config,
      recentFiles,
    });

    await db.update(runs).set({ plan: JSON.stringify(plan), updatedAt: now() }).where(eq(runs.id, runId));

    await saveEvidence({
      runId,
      kind: "plan",
      title: "Plano do Orquestrador",
      content: formatPlan(plan),
    });

    log(runId, `Plano criado: ${plan.strategy}, ${plan.maxWorkers} worker(s), política: ${plan.modelPolicy}`);

    // 3. Criar workers
    await updateRunStatus(runId, "spawning_workers");

    const maxWorkers = Math.min(
      plan.maxWorkers,
      config?.workers?.max_parallel ?? 4
    );
    const labels = (["a", "b", "c", "d"] as const).slice(0, maxWorkers);
    const models = selectModels(plan.modelPolicy, maxWorkers);

    const workerIds: string[] = [];

    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      const model = models[i];
      const { worktreePath } = wsm.createWorktree(runId, label, config?.git?.branch_prefix ?? "pavane/");

      log(runId, `Worker ${label} criado em ${worktreePath} usando ${model}`);

      const workerId = nanoid();
      await db.insert(workerRuns).values({
        id: workerId,
        runId,
        label,
        provider: "opencode",
        model,
        worktreePath,
        status: "queued",
        logsPath: path.join(logsDir, `${runId}-${label}.log`),
        createdAt: now(),
        updatedAt: now(),
      });
      workerIds.push(workerId);
    }

    // 4. Executar workers
    await updateRunStatus(runId, "executing");

    const workerPromises = workerIds.map(async (workerId, i) => {
      const label = labels[i];
      const model = models[i];

      const wRun = await db.query.workerRuns.findFirst({
        where: eq(workerRuns.id, workerId),
      });
      if (!wRun) return null;

      await updateWorkerStatus(workerId, "running");
      log(runId, `Worker ${label} iniciando OpenCode com ${model}`, "info", label);

      const result = await runOpenCode({
        worktreePath: wRun.worktreePath,
        model,
        prompt: plan.workerPrompt,
        runId,
        label,
        logsDir,
        onLog: (line, stream) => {
          log(runId, line, stream === "stderr" ? "stderr" : "stdout", label);
        },
        timeoutMs: 15 * 60 * 1000,
      });

      log(runId, `Worker ${label} finalizou com exit code ${result.exitCode}`, "info", label);

      wsm.stageAll(wRun.worktreePath);
      const diff = wsm.getDiff(wRun.worktreePath);
      const gitStatus = wsm.getGitStatus(wRun.worktreePath);

      await updateWorkerStatus(workerId, result.exitCode === 0 ? "completed" : "failed", {
        exitCode: result.exitCode,
        diff,
      });

      return { workerId, label, model, diff, gitStatus, exitCode: result.exitCode, result };
    });

    const workerResults = (await Promise.all(workerPromises)).filter(Boolean);

    // 5. Coletar evidências
    await updateRunStatus(runId, "collecting_evidence");
    log(runId, "Coletando evidências...");

    const commands = config?.commands ?? {};
    const candidates: CandidateResult[] = [];

    for (const wr of workerResults) {
      if (!wr) continue;
      const wRun = await db.query.workerRuns.findFirst({
        where: eq(workerRuns.id, wr.workerId),
      });
      if (!wRun) continue;

      const wsm2 = new WorkspaceManager(project.repoPath);

      // Diff
      if (wr.diff) {
        await saveEvidence({
          runId,
          workerRunId: wr.workerId,
          kind: "diff",
          title: `Diff — Worker ${wr.label}`,
          content: wr.diff,
        });
      }

      // Git status
      if (wr.gitStatus) {
        await saveEvidence({
          runId,
          workerRunId: wr.workerId,
          kind: "git_status",
          title: `Git Status — Worker ${wr.label}`,
          content: wr.gitStatus,
        });
      }

      // Typecheck
      let typecheckResult: string | undefined;
      if (commands.typecheck) {
        log(runId, `Rodando typecheck no worker ${wr.label}`, "info", wr.label);
        const tc = wsm2.runCommand(wRun.worktreePath, commands.typecheck);
        typecheckResult = tc.output;
        await saveEvidence({
          runId,
          workerRunId: wr.workerId,
          kind: "typecheck_result",
          title: `Typecheck — Worker ${wr.label}`,
          content: `Exit: ${tc.exitCode}\n${tc.output}`,
        });
      }

      // Build
      let buildResult: string | undefined;
      if (commands.build) {
        log(runId, `Rodando build no worker ${wr.label}`, "info", wr.label);
        const build = wsm2.runCommand(wRun.worktreePath, commands.build, 300_000);
        buildResult = build.output;
        await saveEvidence({
          runId,
          workerRunId: wr.workerId,
          kind: "build_result",
          title: `Build — Worker ${wr.label}`,
          content: `Exit: ${build.exitCode}\n${build.output}`,
        });
      }

      // Tests
      let testResult: string | undefined;
      if (commands.test) {
        log(runId, `Rodando testes no worker ${wr.label}`, "info", wr.label);
        const test = wsm2.runCommand(wRun.worktreePath, commands.test, 300_000);
        testResult = test.output;
        await saveEvidence({
          runId,
          workerRunId: wr.workerId,
          kind: "test_result",
          title: `Testes — Worker ${wr.label}`,
          content: `Exit: ${test.exitCode}\n${test.output}`,
        });
      }

      candidates.push({
        workerRunId: wr.workerId,
        label: wr.label,
        model: String(wr.model),
        diff: wr.diff,
        gitStatus: wr.gitStatus,
        typecheckResult,
        buildResult,
        testResult,
        exitCode: wr.exitCode,
      });
    }

    // 6. Revisão do orquestrador
    await updateRunStatus(runId, "reviewing");
    log(runId, "Orquestrador revisando candidatos...");

    const review = await orchestrator.reviewCandidates(
      { cardId: card.id, runId, objective: card.objective, projectPath: project.repoPath, config },
      plan,
      candidates
    );

    await saveEvidence({
      runId,
      kind: "review",
      title: "Revisão do Orquestrador",
      content: formatReview(review),
    });

    if (review.approved) {
      await updateRunStatus(runId, "ready", {
        review: review.summary,
        summary: review.recommendation,
        selectedCandidateId: review.selectedCandidateId ?? null,
      });

      // Atualizar card para Ready for Human Review
      await db
        .update(cards)
        .set({ status: "ready_for_human_review", updatedAt: now() })
        .where(eq(cards.id, card.id));

      log(runId, `Run aprovada. Card movido para Ready for Human Review.`);
    } else {
      await updateRunStatus(runId, "needs_fix", {
        review: review.summary,
        summary: review.recommendation,
      });

      await db
        .update(cards)
        .set({ status: "needs_fix", updatedAt: now() })
        .where(eq(cards.id, card.id));

      log(runId, `Run precisa de correções: ${review.issues.join("; ")}`, "warn");
    }

    emit(runId, { type: "run_complete", data: { runId, status: review.approved ? "ready" : "needs_fix" } });
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    log(runId, `Erro na execução: ${msg}`, "error");
    await updateRunStatus(runId, "failed", { summary: msg });
    await db
      .update(cards)
      .set({ status: "failed", updatedAt: now() })
      .where(eq(cards.id, card.id));
    emit(runId, { type: "run_complete", data: { runId, status: "failed" } });
  }
}

function formatPlan(plan: any): string {
  return `# Plano de Execução

## Resumo
${plan.summary}

## Abordagem Técnica
${plan.technicalApproach}

## Arquivos Prováveis
${plan.likelyFiles.map((f: string) => `- ${f}`).join("\n")}

## Riscos
${plan.risks.map((r: string) => `- ${r}`).join("\n")}

## Critérios de Sucesso
${plan.successCriteria.map((c: string) => `- ${c}`).join("\n")}

## Estratégia
- Strategy: ${plan.strategy}
- Workers: ${plan.maxWorkers}
- Model Policy: ${plan.modelPolicy}

## Constraints
${plan.constraints.map((c: string) => `- ${c}`).join("\n")}`;
}

function formatReview(review: any): string {
  return `# Revisão do Orquestrador

## Status
${review.approved ? "✅ APROVADO" : "❌ PRECISA DE CORREÇÕES"}

## Resumo
${review.summary}

## Issues Encontrados
${review.issues.length === 0 ? "Nenhum." : review.issues.map((i: string) => `- ${i}`).join("\n")}

## Recomendação
${review.recommendation}

## Candidato Selecionado
${review.selectedCandidateId ?? "Nenhum"}`;
}
