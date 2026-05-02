import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CardStatus, RunStatus, WorkerStatus } from "@pavane/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  backlog: "Backlog",
  ready: "Ready",
  planning: "Planning",
  delegated: "Delegated",
  implementing: "Implementing",
  verifying: "Verifying",
  reviewing: "Reviewing",
  needs_fix: "Needs Fix",
  ready_for_human_review: "Ready for Review",
  failed: "Failed",
  done: "Done",
};

export const CARD_STATUS_COLORS: Record<CardStatus, string> = {
  backlog: "text-pavane-text-muted border-pavane-border",
  ready: "text-blue-400 border-blue-900",
  planning: "text-indigo-400 border-indigo-900",
  delegated: "text-violet-400 border-violet-900",
  implementing: "text-yellow-400 border-yellow-900",
  verifying: "text-orange-400 border-orange-900",
  reviewing: "text-cyan-400 border-cyan-900",
  needs_fix: "text-red-400 border-red-900",
  ready_for_human_review: "text-green-400 border-green-900",
  failed: "text-red-600 border-red-950",
  done: "text-pavane-text-muted border-pavane-border",
};

export const WORKER_STATUS_COLORS: Record<WorkerStatus, string> = {
  queued: "bg-pavane-muted text-pavane-text-muted",
  running: "bg-yellow-900/50 text-yellow-400",
  completed: "bg-green-900/50 text-green-400",
  failed: "bg-red-900/50 text-red-400",
  cancelled: "bg-pavane-muted text-pavane-text-muted",
};

export const KANBAN_COLUMNS: CardStatus[] = [
  "backlog",
  "ready",
  "planning",
  "implementing",
  "reviewing",
  "needs_fix",
  "ready_for_human_review",
  "done",
  "failed",
];

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
