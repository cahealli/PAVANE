import type { PavaneConfig, WorkerStrategy, ModelPolicy } from "@pavane/shared";

export type OrchestratorContext = {
  cardId: string;
  runId: string;
  objective: string;
  projectPath: string;
  config: PavaneConfig | null;
  recentFiles?: string[];
};

export type ExecutionPlan = {
  summary: string;
  technicalApproach: string;
  likelyFiles: string[];
  risks: string[];
  successCriteria: string[];
  strategy: WorkerStrategy;
  modelPolicy: ModelPolicy;
  maxWorkers: number;
  workerPrompt: string;
  constraints: string[];
};

export type ReviewResult = {
  approved: boolean;
  summary: string;
  issues: string[];
  recommendation: string;
  selectedCandidateId?: string;
};

export type OrchestratorAdapter = {
  readonly name: string;
  createPlan(ctx: OrchestratorContext): Promise<ExecutionPlan>;
  reviewCandidates(
    ctx: OrchestratorContext,
    plan: ExecutionPlan,
    candidates: CandidateResult[]
  ): Promise<ReviewResult>;
};

export type CandidateResult = {
  workerRunId: string;
  label: string;
  model: string;
  diff: string;
  gitStatus: string;
  typecheckResult?: string;
  buildResult?: string;
  testResult?: string;
  exitCode: number;
  summary?: string;
};
