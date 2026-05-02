"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Run, WorkerRun, Evidence, SSEEvent, LogEntry, RunStatus } from "@pavane/shared";
import { WORKER_STATUS_COLORS, CARD_STATUS_LABELS, cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useStore } from "@/store";

type Props = { runId: string; onClose: () => void; onStatusChange?: (status: RunStatus) => void };

type RunDetail = Run & { workers: WorkerRun[]; evidence: Evidence[] };

export function RunPanel({ runId, onClose, onStatusChange }: Props) {
  const { updateCardStatus } = useStore();
  const [run, setRun] = useState<RunDetail | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"logs" | "evidence" | "workers">("logs");
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.runs.get(runId).then(setRun);
  }, [runId]);

  useEffect(() => {
    const es = api.runs.events(runId);

    es.onmessage = (e) => {
      const event: SSEEvent = JSON.parse(e.data);

      if (event.type === "log") {
        setLogs((prev) => [...prev, event.data]);
      } else if (event.type === "run_status") {
        setRun((prev) => prev ? { ...prev, status: event.data.status } : prev);
        onStatusChange?.(event.data.status);
      } else if (event.type === "worker_status") {
        setRun((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            workers: prev.workers.map((w) =>
              w.id === event.data.workerId ? { ...w, status: event.data.status } : w
            ),
          };
        });
      } else if (event.type === "evidence") {
        setRun((prev) => {
          if (!prev) return prev;
          const exists = prev.evidence.some((e) => e.id === event.data.id);
          return exists
            ? prev
            : { ...prev, evidence: [...prev.evidence, event.data] };
        });
      } else if (event.type === "run_complete") {
        api.runs.get(runId).then(setRun);
      }
    };

    return () => es.close();
  }, [runId]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  async function handleAbort() {
    await api.runs.abort(runId);
    const updated = await api.runs.get(runId);
    setRun(updated);
    updateCardStatus(updated.cardId, "failed");
  }

  if (!run) {
    return (
      <div className="flex items-center justify-center h-64 text-pavane-text-muted text-sm">
        Carregando execução...
      </div>
    );
  }

  const isDone = run.status === "ready" || run.status === "failed" || run.status === "needs_fix";
  const isRunning = !isDone && run.status !== "queued";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-pavane-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-pavane-text-muted">{run.id.slice(0, 8)}</span>
            <RunStatusBadge status={run.status} />
          </div>
          <p className="text-[11px] text-pavane-text-muted">
            Estratégia: {run.strategy} · Workers: {run.maxWorkers} · Provedor: {run.orchestratorProvider}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <Button variant="danger" size="sm" onClick={handleAbort}>
              Cancelar
            </Button>
          )}
          <button
            onClick={onClose}
            className="text-pavane-text-muted hover:text-pavane-text text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      {/* Summary */}
      {(run.summary || run.review) && (
        <div className="px-4 py-3 bg-pavane-muted/30 border-b border-pavane-border text-xs text-pavane-text">
          {run.review && <p className="mb-1 text-pavane-text">{run.review}</p>}
          {run.summary && <p className="text-pavane-text-muted">{run.summary}</p>}
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-0 border-b border-pavane-border">
        {(["logs", "workers", "evidence"] as const).map((tab) => {
          const tabLabels = { logs: "Logs", workers: "Workers", evidence: "Evidências" };
          return (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors border-b-2",
              activeTab === tab
                ? "text-pavane-accent border-pavane-accent"
                : "text-pavane-text-muted border-transparent hover:text-pavane-text"
            )}
          >
            {tabLabels[tab]}
            {tab === "logs" && logs.length > 0 && (
              <span className="ml-1 text-[9px] text-pavane-text-muted">({logs.length})</span>
            )}
            {tab === "evidence" && run.evidence.length > 0 && (
              <span className="ml-1 text-[9px] text-pavane-text-muted">({run.evidence.length})</span>
            )}
          </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "logs" && (
          <div
            ref={logsRef}
            className="h-full overflow-y-auto p-3 font-mono text-[11px] space-y-0.5"
          >
            {logs.length === 0 && (
              <div className="text-pavane-text-muted text-center py-8">
                {isRunning ? "Aguardando logs..." : "Sem logs"}
              </div>
            )}
            {logs.map((entry, i) => (
              <LogLine key={i} entry={entry} />
            ))}
          </div>
        )}

        {activeTab === "workers" && (
          <div className="p-4 space-y-3">
            {run.workers.length === 0 && (
              <div className="text-pavane-text-muted text-sm text-center py-8">
                Nenhum worker ainda
              </div>
            )}
            {run.workers.map((w) => (
              <WorkerCard key={w.id} worker={w} evidence={run.evidence.filter((e) => e.workerRunId === w.id)} />
            ))}
          </div>
        )}

        {activeTab === "evidence" && (
          <div className="p-4 space-y-3 h-full overflow-y-auto">
            {run.evidence.length === 0 && (
              <div className="text-pavane-text-muted text-sm text-center py-8">
                Nenhuma evidência coletada ainda
              </div>
            )}
            {run.evidence.map((ev) => (
              <EvidenceCard key={ev.id} evidence={ev} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const RUN_STATUS_LABELS: Record<string, string> = {
  queued: "na fila",
  preparing_workspace: "preparando workspace",
  orchestrating: "orquestrando",
  spawning_workers: "iniciando workers",
  executing: "executando",
  collecting_evidence: "coletando evidências",
  reviewing: "revisando",
  needs_fix: "precisa corrigir",
  ready: "pronto",
  failed: "falhou",
};

function RunStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "bg-pavane-muted text-pavane-text-muted",
    preparing_workspace: "bg-blue-900/40 text-blue-400",
    orchestrating: "bg-indigo-900/40 text-indigo-400",
    spawning_workers: "bg-violet-900/40 text-violet-400",
    executing: "bg-yellow-900/40 text-yellow-400",
    collecting_evidence: "bg-orange-900/40 text-orange-400",
    reviewing: "bg-cyan-900/40 text-cyan-400",
    needs_fix: "bg-red-900/40 text-red-400",
    ready: "bg-green-900/40 text-green-400",
    failed: "bg-red-950 text-red-600",
  };

  return (
    <span className={cn("text-[10px] font-medium uppercase px-2 py-0.5 rounded", colors[status] ?? "bg-pavane-muted text-pavane-text-muted")}>
      {RUN_STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const colors: Record<string, string> = {
    info: "text-pavane-text",
    warn: "text-yellow-400",
    error: "text-red-400",
    stdout: "text-green-300",
    stderr: "text-orange-400",
  };

  return (
    <div className={cn("flex gap-2", colors[entry.level])}>
      <span className="text-pavane-text-muted shrink-0 text-[10px]">
        {new Date(entry.ts).toISOString().slice(11, 19)}
      </span>
      {entry.workerLabel && (
        <span className="text-pavane-accent shrink-0">[{entry.workerLabel}]</span>
      )}
      <span className="break-all whitespace-pre-wrap">{entry.msg}</span>
    </div>
  );
}

function WorkerCard({ worker, evidence }: { worker: WorkerRun; evidence: Evidence[] }) {
  const [showDiff, setShowDiff] = useState(false);
  const diff = evidence.find((e) => e.kind === "diff");

  return (
    <div className="border border-pavane-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-pavane-accent">Worker {worker.label.toUpperCase()}</span>

          <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium", WORKER_STATUS_COLORS[worker.status])}>
            {{ queued: "na fila", running: "executando", completed: "concluído", failed: "falhou", cancelled: "cancelado" }[worker.status] ?? worker.status}
          </span>
        </div>
        <span className="text-[10px] text-pavane-text-muted font-mono">{worker.model}</span>
      </div>
      <p className="text-[10px] text-pavane-text-muted font-mono truncate mb-2">{worker.worktreePath}</p>
      {worker.exitCode !== undefined && (
        <span className={cn("text-[10px]", worker.exitCode === 0 ? "text-green-400" : "text-red-400")}>
          exit {worker.exitCode}
        </span>
      )}
      {diff && (
        <div className="mt-2">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="text-[10px] text-pavane-accent hover:underline"
          >
            {showDiff ? "Esconder diff" : "Ver diff"}
          </button>
          {showDiff && (
            <pre className="mt-2 text-[10px] font-mono text-pavane-text bg-pavane-bg border border-pavane-border rounded p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre">
              {diff.content}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function EvidenceCard({ evidence }: { evidence: Evidence }) {
  const [open, setOpen] = useState(evidence.kind === "review" || evidence.kind === "plan");

  const kindColors: Record<string, string> = {
    diff: "text-cyan-400",
    git_status: "text-blue-400",
    typecheck_result: "text-yellow-400",
    build_result: "text-orange-400",
    test_result: "text-green-400",
    review: "text-indigo-400",
    plan: "text-violet-400",
    summary: "text-pavane-text",
    command_output: "text-pavane-text-muted",
  };

  const kindLabels: Record<string, string> = {
    diff: "diff",
    git_status: "git status",
    typecheck_result: "typecheck",
    build_result: "build",
    test_result: "testes",
    review: "revisão",
    plan: "plano",
    summary: "resumo",
    command_output: "saída de comando",
  };

  return (
    <div className="border border-pavane-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-pavane-surface/50 hover:bg-pavane-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] font-medium uppercase", kindColors[evidence.kind] ?? "text-pavane-text-muted")}>
            {kindLabels[evidence.kind] ?? evidence.kind.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-pavane-text">{evidence.title}</span>
        </div>
        <span className="text-pavane-text-muted text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <pre className="text-[11px] font-mono text-pavane-text p-3 overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap bg-pavane-bg">
          {evidence.content}
        </pre>
      )}
    </div>
  );
}
