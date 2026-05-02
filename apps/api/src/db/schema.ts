import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  repoPath: text("repo_path").notNull(),
  pavaneConfigPath: text("pavane_config_path").notNull().default("PAVANE.md"),
  defaultBranch: text("default_branch").notNull().default("main"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  objective: text("objective").notNull(),
  status: text("status").notNull().default("backlog"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  cardId: text("card_id").notNull().references(() => cards.id),
  projectId: text("project_id").notNull().references(() => projects.id),
  status: text("status").notNull().default("queued"),
  orchestratorProvider: text("orchestrator_provider").notNull().default("mock"),
  orchestratorModel: text("orchestrator_model").notNull().default("mock-v1"),
  strategy: text("strategy").notNull().default("single_worker"),
  maxWorkers: integer("max_workers").notNull().default(1),
  plan: text("plan"),
  selectedCandidateId: text("selected_candidate_id"),
  summary: text("summary"),
  review: text("review"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workerRuns = sqliteTable("worker_runs", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => runs.id),
  label: text("label").notNull(),
  provider: text("provider").notNull().default("opencode"),
  model: text("model").notNull(),
  worktreePath: text("worktree_path").notNull(),
  status: text("status").notNull().default("queued"),
  exitCode: integer("exit_code"),
  summary: text("summary"),
  diff: text("diff"),
  logsPath: text("logs_path"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => runs.id),
  workerRunId: text("worker_run_id"),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});
