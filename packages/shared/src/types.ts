export type Project = {
  id: string;
  name: string;
  repoPath: string;
  pavaneConfigPath: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
};

export type CardStatus =
  | "backlog"
  | "ready"
  | "planning"
  | "delegated"
  | "implementing"
  | "verifying"
  | "reviewing"
  | "needs_fix"
  | "ready_for_human_review"
  | "failed"
  | "done";

export type Card = {
  id: string;
  projectId: string;
  title: string;
  objective: string;
  status: CardStatus;
  createdAt: string;
  updatedAt: string;
};

export type RunStatus =
  | "queued"
  | "preparing_workspace"
  | "orchestrating"
  | "spawning_workers"
  | "executing"
  | "collecting_evidence"
  | "reviewing"
  | "needs_fix"
  | "ready"
  | "failed";

export type WorkerStrategy = "single_worker" | "parallel_attempts";
export type ModelPolicy = "flash_only" | "pro_only" | "auto" | "2_flash_2_pro";
export type WorkerModel = "deepseek/deepseek-chat" | "deepseek/deepseek-reasoner";

export type Run = {
  id: string;
  cardId: string;
  projectId: string;
  status: RunStatus;
  orchestratorProvider: "codex" | "mock";
  orchestratorModel: string;
  strategy: WorkerStrategy;
  maxWorkers: number;
  plan?: string;
  selectedCandidateId?: string;
  summary?: string;
  review?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkerLabel = "a" | "b" | "c" | "d";
export type WorkerStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type WorkerRun = {
  id: string;
  runId: string;
  label: WorkerLabel;
  provider: "opencode";
  model: WorkerModel;
  worktreePath: string;
  status: WorkerStatus;
  exitCode?: number;
  summary?: string;
  diff?: string;
  logsPath?: string;
  logs?: string;
  createdAt: string;
  updatedAt: string;
};

export type EvidenceKind =
  | "diff"
  | "git_status"
  | "command_output"
  | "test_result"
  | "build_result"
  | "typecheck_result"
  | "review"
  | "summary"
  | "plan";

export type Evidence = {
  id: string;
  runId: string;
  workerRunId?: string;
  kind: EvidenceKind;
  title: string;
  content: string;
  createdAt: string;
};

export type PavaneConfig = {
  project: string;
  default_branch: string;
  workspace_root: string;
  orchestrator: {
    provider: string;
    model: string;
  };
  executors: {
    flash?: { provider: string; model: string };
    pro?: { provider: string; model: string };
  };
  routing: {
    default_model: string;
    use_pro_when: string[];
  };
  commands: {
    install?: string;
    lint?: string;
    typecheck?: string;
    test?: string;
    build?: string;
  };
  completion: {
    require_diff: boolean;
    require_typecheck: boolean;
    require_build: boolean;
    require_codex_review: boolean;
    require_human_approval: boolean;
  };
  workers: {
    max_parallel: number;
    default_strategy: WorkerStrategy;
  };
  git: {
    branch_prefix: string;
    allow_push: boolean;
    allow_merge: boolean;
    allow_pr_create: boolean;
  };
};

export type LogEntry = {
  ts: number;
  level: "info" | "warn" | "error" | "stdout" | "stderr";
  msg: string;
  workerLabel?: WorkerLabel;
};

export type SSEEvent =
  | { type: "log"; data: LogEntry }
  | { type: "run_status"; data: { runId: string; status: RunStatus } }
  | { type: "worker_status"; data: { workerId: string; status: WorkerStatus; label: WorkerLabel } }
  | { type: "evidence"; data: Evidence }
  | { type: "run_complete"; data: { runId: string; status: RunStatus } };
