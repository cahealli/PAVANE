import type { Project, Card, Run, WorkerRun, Evidence } from "@pavane/shared";

const BASE = "/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export const api = {
  projects: {
    list: () => req<(Project & { isGitRepo: boolean; hasPavaneConfig: boolean })[]>("GET", "/projects"),
    get: (id: string) => req<Project & { isGitRepo: boolean; hasPavaneConfig: boolean; config: any; recentFiles: string[] }>("GET", `/projects/${id}`),
    create: (data: { name: string; repoPath: string; defaultBranch?: string }) =>
      req<Project>("POST", "/projects", data),
    delete: (id: string) => req<{ ok: boolean }>("DELETE", `/projects/${id}`),
  },
  cards: {
    list: (projectId?: string) =>
      req<Card[]>("GET", `/cards${projectId ? `?projectId=${projectId}` : ""}`),
    get: (id: string) => req<Card>("GET", `/cards/${id}`),
    create: (data: { projectId: string; title: string; objective: string }) =>
      req<Card>("POST", "/cards", data),
    update: (id: string, data: Partial<Card>) => req<Card>("PATCH", `/cards/${id}`, data),
    delete: (id: string) => req<{ ok: boolean }>("DELETE", `/cards/${id}`),
  },
  runs: {
    create: (cardId: string) => req<Run>("POST", "/runs", { cardId }),
    get: (id: string) =>
      req<Run & { workers: WorkerRun[]; evidence: Evidence[] }>("GET", `/runs/${id}`),
    abort: (id: string) => req<{ ok: boolean }>("DELETE", `/runs/${id}`),
    events: (id: string) => new EventSource(`/api/runs/${id}/events`),
  },
};
